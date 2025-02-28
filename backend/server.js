import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 8000;

// Base URL for webhooks - use environment variable or fallback to localhost
const BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:8000';

// Get allowed origins from environment variable or use defaults
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5252', 'https://localhost:7245'];

// Configure CORS with specific options
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Enable JSON and URL-encoded parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const VoiceResponse = twilio.twiml.VoiceResponse;

// Generate access token
app.get('/api/token', (req, res) => {
  try {
    console.log('[Token Generation] Starting token generation...');
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create an access token using API Key and Secret (not auth token)
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { 
        identity: 'user',
        ttl: 3600 // 1 hour
      }
    );

    console.log('[Token Generation] Created access token');

    // Grant access to Voice with all necessary permissions
    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
      pushCredentialSid: null, // No push notifications needed
      endpointId: `SoftphoneClient:user:${process.env.TWILIO_ACCOUNT_SID}`
    });

    token.addGrant(grant);
    console.log('[Token Generation] Added voice grant with full permissions');

    // Include token and debug info in response
    res.json({
      token: token.toJwt(),
      expires: new Date(Date.now() + 3600 * 1000).toISOString(),
      identity: 'user',
      accountSid: process.env.TWILIO_ACCOUNT_SID
    });
    
    console.log('[Token Generation] Token generated successfully');
  } catch (error) {
    console.error('[Token Generation] Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
});

// Voice webhook for handling incoming calls
app.post('/api/voice', (req, res) => {
  console.log('[Voice Webhook] Incoming call request:', {
    direction: req.body.Direction,
    from: req.body.From,
    to: req.body.To
  });
  
  const twiml = new VoiceResponse();
  
  // Add a small delay to ensure client is ready
  twiml.pause({ length: 1 });
  
  const dial = twiml.dial({
    callerId: req.body.From || process.env.TWILIO_PHONE_NUMBER,
    answerOnBridge: true,
    timeout: 30
  });
  
  dial.client({
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallback: `${BASE_URL}/api/voice/status`,
    statusCallbackMethod: 'POST'
  }, 'user');

  console.log('[Voice Webhook] Generated TwiML:', twiml.toString());
  res.type('text/xml');
  res.send(twiml.toString());
});

// Separate webhook for handling outbound calls
app.post('/api/voice/outbound', (req, res) => {
  console.log('[Outbound Webhook] Outbound call request:', {
    from: req.body.From,
    to: req.body.To
  });
  
  const twiml = new VoiceResponse();
  
  // Add a small delay to ensure audio setup
  twiml.pause({ length: 1 });
  
  const dial = twiml.dial({
    callerId: req.body.From || process.env.TWILIO_PHONE_NUMBER,
    answerOnBridge: true,
    timeout: 30,
    record: 'record-from-answer',
    recordingStatusCallback: `${BASE_URL}/api/voice/recording-status`,
    recordingStatusCallbackMethod: 'POST'
  });
  
  dial.number({
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallback: `${BASE_URL}/api/voice/status`,
    statusCallbackMethod: 'POST'
  }, req.body.To);

  console.log('[Outbound Webhook] Generated TwiML:', twiml.toString());
  res.type('text/xml');
  res.send(twiml.toString());
});

// Recording status callback endpoint
app.post('/api/voice/recording-status', (req, res) => {
  console.log('[Recording Status] Update:', {
    recordingSid: req.body.RecordingSid,
    recordingStatus: req.body.RecordingStatus,
    recordingUrl: req.body.RecordingUrl,
    callSid: req.body.CallSid,
    timestamp: new Date().toISOString()
  });
  res.sendStatus(200);
});

// Status callback endpoint
app.post('/api/voice/status', (req, res) => {
  console.log('Call status update:', {
    callStatus: req.body.CallStatus,
    callSid: req.body.CallSid,
    from: req.body.From,
    to: req.body.To,
    direction: req.body.Direction,
    timestamp: new Date().toISOString()
  });
  res.sendStatus(200);
});

// Twilio credentials validation endpoint
app.post('/api/twilio/validate', async (req, res) => {
  const { accountSid, authToken } = req.body;

  console.log('[Twilio Validation] Attempting to validate credentials...');

  if (!accountSid || !authToken) {
    console.log('[Twilio Validation] Missing credentials');
    return res.status(400).json({ 
      valid: false, 
      message: 'Account SID and Auth Token are required' 
    });
  }

  try {
    console.log(`[Twilio Validation] Creating client for account: ${accountSid}`);
    const client = twilio(accountSid, authToken);
    
    console.log('[Twilio Validation] Fetching account info...');
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('[Twilio Validation] Account info fetched successfully:', {
      status: account.status,
      type: account.type,
      name: account.friendlyName
    });
    
    res.json({ 
      valid: true,
      accountName: account.friendlyName 
    });
  } catch (error) {
    console.error('[Twilio Validation] Error:', {
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status
    });

    // Check for specific error types
    if (error.code === 20003) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Authentication failed: Invalid Account SID or Auth Token'
      });
    } else if (error.code === 20404) {
      return res.status(404).json({ 
        valid: false, 
        message: 'Account not found'
      });
    } else if (error.status === 401) {
      return res.status(401).json({ 
        valid: false, 
        message: 'Unauthorized: Please check your credentials'
      });
    }

    res.status(500).json({ 
      valid: false, 
      message: `Validation failed: ${error.message}`
    });
  }
});

// Phone numbers endpoint
app.post('/api/twilio/phone-numbers', async (req, res) => {
  const { accountSid, authToken } = req.body;

  try {
    const client = twilio(accountSid, authToken);
    const numbers = await client.incomingPhoneNumbers.list();

    const formattedNumbers = numbers.map(number => ({
      phoneNumber: number.phoneNumber,
      region: number.region || 'US', // Default to US if not specified
      capabilities: [
        number.capabilities.voice ? 'voice' : null,
        number.capabilities.sms ? 'sms' : null,
        number.capabilities.mms ? 'mms' : null,
      ].filter(Boolean),
      sid: number.sid
    }));

    res.json(formattedNumbers);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    res.status(500).json({ error: 'Failed to fetch phone numbers' });
  }
});

// Endpoint to get the base URL
app.get('/api/base-url', (req, res) => {
  res.json({ baseUrl: BASE_URL });
});

// Endpoint to configure phone number webhooks
app.post('/api/twilio/configure-webhooks', async (req, res) => {
  const { accountSid, authToken, phoneNumberSid } = req.body;

  try {
    console.log('[Configure Webhooks] Updating phone number:', phoneNumberSid);
    const client = twilio(accountSid, authToken);
    
    // First, update the TwiML app if it exists
    if (process.env.TWILIO_TWIML_APP_SID) {
      console.log('[Configure Webhooks] Updating TwiML app configuration...');
      await client.applications(process.env.TWILIO_TWIML_APP_SID)
        .update({
          voiceUrl: `${BASE_URL}/api/voice/outbound`,
          voiceMethod: 'POST',
          statusCallback: `${BASE_URL}/api/voice/status`,
          statusCallbackMethod: 'POST'
        });
    }
    
    // Then update the phone number's voice URL configuration
    console.log('[Configure Webhooks] Updating phone number configuration...');
    await client.incomingPhoneNumbers(phoneNumberSid)
      .update({
        voiceUrl: `${BASE_URL}/api/voice`,
        voiceMethod: 'POST',
        statusCallback: `${BASE_URL}/api/voice/status`,
        statusCallbackMethod: 'POST'
      });

    console.log('[Configure Webhooks] Successfully updated all webhooks');
    res.json({ success: true });
  } catch (error) {
    console.error('[Configure Webhooks] Error:', error);
    res.status(500).json({ 
      error: 'Failed to configure webhooks',
      message: error.message 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Webhook base URL:', BASE_URL);
  console.log('Make sure to update your Twilio configuration with this URL');
  console.log('1. Voice Webhook URL:', `${BASE_URL}/api/voice`);
  console.log('2. Status Callback URL:', `${BASE_URL}/api/voice/status`);
  console.log('3. TwiML App Request URL:', `${BASE_URL}/api/voice/outbound`);
}); 