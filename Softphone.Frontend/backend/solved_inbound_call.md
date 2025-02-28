# Inbound Call Implementation Guide

## Overview
This guide documents the implementation and troubleshooting of inbound call functionality in our Twilio-based softphone application. The solution enables the application to receive incoming calls, display a notification to the user, and handle call acceptance or rejection.

## Prerequisites
1. Twilio Account with:
   - Active phone number
   - TwiML App configured
   - Voice capabilities enabled
2. Development environment with:
   - Node.js/Express backend
   - React/TypeScript frontend
   - ngrok for tunnel creation

## Key Configuration Points

### 1. TwiML App Configuration
- Go to Twilio Console > TwiML Apps
- Configure Voice:
  - Request URL: `https://your-ngrok-url/api/voice`
  - Method: POST
  - Status Callback URL: `https://your-ngrok-url/api/voice/status`
  - Status Callback Method: POST

### 2. Twilio Phone Number Configuration
- Go to Twilio Console > Phone Numbers
- Select your phone number
- Under Voice Configuration:
  - Set "A Call Comes In" webhook to: `https://your-ngrok-url/api/voice`
  - Method: POST

## Implementation

### 1. Backend Setup (server.js)

```javascript
// Token generation with inbound permissions
app.get('/api/token', (req, res) => {
  try {
    const accessToken = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: 'user' }
    );

    const grant = new VoiceGrant({
      outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID,
      incomingAllow: true, // Enable incoming calls
    });

    accessToken.addGrant(grant);
    res.send({ token: accessToken.toJwt() });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).send({ error: error.message });
  }
});

// Voice webhook for handling incoming calls
app.post('/api/voice', (req, res) => {
  console.log('Voice webhook called with body:', req.body);
  const twiml = new VoiceResponse();
  
  if (req.body.Direction === 'inbound') {
    console.log('Processing inbound call to client');
    const dial = twiml.dial({
      callerId: process.env.TWILIO_PHONE_NUMBER,
      answerOnBridge: true,
      timeout: 30
    });
    
    dial.client({
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: '/api/voice/status',
      statusCallbackMethod: 'POST'
    }, 'user');
  }

  res.type('text/xml');
  res.send(twiml.toString());
});

// Status callback endpoint
app.post('/api/voice/status', (req, res) => {
  console.log('Call status update:', req.body);
  res.sendStatus(200);
});
```

### 2. Frontend Implementation (TwilioService.ts)

```typescript
class TwilioService {
    private device: Device | null = null;
    private activeCall: Call | null = null;
    private incomingCallHandlers: ((call: Call) => void)[] = [];
    private unsubscribeCallbacks: (() => void)[] = [];

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
            this.setupListeners();
            return true;
        } catch (error) {
            console.error('Failed to initialize Twilio device:', error);
            return false;
        }
    }

    private setupListeners() {
        if (!this.device) return;

        // Handle incoming calls
        const incomingUnsubscribe = this.device.on('incoming', (call: Call) => {
            console.log('Incoming call received from:', call.parameters.From);
            this.activeCall = call;
            
            // Setup call-specific listeners
            call.on('accept', () => {
                console.log('Call accepted');
                useCallStatusStore.getState().setStatus('in-progress', call.parameters.From || '');
            });

            call.on('disconnect', () => {
                console.log('Call disconnected');
                useCallStatusStore.getState().setStatus('completed', call.parameters.From || '');
                this.activeCall = null;
            });

            call.on('cancel', () => {
                console.log('Call canceled');
                useCallStatusStore.getState().setStatus('canceled', call.parameters.From || '');
                this.activeCall = null;
            });

            // Notify registered handlers
            this.incomingCallHandlers.forEach(handler => {
                try {
                    handler(call);
                } catch (error) {
                    console.error('Error in incoming call handler:', error);
                }
            });
        });

        this.unsubscribeCallbacks.push(incomingUnsubscribe);
    }

    onIncomingCall(handler: (call: Call) => void) {
        this.incomingCallHandlers.push(handler);
        return () => {
            this.incomingCallHandlers = this.incomingCallHandlers.filter(h => h !== handler);
        };
    }

    async acceptIncomingCall() {
        if (this.activeCall) {
            console.log('Accepting incoming call');
            try {
                await this.activeCall.accept();
                useCallStatusStore.getState().setStatus('in-progress', this.activeCall.parameters.From || '');
                return true;
            } catch (error) {
                console.error('Failed to accept call:', error);
                return false;
            }
        }
        return false;
    }

    async rejectIncomingCall() {
        if (this.activeCall) {
            console.log('Rejecting incoming call');
            try {
                await this.activeCall.reject();
                useCallStatusStore.getState().setStatus('no-answer', this.activeCall.parameters.From || '');
                return true;
            } catch (error) {
                console.error('Failed to reject call:', error);
                return false;
            }
        }
        return false;
    }
}
```

## Troubleshooting Steps

### 1. Incoming Call Not Showing
If the incoming call pop-up is not appearing:
1. Verify token generation includes `incomingAllow: true`
2. Check that the device is properly registered
3. Verify the `onIncomingCall` handler is properly set up
4. Monitor browser console for incoming call events

### 2. Call Audio Issues
If there are issues with call audio:
1. Set `answerOnBridge: true` in the TwiML response
2. Verify audio device permissions in the browser
3. Check audio constraints in device initialization

### 3. Call Status Not Updating
If call status is not updating correctly:
1. Verify status callback URL is correctly set
2. Check server logs for status callback requests
3. Ensure call listeners are properly set up
4. Monitor the call status store updates

## Testing Process
1. Start the backend server
2. Start ngrok tunnel
3. Update TwiML App and Phone Number webhooks with ngrok URL
4. Make a test call to your Twilio number
5. Monitor:
   - Browser console for device registration and incoming call events
   - Server logs for webhook requests and status updates
   - UI for incoming call notification and status changes 