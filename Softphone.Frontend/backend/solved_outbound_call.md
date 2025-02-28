# Outbound Call Implementation Guide

## Overview
This guide documents the implementation and troubleshooting of outbound call functionality in our Twilio-based softphone application. The solution enables users to place calls from the browser to external phone numbers with proper call quality and status tracking.

## Prerequisites
1. Twilio Account with:
   - Account SID
   - Auth Token
   - API Key and Secret
   - TwiML App
   - Twilio Phone Number
2. Development environment with:
   - Node.js/Express backend
   - React/TypeScript frontend
   - ngrok for tunnel creation

## Key Configuration Points

### 1. TwiML App Configuration
- Go to Twilio Console > TwiML Apps
- Configure Voice:
  - Request URL: `https://your-ngrok-url/api/voice/outbound`
  - Method: POST
  - Status Callback URL: `https://your-ngrok-url/api/voice/outbound/status`
  - Status Callback Method: POST

### 2. Environment Variables (.env)
```plaintext
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=your_twiml_app_sid
TWILIO_PHONE_NUMBER=your_twilio_phone_number
PORT=8000
```

## Implementation

### 1. Backend Setup (server.js)

```javascript
// Token generation endpoint
app.get('/api/token', (req, res) => {
  try {
    console.log('Generating token for identity: user');
    
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: 'user' }
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true,
    });

    accessToken.addGrant(grant);
    const token = accessToken.toJwt();
    console.log('Token generated successfully');
    
    res.send({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).send({ error: error.message });
  }
});

// Separate endpoint for outbound calls
app.post('/api/voice/outbound', (req, res) => {
  console.log('Outbound call webhook called with body:', req.body);
  const twiml = new VoiceResponse();
  
  const to = req.body.To;
  if (to) {
    console.log('Processing outbound call to:', to);
    
    // Normalize phone number
    const normalizedNumber = to.replace(/[^\d+]/g, '');
    const formattedNumber = normalizedNumber.startsWith('+') ? 
      normalizedNumber : 
      `+1${normalizedNumber}`; // Assuming US numbers
    
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      answerOnBridge: true,
      timeout: 20,
      action: '/api/voice/outbound/status',
      method: 'POST',
      record: 'record-from-answer'
    });
    
    dial.number({
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: '/api/voice/outbound/status',
      statusCallbackMethod: 'POST'
    }, formattedNumber);
    
    console.log('Generated outbound TwiML:', twiml.toString());
  } else {
    console.error('No "To" parameter found in outbound call request');
    twiml.say('Invalid phone number. Please try again.');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Status callback for outbound calls
app.post('/api/voice/outbound/status', (req, res) => {
  console.log('Outbound call status update:', req.body);
  res.sendStatus(200);
});
```

### 2. Frontend Implementation (TwilioService.ts)

```typescript
class TwilioService {
    private device: Device | null = null;
    private activeCall: Call | null = null;

    async initialize(token: string) {
        if (!token || typeof token !== 'string') {
            console.error('Invalid token provided');
            return false;
        }

        try {
            console.log('Initializing Twilio device with token');
            
            // Cleanup any existing device
            await this.cleanup();
            
            this.device = new Device(token, {
                codecPreferences: ['opus', 'pcmu'],
                fakeLocalDTMF: true,
                enableRingingState: true,
                debug: true
            });

            await this.device.register();
            console.log('Device registered successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Twilio device:', error);
            return false;
        }
    }

    async makeCall(phoneNumber: string) {
        if (!this.device) {
            console.error('Device not initialized');
            return false;
        }

        try {
            console.log('Initiating call to:', phoneNumber);
            useCallStatusStore.getState().setStatus('queued', phoneNumber);
            
            // Normalize phone number
            const normalizedNumber = phoneNumber.replace(/[^\d+]/g, '');
            const formattedNumber = normalizedNumber.startsWith('+') ? 
                normalizedNumber : 
                `+1${normalizedNumber}`; // Assuming US numbers
            
            this.activeCall = await this.device.connect({
                params: {
                    To: formattedNumber,
                    answerOnBridge: "true",
                    direction: 'outbound',
                    debug: "true",
                    record: 'true',
                    timeout: '30'
                },
                rtcConstraints: {
                    audio: {
                        autoGainControl: true,
                        echoCancellation: true,
                        noiseSuppression: true
                    },
                    video: false
                }
            });

            console.log('Call initiated successfully');
            useCallStatusStore.getState().setStatus('ringing', formattedNumber);
            
            this.setupCallListeners();
            return true;
        } catch (error) {
            console.error('Failed to make call:', error);
            useCallStatusStore.getState().setStatus('failed', phoneNumber);
            return false;
        }
    }

    private setupCallListeners() {
        if (!this.activeCall) return;

        console.log('Setting up call listeners');
        
        this.activeCall.on('accept', () => {
            console.log('Call accepted');
            useCallStatusStore.getState().setStatus('in-progress', this.activeCall?.parameters.To || '');
        });

        this.activeCall.on('disconnect', () => {
            console.log('Call disconnected');
            useCallStatusStore.getState().setStatus('completed', this.activeCall?.parameters.To || '');
            this.activeCall = null;
        });

        this.activeCall.on('cancel', () => {
            console.log('Call canceled');
            useCallStatusStore.getState().setStatus('canceled', this.activeCall?.parameters.To || '');
            this.activeCall = null;
        });

        this.activeCall.on('reject', () => {
            console.log('Call rejected');
            useCallStatusStore.getState().setStatus('no-answer', this.activeCall?.parameters.To || '');
            this.activeCall = null;
        });
    }
}
```

## Troubleshooting Steps

### 1. Call Not Connecting (Error 31000)
If the call appears to connect but never rings:
1. Verify TwiML App configuration:
   - Request URL: `https://your-ngrok-url/api/voice/outbound`
   - Status Callback URL: `https://your-ngrok-url/api/voice/outbound/status`
2. Check browser console for WebSocket connection errors
3. Verify token generation and device initialization
4. Monitor server logs for webhook requests

### 2. Call Quality Issues
If there are issues with call quality:
1. Set `answerOnBridge: true` in TwiML response
2. Configure proper audio constraints:
   - Enable echo cancellation
   - Enable noise suppression
   - Enable auto gain control
3. Verify network connectivity

### 3. Call Status Not Updating
If call status is not updating correctly:
1. Verify status callback URL is correctly set
2. Check server logs for status callback requests
3. Ensure call listeners are properly set up
4. Monitor the call status store updates

## Testing Process
1. Start the backend server
2. Start ngrok tunnel
3. Update TwiML App webhooks with ngrok URL
4. Make a test call to a valid phone number
5. Monitor:
   - Browser console for device registration and call events
   - Server logs for webhook requests and status updates
   - UI for call status changes

## Common Issues and Solutions

### 1. WebSocket Connection Failure
- Verify ngrok tunnel is running
- Check TwiML App configuration
- Ensure token has proper permissions

### 2. Invalid Phone Number Format
- Implement proper phone number normalization
- Add country code if missing
- Remove non-digit characters

### 3. Audio Device Issues
- Request audio permissions before initializing device
- Configure proper audio constraints
- Check browser audio settings 