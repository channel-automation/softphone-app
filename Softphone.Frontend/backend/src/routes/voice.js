const express = require('express');
const twilio = require('twilio');
const { getIO } = require('../io');
const supabase = require('../supabase');

const router = express.Router();

// Helper function to get Twilio client for a workspace
async function getTwilioClientForWorkspace(workspaceId) {
  const { data, error } = await supabase
    .from('workspace')
    .select('twilio_account_sid, twilio_auth_token')
    .eq('id', workspaceId)
    .single();
    
  if (error) throw error;
  if (!data) throw new Error('No Twilio configuration found for workspace');
  
  return twilio(data.twilio_account_sid, data.twilio_auth_token);
}

// Helper function to normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove all non-numeric characters
  let normalized = phone.replace(/\D/g, '');
  
  // Ensure it has the + prefix
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized;
  }
  
  return normalized;
}

// Generate access token for Twilio Client
router.post('/token', async (req, res) => {
  try {
    const { workspaceId, identity } = req.body;
    
    if (!workspaceId || !identity) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: workspaceId, identity' 
      });
    }
    
    // Get workspace Twilio credentials
    const { data: workspace, error } = await supabase
      .from('workspace')
      .select('twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid')
      .eq('id', workspaceId)
      .single();
    
    if (error || !workspace) {
      throw new Error('Workspace not found or error retrieving workspace');
    }
    
    // Create an Access Token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: workspace.twilio_twiml_app_sid,
      incomingAllow: true
    });
    
    // Create the access token
    const token = new AccessToken(
      workspace.twilio_account_sid,
      workspace.twilio_auth_token,
      { identity: identity }
    );
    
    // Add the voice grant to the token
    token.addGrant(voiceGrant);
    
    // Return the token
    res.json({ 
      success: true, 
      token: token.toJwt() 
    });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Configure TwiML App for a workspace
router.post('/configure-twiml-app', async (req, res) => {
  try {
    const { workspaceId, baseUrl } = req.body;
    
    if (!workspaceId || !baseUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: workspaceId, baseUrl' 
      });
    }
    
    // Get Twilio client for workspace
    const client = await getTwilioClientForWorkspace(workspaceId);
    
    // Voice URLs
    const voiceUrl = `${baseUrl}/api/voice/outbound`;
    const statusCallbackUrl = `${baseUrl}/api/voice/status`;
    
    // Check if TwiML app already exists
    const apps = await client.applications.list({ friendlyName: `Softphone-${workspaceId}` });
    
    let twimlApp;
    
    if (apps.length > 0) {
      // Update existing app
      twimlApp = await client.applications(apps[0].sid).update({
        voiceUrl: voiceUrl,
        voiceMethod: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST'
      });
      
      console.log(`📱 Updated TwiML App: ${twimlApp.sid}`);
    } else {
      // Create new app
      twimlApp = await client.applications.create({
        friendlyName: `Softphone-${workspaceId}`,
        voiceUrl: voiceUrl,
        voiceMethod: 'POST',
        statusCallback: statusCallbackUrl,
        statusCallbackMethod: 'POST'
      });
      
      console.log(`📱 Created TwiML App: ${twimlApp.sid}`);
    }
    
    // Save TwiML app SID to workspace
    const { error } = await supabase
      .from('workspace')
      .update({ twilio_twiml_app_sid: twimlApp.sid })
      .eq('id', workspaceId);
    
    if (error) throw error;
    
    // Configure phone numbers to use this TwiML app
    await configurePhoneNumbersForVoice(workspaceId, client, twimlApp.sid);
    
    res.json({ 
      success: true, 
      twimlAppSid: twimlApp.sid 
    });
  } catch (error) {
    console.error('❌ Error configuring TwiML app:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Helper function to configure phone numbers for voice
async function configurePhoneNumbersForVoice(workspaceId, client, twimlAppSid) {
  try {
    // Get all phone numbers for this workspace
    const { data: phoneNumbers, error } = await supabase
      .from('workspace_twilio_number')
      .select('twilio_number')
      .eq('workspace_id', workspaceId);
    
    if (error) throw error;
    
    if (!phoneNumbers || phoneNumbers.length === 0) {
      console.log('⚠️ No phone numbers found for workspace');
      return;
    }
    
    // Get all incoming phone numbers from Twilio
    const incomingNumbers = await client.incomingPhoneNumbers.list();
    
    // Update each phone number to use the TwiML app
    for (const phoneNumber of phoneNumbers) {
      const twilioNumber = normalizePhone(phoneNumber.twilio_number);
      
      // Find the matching Twilio phone number
      const matchingNumber = incomingNumbers.find(n => 
        normalizePhone(n.phoneNumber) === twilioNumber
      );
      
      if (matchingNumber) {
        await client.incomingPhoneNumbers(matchingNumber.sid).update({
          voiceApplicationSid: twimlAppSid
        });
        
        console.log(`📱 Updated phone number ${twilioNumber} to use TwiML App ${twimlAppSid}`);
      } else {
        console.log(`⚠️ Could not find Twilio number matching ${twilioNumber}`);
      }
    }
  } catch (error) {
    console.error('❌ Error configuring phone numbers for voice:', error);
    throw error;
  }
}

// Handle outbound calls
router.post('/outbound', async (req, res) => {
  try {
    const { To, From, WorkspaceId } = req.body;
    
    console.log(`📞 Outbound call from ${From} to ${To} for workspace ${WorkspaceId}`);
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Set caller ID to the From parameter or default Twilio number
    let callerId = From;
    
    // If From is not provided or not a valid phone number, get a default number
    if (!From || !From.match(/^\+\d+$/)) {
      // Get a default number for this workspace
      const { data: phoneNumber, error } = await supabase
        .from('workspace_twilio_number')
        .select('twilio_number')
        .eq('workspace_id', WorkspaceId)
        .limit(1)
        .single();
      
      if (!error && phoneNumber) {
        callerId = phoneNumber.twilio_number;
      }
    }
    
    // Connect to the phone number
    const dial = twiml.dial({ callerId });
    
    if (To.match(/^\+\d+$/)) {
      // If To is a phone number, call it directly
      dial.number(To);
    } else {
      // If To is a client identifier, call the client
      dial.client(To);
    }
    
    // Return TwiML
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('❌ Error handling outbound call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle inbound calls
router.post('/inbound', async (req, res) => {
  try {
    const { To, From, CallSid } = req.body;
    
    console.log(`📞 Inbound call from ${From} to ${To}, CallSid: ${CallSid}`);
    
    // Find the workspace for this number
    const { data: twilioNumber, error } = await supabase
      .from('workspace_twilio_number')
      .select('workspace_id')
      .eq('twilio_number', To)
      .single();
    
    if (error || !twilioNumber) {
      throw new Error('No workspace found for this number');
    }
    
    // Find an available agent for this workspace
    const { data: agent, error: agentError } = await supabase
      .from('agent')
      .select('username')
      .eq('workspace_id', twilioNumber.workspace_id)
      .limit(1)
      .single();
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (agentError || !agent) {
      // No agent available, play a message
      twiml.say('Thank you for calling. No agents are available at this time. Please try again later.');
      twiml.hangup();
    } else {
      // Connect to the agent's client
      twiml.say('Connecting you to an agent. Please wait.');
      const dial = twiml.dial();
      dial.client(agent.username);
    }
    
    // Return TwiML
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('❌ Error handling inbound call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Handle call status callbacks
router.post('/status', async (req, res) => {
  try {
    const { CallSid, CallStatus, From, To } = req.body;
    
    console.log(`📞 Call ${CallSid} from ${From} to ${To} is now ${CallStatus}`);
    
    // Notify connected clients about call status
    const io = getIO();
    if (io) {
      io.emit('call_status_update', {
        callSid: CallSid,
        status: CallStatus,
        from: From,
        to: To
      });
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error handling call status:', error);
    res.sendStatus(500);
  }
});

module.exports = router;
