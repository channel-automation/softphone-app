# Lessons Learned

## Twilio Voice Integration

### TwiML App Configuration
- Twilio requires a TwiML app to be configured for browser-based calling
- Each workspace should have its own TwiML app for proper isolation
- The TwiML app SID needs to be stored in the database for token generation

### Phone Number Configuration
- Twilio phone numbers need to be configured to use the TwiML app for voice
- This configuration needs to happen automatically when users enter their Twilio credentials
- The `voiceApplicationSid` parameter is used to link a phone number to a TwiML app

### Token Generation
- Tokens for Twilio Client need to include the identity of the agent
- Tokens should include a VoiceGrant with the TwiML app SID
- Tokens expire, so they should be generated on-demand rather than stored

### Webhook URLs
- Webhook URLs must be publicly accessible
- Railway provides a reliable hosting solution with automatic HTTPS
- Base URL should be configurable via environment variables

## Database Design

### Workspace-Scoped Credentials
- Each workspace has its own Twilio credentials
- This allows for proper multi-tenancy
- Credentials should be stored securely in the database

### Agent-Number Relationships
- Agents can be assigned specific phone numbers
- This relationship needs to be tracked in the database
- Inbound calls should be routed to the appropriate agent based on the called number

## Express Server Architecture

### Route Organization
- Separating routes by functionality improves code organization
- Voice-specific routes should be in their own file
- Common helper functions should be extracted to avoid duplication

### Error Handling
- Proper error handling is critical for a reliable system
- All API endpoints should have try/catch blocks
- Error responses should be consistent and informative

### Socket.IO Integration
- Real-time updates for call status require Socket.IO
- Socket.IO needs to be properly initialized and exported
- Events should be emitted to notify clients of call status changes
