const express = require('express');
const { getIO } = require('../io');
const supabase = require('../supabase'); 
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const config = require('../config');
const router = express.Router();

// Handle CORS preflight requests for all routes
router.options('*', (req, res) => {
  console.log('🔍 Handling CORS preflight request for Twilio routes');
  // CORS headers are already set by the cors middleware
  res.status(204).end();
});

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
    console.log('📱 Starting phone number sync...');
    
    // Get all phone numbers from Twilio
    console.log('📞 Fetching phone numbers from Twilio...');
    const numbers = await client.incomingPhoneNumbers.list();
    console.log(`📋 Found ${numbers.length} phone numbers`);
    
    // Format numbers for database
    const formattedNumbers = numbers.map(number => ({
      workspace_id: workspaceId,
      twilio_number: number.phoneNumber
    }));

    console.log('🗑️ Deleting existing numbers for workspace...');
    // Delete existing numbers for this workspace
    const { error: deleteError } = await supabase
      .from('workspace_twilio_number')
      .delete()
      .eq('workspace_id', workspaceId);
      
    if (deleteError) {
      console.error('❌ Error deleting existing numbers:', deleteError);
      throw deleteError;
    }

    // Insert new numbers
    if (formattedNumbers.length > 0) {
      console.log('📥 Inserting new numbers into workspace_twilio_number...');
      const { error: insertError } = await supabase
        .from('workspace_twilio_number')
        .insert(formattedNumbers);
      
      if (insertError) {
        console.error('❌ Error inserting numbers:', insertError);
        throw insertError;
      }

      // Also update agent_phone table for UI
      console.log('📞 Updating agent_phone table...');
      const agentPhoneNumbers = numbers.map(number => ({
        workspace_id: workspaceId,
        phone_number: number.phoneNumber,
        friendly_name: number.friendlyName || number.phoneNumber
      }));

      const { error: agentPhoneError } = await supabase
        .from('agent_phone')
        .delete()
        .eq('workspace_id', workspaceId);

      if (!agentPhoneError) {
        const { error: insertAgentError } = await supabase
          .from('agent_phone')
          .insert(agentPhoneNumbers);

        if (insertAgentError) {
          console.error('⚠️ Warning: Failed to update agent_phone table:', insertAgentError);
          // Don't throw here as the main sync was successful
        }
      }
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
        phoneNumber: phoneNumbers[0].twilio_number 
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

    // Get workspace's Twilio credentials
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
      .from('workspace_twilio_number')
      .select('twilio_number')
      .eq('workspace_id', workspaceId);

    // Update webhook URL for each phone number
    for (const { twilio_number } of phoneNumbers) {
      const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: twilio_number });
      if (numbers.length > 0) {
        const updateParams = {};
        
        if (webhookType === 'voice') {
          updateParams.voiceUrl = webhookUrl;
          updateParams.voiceMethod = 'POST';
        } else if (webhookType === 'status') {
          updateParams.statusCallback = webhookUrl;
          updateParams.statusCallbackMethod = 'POST';
        } else {
          updateParams.smsUrl = webhookUrl;
          updateParams.smsMethod = 'POST';
        }
        
        await client.incomingPhoneNumbers(numbers[0].sid).update(updateParams);
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

// Configure Twilio when credentials are updated
router.post('/configure-from-credentials', async (req, res) => {
  try {
    console.log('📞 Received configure-from-credentials request');
    const { workspaceId, accountSid, authToken } = req.body;
    
    // Log the request (masking sensitive data)
    console.log(`🔑 Configure request for workspace ${workspaceId}`);
    console.log(`🔑 Account SID: ${accountSid?.substring(0, 6)}...${accountSid?.substring(accountSid.length - 4)}`);
    
    if (!workspaceId || !accountSid || !authToken) {
      console.log('❌ Missing required parameters');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: workspaceId, accountSid, authToken' 
      });
    }

    // Create Twilio client with the provided credentials
    console.log('🔄 Creating Twilio client with credentials');
    const client = twilio(accountSid, authToken);
    
    // Verify credentials by making a test API call
    console.log('🔍 Verifying Twilio credentials...');
    try {
      await client.api.accounts(accountSid).fetch();
      console.log('✅ Twilio credentials verified successfully');
    } catch (verifyError) {
      console.error('❌ Invalid Twilio credentials:', verifyError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid Twilio credentials. Please check your Account SID and Auth Token.'
      });
    }
    
    // 1. Sync phone numbers
    console.log('📱 Starting phone number sync...');
    const phoneNumbers = await syncPhoneNumbers(workspaceId, client);
    
    // 2. Save the Twilio config
    console.log('💾 Saving Twilio configuration...');
    
    // First, create an API key
    console.log('🔑 Creating Twilio API key...');
    const apiKey = await client.newKeys.create({friendlyName: `Softphone App - ${workspaceId}`});
    console.log('✅ API key created successfully');

    const { error: configError } = await supabase
      .from('workspace')
      .update({
        twilio_account_sid: accountSid,
        twilio_auth_token: authToken,
        twilio_api_key: apiKey.sid,
        twilio_api_secret: apiKey.secret
      })
      .eq('id', workspaceId);

    if (configError) {
      console.error('❌ Error saving Twilio configuration:', configError);
      throw configError;
    }
    
    // Return success response
    return res.json({
      success: true,
      message: 'Twilio configured successfully',
      phoneNumbers: phoneNumbers.length
    });
    
  } catch (error) {
    console.error('❌ Error configuring Twilio:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.status) console.error('Error status:', error.status);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to configure Twilio'
    });
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
      .from('workspace_twilio_number')
      .select('*')
      .eq('twilio_number', To)
      .single();

    if (phoneError) {
      console.error('Phone lookup error:', phoneError);
      throw phoneError;
    }
    if (!phoneNumber) {
      console.error('Phone number not found:', To);
      // List all numbers in database for debugging
      const { data: allNumbers } = await supabase
        .from('workspace_twilio_number')
        .select('twilio_number, workspace_id');
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
        message_type: 'text',
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
      .from('workspace_twilio_number')
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
      .from('workspace_twilio_number')
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
    const formattedFrom = normalizePhone(phoneNumber.twilio_number);
    
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
      .from('workspace_twilio_number')
      .insert({
        workspace_id: workspaceId,
        twilio_number: purchasedNumber.phoneNumber,
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
      .from('workspace_twilio_number')
      .select('twilio_number')
      .eq('workspace_id', workspaceId);

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return res.status(404).json({ error: 'No phone numbers found for workspace' });
    }

    // Verify webhook configuration for the first phone number
    const numbers = await client.incomingPhoneNumbers.list({ 
      phoneNumber: phoneNumbers[0].twilio_number 
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
        phoneNumbers: phoneNumbers.map(p => p.twilio_number)
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
        phoneNumbers: phoneNumbers.map(p => p.twilio_number)
      });
    }
  } catch (error) {
    console.error('Error verifying webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear Twilio configuration for a workspace
router.post('/clear-configuration', async (req, res) => {
  try {
    const { workspaceId } = req.body;
    
    if (!workspaceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameter: workspaceId' 
      });
    }
    
    console.log(`🧹 Clearing Twilio configuration for workspace ${workspaceId}`);
    
    // 1. Delete phone numbers from workspace_twilio_number table
    const { error: deleteNumbersError } = await supabase
      .from('workspace_twilio_number')
      .delete()
      .eq('workspace_id', workspaceId);
    
    if (deleteNumbersError) {
      console.error('Error deleting from workspace_twilio_number:', deleteNumbersError);
    }
    
    // 2. Delete phone numbers from agent_phone table
    const { error: deleteAgentPhoneError } = await supabase
      .from('agent_phone')
      .delete()
      .eq('workspace_id', workspaceId);
    
    if (deleteAgentPhoneError) {
      console.error('Error deleting from agent_phone:', deleteAgentPhoneError);
    }
    
    // 3. Delete Twilio config
    const { error: deleteTwilioConfigError } = await supabase
      .from('workspace_twilio_config')
      .delete()
      .eq('workspace_id', workspaceId);
    
    if (deleteTwilioConfigError) {
      console.error('Error deleting from workspace_twilio_config:', deleteTwilioConfigError);
    }
    
    // 4. Clear Twilio credentials from workspace table
    const { error: updateWorkspaceError } = await supabase
      .from('workspace')
      .update({
        twilio_account_sid: null,
        twilio_auth_token: null,
        twilio_twiml_app_sid: null
      })
      .eq('id', workspaceId);
    
    if (updateWorkspaceError) {
      console.error('Error updating workspace:', updateWorkspaceError);
      throw updateWorkspaceError;
    }
    
    // Notify clients about the update
    const io = getIO();
    io.to(workspaceId).emit('twilio_config_cleared');
    io.to(workspaceId).emit('phone_numbers_updated', []);
    
    res.json({ 
      success: true, 
      message: 'Twilio configuration cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing Twilio configuration:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to clear Twilio configuration' 
    });
  }
});

// Generate voice token
router.post('/voice-token/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    console.log(`🔑 Generating voice token for workspace ${workspaceId}`);
    
    // Get workspace's Twilio credentials and user info
    const { data: config, error: configError } = await supabase
      .from('workspace')
      .select('twilio_account_sid, twilio_auth_token, twilio_api_key, twilio_api_secret, twilio_twiml_app_sid')
      .eq('id', workspaceId)
      .single();

    if (configError) {
      console.error('Error fetching Twilio config:', configError);
      return res.status(500).json({ error: 'Failed to fetch Twilio configuration' });
    }

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    // Validate required credentials
    if (!config.twilio_api_key || !config.twilio_api_secret) {
      console.error('Missing API key or secret');
      return res.status(400).json({ error: 'Twilio API key not configured. Please reconfigure Twilio credentials.' });
    }

    if (!config.twilio_twiml_app_sid) {
      return res.status(400).json({ error: 'TwiML App SID not configured' });
    }

    // Get user info from user table
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('username')
      .eq('workspace_id', workspaceId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return res.status(500).json({ error: 'Failed to fetch user information' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create an access token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create Voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: config.twilio_twiml_app_sid
    });

    // Create access token with Voice grant using username as identity
    const token = new AccessToken(
      config.twilio_account_sid,
      config.twilio_api_key,
      config.twilio_api_secret,
      { identity: user.username }
    );

    // Add Voice grant to token
    token.addGrant(voiceGrant);
    
    console.log('✅ Voice token generated successfully');
    res.json({ token: token.toJwt() });
  } catch (error) {
    console.error('❌ Error generating voice token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Make outbound call
router.post('/call', async (req, res) => {
  try {
    const { workspaceId, to, from } = req.body;
    console.log(`📞 Making outbound call from ${from} to ${to}`);

    // Get workspace's Twilio credentials
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspace')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('❌ Error fetching workspace:', workspaceError);
      return res.status(500).json({ error: 'Failed to fetch workspace configuration' });
    }

    // Initialize Twilio client
    const client = twilio(workspace.twilio_account_sid, workspace.twilio_auth_token);
    
    // Create TwiML for outbound call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial({ callerId: from }, to);

    // Make the call
    const call = await client.calls.create({
      to: to,
      from: from,
      twiml: twiml.toString(),
      statusCallback: `${config.backendUrl}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
    });

    console.log(`✅ Call initiated with SID: ${call.sid}`);
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('❌ Error making outbound call:', error);
    res.status(500).json({ error: error.message });
  }
});

// Call endpoint for outbound calls
router.post('/call/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { to, from } = req.body;
    
    console.log(`📞 Making outbound call to ${to} from workspace ${workspaceId}`);
    
    // Get workspace's Twilio credentials
    const { data: config, error: configError } = await supabase
      .from('workspace')
      .select('twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid')
      .eq('id', workspaceId)
      .single();

    if (configError) {
      console.error('Error fetching Twilio config:', configError);
      return res.status(500).json({ error: 'Failed to fetch Twilio configuration' });
    }

    if (!config) {
      return res.status(404).json({ error: 'Twilio configuration not found' });
    }

    // Create Twilio client
    const client = twilio(config.twilio_account_sid, config.twilio_auth_token);

    // Create TwiML for outbound call
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial({
      callerId: from || to // Use from if provided, otherwise use to as the caller ID
    }, to);

    console.log('Using TwiML:', twiml.toString());
    console.log('Twilio credentials:', {
      accountSid: config.twilio_account_sid,
      authToken: '***' // Don't log the actual auth token
    });

    // Make the call
    const call = await client.calls.create({
      to: normalizePhone(to),
      from: from || config.twilio_account_sid, // Use from if provided, otherwise use first Twilio number
      twiml: twiml.toString(),
      statusCallback: `${req.protocol}://${req.get('host')}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });

    console.log('Call created successfully:', call.sid);
    res.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error('Error making outbound call:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status callback endpoint
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus } = req.body;
    console.log(`📞 Call ${CallSid} status update: ${CallStatus}`);
    
    // Get the IO instance
    const io = getIO();
    
    // Emit status update to all connected clients
    io.emit('call_status_update', {
      callSid: CallSid,
      status: CallStatus
    });
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling status callback:', error);
    res.status(500).json({ error: error.message });
  }
});

// Incoming call webhook
router.post('/incoming', async (req, res) => {
  try {
    const { From, To, CallSid } = req.body;
    console.log(`📞 Incoming call from ${From} to ${To}`);
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Add basic greeting
    twiml.say('Thank you for calling. Please wait while we connect you.');
    
    // Get the IO instance
    const io = getIO();
    
    // Emit incoming call event to all connected clients
    io.emit('incoming_call', {
      from: From,
      to: To,
      callSid: CallSid
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling incoming call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We are unable to process your call at this time. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

module.exports = router;