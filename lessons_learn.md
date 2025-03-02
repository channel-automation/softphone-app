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

## Dynamic Twilio Client Initialization

### Problem
- Initializing the Twilio client globally with environment variables causes deployment failures when those variables aren't set
- This approach doesn't work with our multi-tenant design where each workspace has its own Twilio credentials

### Solution
- Create Twilio clients on-demand using credentials fetched from the database
- Implement a helper function `getTwilioClient(workspaceId)` that:
  - Fetches the appropriate credentials from Supabase for the given workspace
  - Creates and returns a new Twilio client instance
  - Handles errors gracefully with proper logging

### Benefits
- No need for global Twilio environment variables
- Each workspace uses its own credentials
- More resilient application startup
- Better separation of concerns
- Improved error handling for credential-related issues

### Implementation Notes
- All Twilio API calls now use workspace-specific clients
- The server can start without any Twilio credentials configured
- Credentials are only fetched when needed for specific operations
- This approach aligns with the multi-tenant architecture of the application

## Path Resolution in Deployment Environments

### Problem
- The application was crashing in the deployment environment with `Error: Cannot find module './src/routes/twilio'`
- Local development paths don't always work in deployment environments
- Different environments may have different working directory structures
- Relative paths like `../../io` may work locally but fail in deployment

### Solution
- Restructured the application to have consistent path resolution:
  - Moved route files to a top-level `routes` directory
  - Moved utility files like `io.js` and `supabase.js` to the root directory
  - Updated import paths in all files to use the correct relative paths
  - Used `./routes/` instead of `./src/routes/` for imports
  - Simplified relative paths to use single-level navigation (`../io` instead of `../../io`)

### Benefits
- More consistent file structure across environments
- Improved deployment reliability
- Reduced dependency on specific directory structures
- Easier to maintain and understand codebase organization

### Implementation Notes
- Always test path resolution in both local and deployment environments
- Use relative paths that are robust to different working directory contexts
- When possible, structure your application with a flat or shallow hierarchy
- Consider using path resolution utilities for more complex applications
- Remember that in deployment environments like Railway, files might be in different locations
- Understand the deployment environment's file structure before designing import paths

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
