const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const { Server } = require('socket.io');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Configure CORS
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['https://beta.sofphone.channelautomation.com', 'https://localhost:7245', 'https://localhost:7246', 'http://localhost:7245', 'http://localhost:7246'];

console.log('⚙️ CORS Origins:', corsOrigins);

const corsOptions = {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Validate Supabase environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_SERVICE_KEY');
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-supabase-client': 'livechat-backend'
      }
    }
  }
);

// Phone number normalization helper
function normalizePhone(phone) {
  if (!phone) {
    return '';
  }
  
  // If already has a plus, return as is
  if (phone.startsWith('+')) {
    return phone;
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle numbers that already include country code
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('61') && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  // Handle 10-digit numbers
  if (cleaned.length === 10) {
    // US format: 10 digits
    if (!cleaned.startsWith('0')) {
      return `+1${cleaned}`;
    }
    // AU format: starts with 0
    else {
      return `+61${cleaned.substring(1)}`;
    }
  }

  // If we can't normalize, return original
  return phone;
}

// Format phone for Twilio (alias for normalizePhone)
const formatPhoneForTwilio = normalizePhone;

// Store connected users
const users = new Map();

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    domain: req.get('host')
  });
});

// Helper function to get Twilio credentials for a workspace
async function getTwilioClient(workspaceId) {
  try {
    // Fetch Twilio credentials from the database
    const { data, error } = await supabase
      .from('workspaces')
      .select('twilio_account_sid, twilio_auth_token')
      .eq('id', workspaceId)
      .single();

    if (error || !data) {
      console.error('Error fetching Twilio credentials:', error);
      throw new Error('Failed to fetch Twilio credentials');
    }

    if (!data.twilio_account_sid || !data.twilio_auth_token) {
      throw new Error('Twilio credentials not configured for this workspace');
    }

    // Create and return a new Twilio client
    return twilio(data.twilio_account_sid, data.twilio_auth_token);
  } catch (error) {
    console.error('Error creating Twilio client:', error);
    throw error;
  }
}

// Handle inbound message from Twilio
async function handleInboundMessage({ twilioSid, contactId, workspaceId, direction, content }) {
  console.log('📥 Handling inbound message:', { twilioSid, contactId, workspaceId, direction, content });

  try {
    // Check if message already exists
    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .eq('twilio_sid', twilioSid)
      .single();

    if (existingMessage) {
      console.log('✅ Message already exists:', existingMessage);
      return existingMessage.id;
    }

    // Save new message
    const { data: message, error } = await supabase
      .from('messages')
      .insert([
        {
          contact_id: contactId,
          workspace_id: workspaceId,
          direction,
          body: content,
          message_type: 'text',
          status: 'delivered',
          twilio_sid: twilioSid
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error saving inbound message:', error);
      throw error;
    }

    console.log('✅ Saved inbound message:', message);
    return message.id;

  } catch (error) {
    console.error('❌ Error in handleInboundMessage:', error);
    throw error;
  }
};

// Import routes
const twilioRoutes = require('./routes/twilio');
const voiceRoutes = require('./src/routes/voice');

// Mount routes
app.use('/api/twilio', twilioRoutes);
app.use('/voice', voiceRoutes);

// Configure Socket.IO
const socketCorsOrigins = process.env.SOCKET_CORS_ORIGIN 
  ? process.env.SOCKET_CORS_ORIGIN.split(',') 
  : corsOrigins;

console.log('⚙️ Socket.IO CORS Origins:', socketCorsOrigins);

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
      'X-CSRF-Token'
    ],
    credentials: true
  },
  allowEIO3: true, // Allow Engine.IO version 3
  transports: ['websocket', 'polling']
});

// Function to get the Socket.IO instance
const getIO = () => io;

// Export io instance
require('./io').init(io);

// Add error event handler
io.engine.on("connection_error", (err) => {
  console.log("Connection error:", err);
});

// Track active rooms for each socket
const socketRooms = new Map();

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join', async (data) => {
    try {
      const { phoneNumber, contactId, workspaceId } = data;
      console.log('📱 Join request:', { phoneNumber, contactId, workspaceId });

      if (!phoneNumber || !contactId || !workspaceId) {
        console.error('❌ Missing required fields:', { phoneNumber, contactId, workspaceId });
        socket.emit('error', { message: 'Missing join fields' });
        return;
      }

      // Verify contact exists
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id, phone_number, workspace_id')
        .eq('id', contactId)
        .eq('workspace_id', workspaceId)
        .single();

      if (contactError || !contact) {
        console.error('❌ Contact not found:', { contactId, workspaceId, error: contactError });
        socket.emit('error', { message: 'Contact not found' });
        return;
      }

      // Verify phone number matches
      if (normalizePhone(contact.phone_number) !== normalizePhone(phoneNumber)) {
        console.error('❌ Phone number mismatch:', {
          stored: contact.phone_number,
          received: phoneNumber
        });
        socket.emit('error', { message: 'Phone number mismatch' });
        return;
      }

      // Leave previous room if any
      const previousRoom = socketRooms.get(socket.id);
      if (previousRoom) {
        console.log('🚪 Leaving previous room:', previousRoom);
        socket.leave(previousRoom);
      }

      // Join new room
      const room = `contact:${contactId}`;
      socket.join(room);
      socketRooms.set(socket.id, room);
      console.log('✅ Client joined room:', room);

      // Send recent messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!messagesError && messages) {
        console.log('📨 Sending recent messages:', messages.length);
        socket.emit('recent_messages', messages.reverse());
      }

      socket.emit('join_success', { room });
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('disconnect', () => {
    const room = socketRooms.get(socket.id);
    if (room) {
      console.log('🔌 Client disconnected from room:', room);
      socketRooms.delete(socket.id);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const { to, message, contactId, workspaceId, messageId } = data;

      if (!to || !message || !contactId || !workspaceId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Get workspace Twilio config
      const { data: twilioConfig, error: configError } = await supabase
        .from('workspace_twilio_config')
        .select('account_sid, auth_token')
        .eq('workspace_id', workspaceId)
        .single();

      if (configError) {
        console.error('❌ Error fetching Twilio config:', configError);
        socket.emit('error', { message: 'Failed to fetch Twilio config' });
        return;
      }

      // Get workspace Twilio number
      const { data: twilioNumber, error: numberError } = await supabase
        .from('workspace_twilio_number')
        .select('twilio_number')
        .eq('workspace_id', workspaceId)
        .single();

      if (numberError) {
        console.error('❌ Error fetching Twilio number:', numberError);
        socket.emit('error', { message: 'Failed to fetch Twilio number' });
        return;
      }

      // Verify contact exists and belongs to workspace
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id, phone_number, workspace_id')
        .eq('id', contactId)
        .eq('workspace_id', workspaceId)
        .single();

      if (contactError) {
        console.error('❌ Error fetching contact:', contactError);
        socket.emit('error', { message: 'Failed to fetch contact' });
        return;
      }

      if (!contact) {
        console.error('❌ Contact not found:', { contactId, workspaceId });
        socket.emit('error', { message: 'Contact not found' });
        return;
      }

      // Verify phone number matches
      if (normalizePhone(contact.phone_number) !== normalizePhone(to)) {
        console.error('❌ Phone number mismatch');
        socket.emit('error', { message: 'Phone number mismatch' });
        return;
      }

      // Initialize Twilio client with workspace credentials
      const client = await getTwilioClient(workspaceId);

      // Send message via Twilio
      const twilioMessage = await client.messages.create({
        body: message,
        to: formatPhoneForTwilio(to),
        from: twilioNumber.twilio_number
      });

      // Update message with Twilio SID and status
      const { data: savedMessage, error: messageError } = await supabase
        .from('messages')
        .update({
          twilio_sid: twilioMessage.sid,
          status: 'delivered'
        })
        .eq('id', messageId)
        .select()
        .single();

      if (messageError) {
        console.error('❌ Error updating message:', messageError);
        socket.emit('error', { message: 'Failed to update message' });
        return;
      }

      // Get the room for this contact
      const room = `contact:${contactId}`;

      // Emit to room
      io.to(room).emit('new_message', savedMessage);

      // Emit success to sender
      socket.emit('message_sent', {
        success: true,
        message: savedMessage,
        messageId
      });

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { 
        message: error.message,
        details: error.code === 21211 ? 'Invalid phone number format' : error.code
      });
    }
  });

  // ... rest of your code
});

// Twilio configuration endpoint
app.post('/api/twilio/config', (req, res) => {
  try {
    // Only expose the phone number, not the credentials
    res.json({
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      success: true
    });
  } catch (error) {
    console.error('Error getting Twilio config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Twilio configuration'
    });
  }
});

// Twilio webhook endpoint with workspace ID in URL
app.post('/api/twilio/webhook/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { MessageSid, From, To, Body } = req.body;
    console.log('📱 Received workspace-specific webhook:', { workspaceId, MessageSid, From, To, Body });
    
    if (!MessageSid || !From || !To || !Body) {
      console.error('❌ Missing required Twilio fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('❌ Error verifying workspace:', workspaceError);
      return res.status(500).json({ error: 'Failed to verify workspace' });
    }

    if (!workspace) {
      console.error('❌ Workspace not found:', workspaceId);
      return res.status(404).json({ error: 'Workspace not found' });
    }

    console.log('✅ Found workspace:', workspaceId);

    // Find contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', normalizePhone(From))
      .eq('workspace_id', workspaceId)
      .single();

    if (contactError && contactError.code !== 'PGRST116') {
      console.error('❌ Error fetching contact:', contactError);
      return res.status(500).json({ error: 'Failed to fetch contact' });
    }

    let contactId;
    if (!contact) {
      // Create new contact with required fields
      console.log('➕ Creating new contact for:', From);
      console.log('Contact data:', {
        phone_number: normalizePhone(From),
        workspace_id: workspaceId,
        name: From,
        firstname: 'New',
        lastname: 'Contact',
        email: '',
        lead_source: 'SMS'
      });
      
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          phone_number: normalizePhone(From),
          workspace_id: workspaceId,
          name: From, // Use phone number as initial name
          firstname: 'New', // Adding required firstname field
          lastname: 'Contact', // Adding lastname for completeness
          email: '', // Empty email
          lead_source: 'SMS' // Adding lead source
        })
        .select('*')
        .single();

      if (createError) {
        console.error('❌ Error creating contact:', createError);
        console.error('Error details:', JSON.stringify(createError));
        return res.status(500).json({ error: 'Failed to create contact' });
      }
      
      contactId = newContact.id;
      console.log('✅ Created new contact:', contactId);
    } else {
      contactId = contact.id;
      console.log('✅ Found existing contact:', contactId);
    }

    // Save inbound message
    console.log('💾 Saving inbound message');
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        contact_id: contactId,
        workspace_id: workspaceId,
        direction: 'inbound',
        body: Body,
        message_type: 'text',
        status: 'delivered',
        twilio_sid: MessageSid,
        metadata: {
          twilio_from: From,
          twilio_to: To,
          twilio_phone_numbers: {
            from: From,
            to: To
          },
          extension: 'txt'
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving message:', error);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    console.log('✅ Message saved successfully:', message.id);

    // Broadcast to room
    const room = `contact:${contactId}`;
    const io = getIO();
    io.to(room).emit('new_message', message);
    
    // Also emit to workspace room
    io.to(workspaceId).emit('message_created', message);
    
    console.log('📢 Notified rooms:', room, 'and', workspaceId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Original Twilio webhook endpoint (for backward compatibility)
app.post('/api/twilio/webhook', async (req, res) => {
  try {
    const { MessageSid, From, To, Body } = req.body;
    console.log('📱 Received webhook:', { MessageSid, From, To, Body });
    
    if (!MessageSid || !From || !To || !Body) {
      console.error('❌ Missing required Twilio fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the workspace by the To (destination) number
    console.log('🔍 Looking up phone number:', To);
    const { data: phoneNumberData, error: phoneError } = await supabase
      .from('twilio_numbers')
      .select('workspace_id')
      .eq('phone_number', normalizePhone(To))
      .single();

    if (phoneError) {
      console.error('❌ Error looking up phone number:', phoneError);
      return res.status(500).json({ error: 'Failed to find workspace for this phone number' });
    }

    if (!phoneNumberData) {
      console.error('❌ No workspace found for phone number:', To);
      // List all numbers in database for debugging
      const { data: allNumbers } = await supabase
        .from('twilio_numbers')
        .select('phone_number, workspace_id');
      console.log('📋 Available numbers:', allNumbers);
      return res.status(404).json({ error: 'No workspace found for this phone number' });
    }

    const workspaceId = phoneNumberData.workspace_id;
    console.log('✅ Found workspace:', workspaceId);

    // Find contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', normalizePhone(From))
      .eq('workspace_id', workspaceId)
      .single();

    if (contactError && contactError.code !== 'PGRST116') {
      console.error('❌ Error fetching contact:', contactError);
      return res.status(500).json({ error: 'Failed to fetch contact' });
    }

    let contactId;
    if (!contact) {
      // Create new contact with required fields
      console.log('➕ Creating new contact for:', From);
      console.log('Contact data:', {
        phone_number: normalizePhone(From),
        workspace_id: workspaceId,
        name: From,
        firstname: 'New',
        lastname: 'Contact',
        email: '',
        lead_source: 'SMS'
      });
      
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert({
          phone_number: normalizePhone(From),
          workspace_id: workspaceId,
          name: From, // Use phone number as initial name
          firstname: 'New', // Adding required firstname field
          lastname: 'Contact', // Adding lastname for completeness
          email: '', // Empty email
          lead_source: 'SMS' // Adding lead source
        })
        .select('*')
        .single();

      if (createError) {
        console.error('❌ Error creating contact:', createError);
        console.error('Error details:', JSON.stringify(createError));
        return res.status(500).json({ error: 'Failed to create contact' });
      }
      
      contactId = newContact.id;
      console.log('✅ Created new contact:', contactId);
    } else {
      contactId = contact.id;
      console.log('✅ Found existing contact:', contactId);
    }

    // Save inbound message
    console.log('💾 Saving inbound message');
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{
        contact_id: contactId,
        workspace_id: workspaceId,
        direction: 'inbound',
        body: Body,
        message_type: 'text',
        status: 'delivered',
        twilio_sid: MessageSid,
        metadata: {
          twilio_from: From,
          twilio_to: To,
          twilio_phone_numbers: {
            from: From,
            to: To
          },
          extension: 'txt'
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving message:', error);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    console.log('✅ Message saved successfully:', message.id);

    // Broadcast to room
    const room = `contact:${contactId}`;
    const io = getIO();
    io.to(room).emit('new_message', message);
    
    // Also emit to workspace room
    io.to(workspaceId).emit('message_created', message);
    
    console.log('📢 Notified rooms:', room, 'and', workspaceId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch messages for a contact
app.get('/messages/:contactId', async (req, res) => {
  const { contactId } = req.params;
  const { limit = 50 } = req.query;

  console.log(' Fetching messages for contact:', contactId);

  try {
    // First verify the contact exists
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('id', contactId)
      .single();

    if (contactError) {
      console.error(' Error finding contact:', contactError);
      return res.status(500).json({ error: contactError.message });
    }

    if (!contact) {
      console.error(' Contact not found:', contactId);
      return res.status(404).json({ error: 'Contact not found' });
    }

    console.log(' Found contact:', contact);

    // Get messages for the contact
    const { data: messages, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (messageError) {
      console.error(' Error fetching messages:', messageError);
      return res.status(500).json({ error: messageError.message });
    }

    console.log(` Found ${messages?.length || 0} messages for contact`);
    return res.json({ messages: messages || [] });

  } catch (error) {
    console.error(' Error in /messages/:contactId:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send SMS endpoint for quick messages
app.post('/api/twilio/send-sms', async (req, res) => {
  try {
    const { to, message, workspaceId } = req.body;
    console.log('Sending SMS to:', to, 'Message:', message, 'Workspace:', workspaceId);

    if (!to || !message || !workspaceId) {
      console.error('Missing required fields:', { to, message, workspaceId });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: to, message, workspaceId' 
      });
    }

    // Format the phone number
    const formattedPhone = formatPhoneForTwilio(to);
    
    // Get workspace phone numbers from database
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('phone_numbers')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (phoneError || !phoneNumbers || phoneNumbers.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No phone numbers found for this workspace' 
      });
    }
    
    // Use the first phone number for now (can be enhanced later)
    const phoneNumber = phoneNumbers[0];
    
    // Get Twilio credentials for this workspace
    const client = await getTwilioClient(workspaceId);
    
    let twilioMessage;
    try {
      twilioMessage = await client.messages.create({
        body: message,
        to: formattedPhone,
        from: phoneNumber.phone_number,
      });
      console.log('Twilio message sent:', twilioMessage.sid);

      // Use direct SQL query to insert the message
      const metadata = JSON.stringify({
        from: phoneNumber.phone_number,
        to: formattedPhone
      });
      
      const { data, error: sqlError } = await supabase.from('messages').insert({
        contact_id: null,
        workspace_id: workspaceId,
        direction: 'outbound',
        body: message,
        message_type: 'text',
        status: 'delivered',
        twilio_sid: twilioMessage.sid,
        metadata: metadata
      }).select('id').single();

      if (sqlError) {
        console.error('Error inserting message:', sqlError);
        throw sqlError;
      }

      console.log('Message saved with ID:', data?.id);

      // Notify connected clients
      io.to(workspaceId).emit('new_message', {
        workspaceId,
        contactId: null,
        messageSid: twilioMessage.sid,
        from: phoneNumber.phone_number,
        to: formattedPhone,
        body: message,
        direction: 'outbound'
      });

      res.json({ 
        success: true, 
        messageSid: twilioMessage.sid 
      });
    } catch (twilioError) {
      console.error('Twilio error:', twilioError);
      return res.status(500).json({
        success: false,
        error: twilioError.message
      });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint for message insertion
app.post('/api/twilio/test-message-insert', async (req, res) => {
  try {
    const { contactId, workspaceId, message } = req.body;
    
    if (!contactId || !workspaceId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: contactId, workspaceId, message' 
      });
    }
    
    // Try inserting with minimal fields
    const { data, error } = await supabase
      .from('messages')
      .insert({
        contact_id: contactId,
        workspace_id: workspaceId,
        body: message,
        direction: 'outbound',
        message_type: 'text',
        status: 'delivered'
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error inserting message:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    return res.json({ 
      success: true, 
      messageId: data.id 
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Configure Twilio for Voice Calling
app.post('/api/configure-twilio', async (req, res) => {
  try {
    const { workspaceId, accountSid, authToken, apiKey } = req.body;
    
    if (!workspaceId || !accountSid || !authToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: workspaceId, accountSid, authToken' 
      });
    }
    
    console.log(`🔧 Configuring Twilio for workspace ${workspaceId}`);
    
    // Update workspace with Twilio credentials
    const { error } = await supabase
      .from('workspace')
      .update({
        twilio_account_sid: accountSid,
        twilio_auth_token: authToken,
        channel_automation_api_key: apiKey || null,
        modified_at: new Date().toISOString()
      })
      .eq('id', workspaceId);
    
    if (error) throw error;
    
    // Initialize Twilio client with the provided credentials
    const workspaceClient = twilio(accountSid, authToken);
    
    // Test the credentials by listing available phone numbers
    await workspaceClient.incomingPhoneNumbers.list({ limit: 1 });
    
    // Get the base URL for webhooks
    const baseUrl = process.env.BASE_URL || 'https://backend-production-3d08.up.railway.app';
    
    // Configure TwiML app
    const response = await fetch(`${baseUrl}/api/voice/configure-twiml-app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        workspaceId,
        baseUrl
      })
    });
    
    const twimlAppResult = await response.json();
    
    if (!twimlAppResult.success) {
      throw new Error(`Failed to configure TwiML app: ${twimlAppResult.error}`);
    }
    
    res.json({ 
      success: true, 
      message: 'Twilio configured successfully',
      twimlAppSid: twimlAppResult.twimlAppSid
    });
  } catch (error) {
    console.error('❌ Error configuring Twilio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { getIO };