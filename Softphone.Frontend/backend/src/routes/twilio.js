const express = require('express');
const { getIO } = require('../io');
const supabase = require('../supabase'); 
const twilio = require('twilio');

const router = express.Router();

// Helper function to get Twilio client for a workspace
async function getTwilioClientForWorkspace(workspaceId) {
  const { data, error } = await supabase
    .from('workspace_twilio_config')
    .select('account_sid, auth_token')
    .eq('workspace_id', workspaceId)
    .single();
    
  if (error) throw error;
  if (!data) throw new Error('No Twilio configuration found for workspace');
  
  return twilio(data.account_sid, data.auth_token);
}

// Helper function to sync phone numbers
async function syncPhoneNumbers(workspaceId, client) {
  try {
    // Get all phone numbers from Twilio
    const numbers = await client.incomingPhoneNumbers.list();
    
    // Format numbers for database
    const formattedNumbers = numbers.map(number => ({
      workspace_id: workspaceId,
      phone_number: number.phoneNumber,
      friendly_name: number.friendlyName,
      is_active: true
    }));

    // Delete existing numbers for this workspace
    await supabase
      .from('twilio_numbers')
      .delete()
      .eq('workspace_id', workspaceId);

    // Insert new numbers
    if (formattedNumbers.length > 0) {
      const { error } = await supabase
        .from('twilio_numbers')
        .insert(formattedNumbers);
      
      if (error) throw error;
    }

    // Notify clients about the update
    const io = getIO();
    io.to(workspaceId).emit('phone_numbers_updated', formattedNumbers);

    return formattedNumbers;
  } catch (error) {
    console.error('Error syncing phone numbers:', error);
    throw error;
  }
}

// Helper function to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // For US/Canada numbers, ensure they start with 1
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // For international numbers, ensure they start with +
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// Helper function to format phone numbers for Twilio
function formatPhoneForTwilio(phone) {
  return normalizePhone(phone);
}

// Test Twilio connection and sync phone numbers
router.post('/test-connection', async (req, res) => {
  try {
    const { workspaceId, accountSid, authToken } = req.body;
    
    if (!workspaceId) {
      throw new Error('Workspace ID is required');
    }

    const client = twilio(accountSid, authToken);
    
    // Test by listing phone numbers
    const phoneNumbers = await syncPhoneNumbers(workspaceId, client);
    
    // Save the Twilio config first
    const { error: configError } = await supabase
      .from('workspace_twilio_config')
      .upsert({
        workspace_id: workspaceId,
        account_sid: accountSid,
        auth_token: authToken
      }, {
        onConflict: 'workspace_id'
      });

    if (configError) {
      throw configError;
    }
    
    // Check if webhook is already configured for the first phone number
    if (phoneNumbers && phoneNumbers.length > 0) {
      const twilioPhoneNumbers = await client.incomingPhoneNumbers.list({ 
        phoneNumber: phoneNumbers[0].phone_number 
      });
      
      if (twilioPhoneNumbers.length > 0) {
        const configuredWebhookUrl = twilioPhoneNumbers[0].smsUrl;
        
        // Update database if webhook is configured
        if (configuredWebhookUrl) {
          await supabase
            .from('workspace_twilio_config')
            .update({ 
              webhook_url: configuredWebhookUrl,
              is_configured: true,
              webhook_type: configuredWebhookUrl.includes(workspaceId) ? 'workspace' : 'global'
            })
            .eq('workspace_id', workspaceId);
        }
      }
    }
    
    res.json({ success: true, phoneNumbers });
  } catch (error) {
    console.error('Error testing Twilio connection:', error);
    res.status(400).json({ error: error.message || 'Failed to test connection' });
  }
});

// Configure webhook
router.post('/configure-webhook', async (req, res) => {
  try {
    const { workspaceId, webhookType, webhookUrl } = req.body;

    // Get workspace Twilio config
    const { data: config } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    const client = twilio(config.account_sid, config.auth_token);
    
    // Get all phone numbers for this workspace
    const { data: phoneNumbers } = await supabase
      .from('twilio_numbers')
      .select('phone_number')
      .eq('workspace_id', workspaceId);

    // Update webhook URL for each phone number
    for (const { phone_number } of phoneNumbers) {
      const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: phone_number });
      if (numbers.length > 0) {
        await client.incomingPhoneNumbers(numbers[0].sid).update({
          smsUrl: webhookUrl
        });
      }
    }

    // Update webhook type, url, and is_configured in database
    await supabase
      .from('workspace_twilio_config')
      .update({ 
        webhook_type: webhookType,
        webhook_url: webhookUrl,
        is_configured: true
      })
      .eq('workspace_id', workspaceId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error configuring webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle workspace-specific webhook
router.post('/:workspaceId/webhook/message', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { MessageSid, From, To, Body } = req.body;

    // Validate required fields
    if (!MessageSid || !From || !To || !Body) {
      throw new Error('Missing required Twilio webhook fields');
    }

    // Get workspace's Twilio credentials
    const { data: twilioConfig, error: configError } = await supabase
      .from('workspace_twilio_config')
      .select('account_sid, auth_token')
      .eq('workspace_id', workspaceId)
      .single();

    if (configError) throw configError;
    if (!twilioConfig) throw new Error('Twilio configuration not found for workspace');

    // Verify the webhook is from Twilio using workspace's credentials
    const twilioSignature = req.headers['x-twilio-signature'];
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    const isValid = twilio.validateRequest(
      twilioConfig.auth_token,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      throw new Error('Invalid Twilio signature');
    }

    // Save message to database
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        twilio_sid: MessageSid,
        body: Body,
        direction: 'inbound',
        message_type: 'text',
        status: 'received',
        metadata: {
          twilio_from: From,
          twilio_to: To
        }
      });

    if (messageError) throw messageError;

    // Notify connected clients
    const io = getIO();
    io.to(workspaceId).emit('new_message', {
      workspaceId,
      messageSid: MessageSid,
      body: Body,
      direction: 'inbound'
    });

    res.status(200).send();
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

// Handle global webhook
router.post('/', async (req, res) => {
  try {
    const { MessageSid, From, To, Body } = req.body;
    console.log('Received webhook:', { MessageSid, From, To, Body });

    // Validate required fields
    if (!MessageSid || !From || !To || !Body) {
      throw new Error('Missing required Twilio webhook fields');
    }

    // Find the workspace by the To (destination) number
    console.log('Looking up phone number:', To);
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('phone_number', To)
      .single();

    if (phoneError) {
      console.error('Phone lookup error:', phoneError);
      throw phoneError;
    }
    if (!phoneNumber) {
      console.error('Phone number not found:', To);
      // List all numbers in database for debugging
      const { data: allNumbers } = await supabase
        .from('twilio_numbers')
        .select('phone_number, workspace_id');
      console.log('Available numbers:', allNumbers);
      throw new Error('Phone number not found in any workspace');
    }

    const workspaceId = phoneNumber.workspace_id;
    console.log('Found workspace:', workspaceId, 'for number:', phoneNumber);

    // Find or create contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', From)
      .eq('workspace_id', workspaceId)
      .single();

    if (contactError && contactError.code !== 'PGRST116') {
      console.error('Contact lookup error:', contactError);
      throw contactError;
    }

    let contactId;
    if (!contact) {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          phone_number: From,
          workspace_id: workspaceId,
          name: From // Use phone number as initial name
        })
        .select()
        .single();

      if (createError) {
        console.error('Contact creation error:', createError);
        throw createError;
      }
      contactId = newContact.id;
    } else {
      contactId = contact.id;
    }

    console.log('Using contact:', contactId);

    // Save message to database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        twilio_sid: MessageSid,
        body: Body,
        direction: 'inbound',
        message_type: 'sms',
        status: 'delivered',
        metadata: {
          twilio_from: From,
          twilio_to: To,
          twilio_phone_numbers: {
            from: From,
            to: To
          },
          extension: 'txt'
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Message save error:', messageError);
      throw messageError;
    }

    console.log('Message saved:', message);

    // Notify connected clients
    const io = getIO();
    io.to(`contact:${contactId}`).emit('new_message', message);

    res.status(200).send();
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get workspace phone numbers
router.get('/phone-numbers/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const { data, error } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('workspace_id', workspaceId);
      
    if (error) throw error;
    
    res.json({ phoneNumbers: data });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send SMS
router.post('/send/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { to, content, contactId } = req.body;

    if (!to || !content) {
      console.error('❌ Missing required fields for sending message');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    console.log(`📤 Sending message to ${to} from workspace ${workspaceId}`);

    // Get Twilio credentials for this workspace
    const { data: twilioConfig, error: configError } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (configError) {
      console.error('❌ Error fetching Twilio config:', configError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Twilio configuration' 
      });
    }

    if (!twilioConfig) {
      console.error('❌ Twilio configuration not found for workspace');
      return res.status(404).json({ 
        success: false, 
        error: 'Twilio configuration not found for workspace' 
      });
    }

    // Get workspace's phone number
    const { data: phoneNumber, error: phoneError } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .single();

    if (phoneError) {
      console.error('❌ Error fetching Twilio number:', phoneError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Twilio number' 
      });
    }

    if (!phoneNumber) {
      console.error('❌ No active phone number found for workspace');
      return res.status(404).json({ 
        success: false, 
        error: 'No active phone number found for workspace' 
      });
    }

    // Format phone numbers for Twilio
    const formattedTo = normalizePhone(to);
    const formattedFrom = normalizePhone(phoneNumber.phone_number);
    
    console.log(`📱 Sending from ${formattedFrom} to ${formattedTo}`);

    // Find or create contact
    let existingContactId = contactId;
    
    if (!existingContactId) {
      // Look up contact by phone number
      const { data: existingContact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone_number', formattedTo)
        .eq('workspace_id', workspaceId)
        .single();

      if (contactError && contactError.code !== 'PGRST116') {
        console.error('❌ Error fetching contact:', contactError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch contact' 
        });
      }

      if (existingContact) {
        existingContactId = existingContact.id;
        console.log(`✅ Found existing contact: ${existingContactId}`);
      } else {
        // Create a new contact
        console.log(`➕ Creating new contact for ${formattedTo}`);
        const { data: newContact, error: newContactError } = await supabase
          .from('contacts')
          .insert({
            phone_number: formattedTo,
            workspace_id: workspaceId,
            name: formattedTo, // Use phone number as initial name
            firstname: 'New',
            lastname: 'Contact',
            email: '',
            lead_source: 'SMS'
          })
          .select('id')
          .single();

        if (newContactError) {
          console.error('❌ Error creating contact:', newContactError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create contact' 
          });
        }
        
        existingContactId = newContact.id;
        console.log(`✅ Created new contact: ${existingContactId}`);
      }
    }

    // Initialize Twilio client with workspace credentials
    const accountSid = twilioConfig.account_sid;
    const authToken = twilioConfig.auth_token;
    const client = twilio(accountSid, authToken);
    
    console.log('🔑 Initialized Twilio client');

    // Send message via Twilio
    console.log('📤 Sending message via Twilio API');
    const twilioMessage = await client.messages.create({
      to: formattedTo,
      from: formattedFrom,
      body: content
    });
    
    console.log(`✅ Twilio message sent with SID: ${twilioMessage.sid}`);

    // Save message to database
    console.log('💾 Saving message to database');
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert({
        contact_id: existingContactId,
        workspace_id: workspaceId,
        direction: 'outbound',
        body: content,
        message_type: 'text',
        status: twilioMessage.status,
        twilio_sid: twilioMessage.sid,
        metadata: {
          twilio_from: formattedFrom,
          twilio_to: formattedTo,
          twilio_phone_numbers: {
            from: formattedFrom,
            to: formattedTo
          },
          extension: 'txt'
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Error saving message:', saveError);
      return res.status(500).json({ 
        success: false, 
        error: 'Message sent but failed to save to database',
        twilioSid: twilioMessage.sid
      });
    }

    console.log(`✅ Message saved with ID: ${savedMessage.id}`);

    // Emit message to socket
    const io = getIO();
    const room = `contact:${existingContactId}`;
    
    io.to(room).emit('new_message', savedMessage);
    io.to(workspaceId).emit('message_created', savedMessage);
    
    console.log(`📢 Notified rooms: ${room} and ${workspaceId}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: savedMessage,
      twilioSid: twilioMessage.sid
    });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available phone numbers
router.post('/available-numbers', async (req, res) => {
  try {
    const { workspaceId } = req.body;

    // Get workspace Twilio config
    const { data: config } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    const client = twilio(config.account_sid, config.auth_token);
    
    // Search for available local numbers
    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({ limit: 20 });

    res.json({
      numbers: numbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region
      }))
    });
  } catch (error) {
    console.error('Error fetching available numbers:', error);
    res.status(500).json({ error: 'Failed to fetch available numbers' });
  }
});

// Purchase and configure new number
router.post('/purchase-number', async (req, res) => {
  try {
    const { workspaceId, phoneNumber } = req.body;

    // Get workspace Twilio config
    const { data: config } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    const client = twilio(config.account_sid, config.auth_token);

    // Purchase the number
    const purchasedNumber = await client.incomingPhoneNumbers
      .create({
        phoneNumber,
        smsUrl: `${process.env.BACKEND_URL}/twilio/webhook/message`,
        smsMethod: 'POST'
      });

    // Save to database
    const { error: dbError } = await supabase
      .from('twilio_numbers')
      .insert({
        workspace_id: workspaceId,
        phone_number: purchasedNumber.phoneNumber,
        friendly_name: purchasedNumber.friendlyName,
        is_active: true
      });

    if (dbError) {
      throw dbError;
    }

    // Notify connected clients
    const io = getIO();
    io.to(workspaceId).emit('phone_number_added', {
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName
    });

    res.json({
      phoneNumber: purchasedNumber.phoneNumber,
      friendlyName: purchasedNumber.friendlyName
    });
  } catch (error) {
    console.error('Error purchasing number:', error);
    res.status(500).json({ error: 'Failed to purchase number' });
  }
});

// Verify webhook configuration
router.post('/verify-webhook', async (req, res) => {
  try {
    const { workspaceId } = req.body;

    // Get workspace Twilio config
    const { data: config } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    const client = twilio(config.account_sid, config.auth_token);
    
    // Get all phone numbers for this workspace
    const { data: phoneNumbers } = await supabase
      .from('twilio_numbers')
      .select('phone_number')
      .eq('workspace_id', workspaceId);

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return res.status(404).json({ error: 'No phone numbers found for workspace' });
    }

    // Verify webhook configuration for the first phone number
    const numbers = await client.incomingPhoneNumbers.list({ 
      phoneNumber: phoneNumbers[0].phone_number 
    });
    
    if (numbers.length === 0) {
      return res.status(404).json({ error: 'Phone number not found in Twilio account' });
    }

    const twilioNumber = numbers[0];
    const configuredWebhookUrl = twilioNumber.smsUrl;
    
    // Update database to match Twilio's actual configuration
    if (configuredWebhookUrl) {
      await supabase
        .from('workspace_twilio_config')
        .update({ 
          webhook_url: configuredWebhookUrl,
          is_configured: true,
          webhook_type: configuredWebhookUrl.includes(workspaceId) ? 'workspace' : 'global'
        })
        .eq('workspace_id', workspaceId);
      
      res.json({ 
        success: true, 
        webhookUrl: configuredWebhookUrl,
        isConfigured: true,
        phoneNumbers: phoneNumbers.map(p => p.phone_number)
      });
    } else {
      await supabase
        .from('workspace_twilio_config')
        .update({ 
          is_configured: false,
          webhook_url: null
        })
        .eq('workspace_id', workspaceId);
        
      res.json({ 
        success: false, 
        webhookUrl: null,
        isConfigured: false,
        phoneNumbers: phoneNumbers.map(p => p.phone_number)
      });
    }
  } catch (error) {
    console.error('Error verifying webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;