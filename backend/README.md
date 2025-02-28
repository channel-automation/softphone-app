# Softphone Backend

This is the backend server for the Softphone application. It provides the necessary APIs for handling Twilio voice calls, both inbound and outbound.

## Features

- Token generation for Twilio Voice SDK
- Inbound call handling
- Outbound call handling
- Call recording
- Call status tracking
- Twilio account validation
- Phone number management
- Webhook configuration

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   # Server Configuration
   PORT=8000
   WEBHOOK_BASE_URL=https://your-railway-app-url.up.railway.app
   ALLOWED_ORIGINS=http://localhost:5252,https://localhost:7245,https://your-frontend-railway-app-url.up.railway.app

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_API_KEY=your_api_key
   TWILIO_API_SECRET=your_api_secret
   TWILIO_TWIML_APP_SID=your_twiml_app_sid
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

3. Run the server:
   ```
   npm start
   ```

## API Endpoints

### Token Generation
- `GET /api/token` - Generate a Twilio Voice SDK token

### Voice Webhooks
- `POST /api/voice` - Handle incoming calls
- `POST /api/voice/outbound` - Handle outgoing calls
- `POST /api/voice/status` - Handle call status updates
- `POST /api/voice/recording-status` - Handle recording status updates

### Twilio Account Management
- `POST /api/twilio/validate` - Validate Twilio credentials
- `POST /api/twilio/phone-numbers` - Get available phone numbers
- `POST /api/twilio/configure-webhooks` - Configure webhooks for a phone number

### Utility Endpoints
- `GET /api/base-url` - Get the base URL for webhooks
- `GET /health` - Health check endpoint for Railway

## Deployment

This backend is configured for deployment on Railway. The following files are included for Railway deployment:
- `railway.toml` - Railway configuration
- `nixpacks.toml` - Nixpacks configuration
- `.npmrc` - NPM configuration

## Integration with Frontend

To integrate with the ASP.NET Core frontend:

1. Update the frontend JavaScript to call the backend API endpoints
2. Configure CORS in the backend to allow requests from the frontend
3. Deploy both the frontend and backend to Railway
4. Update the environment variables in both applications to point to each other 