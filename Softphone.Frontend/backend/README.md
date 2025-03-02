# Softphone Backend Server

This is the backend server for the Softphone application, providing voice calling functionality via Twilio integration.

## Features

- Token generation for Twilio Client
- TwiML app configuration
- Voice webhooks for inbound and outbound calls
- Call status tracking
- Real-time updates via Socket.IO

## Prerequisites

- Node.js 18.x or higher
- Supabase account with database setup
- Twilio account with voice capabilities
- Railway account for deployment

## Environment Variables

Create a `.env` file with the following variables:

```
# Base URL for webhooks
BASE_URL=https://softphone-backend.up.railway.app

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Twilio Configuration (default for server, individual workspaces have their own)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Server Configuration
PORT=3001
```

## Local Development

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

## Deployment to Railway

1. Create a new project in Railway
2. Connect your GitHub repository
3. Set the required environment variables
4. Railway will automatically deploy your application

## API Endpoints

### Voice Calling

- `POST /api/voice/token`: Generate a Twilio Client token
- `POST /api/voice/configure-twiml-app`: Configure a TwiML app
- `POST /api/voice/outbound`: Handle outbound calls
- `POST /api/voice/inbound`: Handle inbound calls
- `POST /api/voice/status`: Handle call status updates

### Configuration

- `POST /api/configure-twilio`: Configure Twilio credentials for a workspace

## Testing

### Curl Commands for Testing

1. Configure Twilio for a workspace:
```bash
curl -X POST https://softphone-backend.up.railway.app/api/configure-twilio \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "YOUR_WORKSPACE_ID",
    "accountSid": "YOUR_TWILIO_ACCOUNT_SID",
    "authToken": "YOUR_TWILIO_AUTH_TOKEN",
    "apiKey": "YOUR_CHANNEL_AUTOMATION_API_KEY"
  }'
```

2. Generate a token for Twilio Client:
```bash
curl -X POST https://softphone-backend.up.railway.app/api/voice/token \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "YOUR_WORKSPACE_ID",
    "identity": "agent_username"
  }'
```

3. Test outbound call (TwiML generation):
```bash
curl -X POST https://softphone-backend.up.railway.app/api/voice/outbound \
  -H "Content-Type: application/json" \
  -d '{
    "To": "+1234567890",
    "From": "+0987654321",
    "WorkspaceId": "YOUR_WORKSPACE_ID"
  }'
```
