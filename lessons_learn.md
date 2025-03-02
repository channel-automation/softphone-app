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

## Custom Domain Configuration for Webhooks

### Problem
- Railway provides a default domain for deployments, but it may change with new deployments
- Twilio webhooks need stable, consistent URLs to function properly
- Hard-coded URLs in the application code can lead to failures when the deployment environment changes

### Solution
- Set up a custom domain in Railway for the backend service
- Update all webhook URLs in the application to use this custom domain
- Store the base URL as an environment variable for flexibility
- Update CORS settings to allow the custom domain

### Benefits
- Stable webhook URLs that don't change between deployments
- Improved reliability for Twilio integrations
- Better separation of environment-specific configuration
- Easier to manage and update webhook endpoints

### Implementation Notes
- The custom domain (https://backend-production-3608.up.railway.app) is configured in Railway's settings
- Updated the BASE_URL environment variable in .env.example
- Added the custom domain to CORS allowed origins
- Updated fallback URLs in the code to use the custom domain
- Created a test script to verify and update Twilio webhook configurations

## Twilio Webhook Configuration

### Direct API Configuration vs. Application Logic
- While our application has logic to configure Twilio resources, direct API access is sometimes more reliable
- For initial setup or troubleshooting, using Twilio's REST API directly provides more control
- A combination approach works best: application logic for normal operations, direct API for setup and verification

### Key Webhook Endpoints
- Voice URL for outbound calls: `/api/voice/outbound`
- Status callback URL: `/api/voice/status`
- SMS webhook URL: `/api/twilio/webhook`
- Inbound voice URL: `/api/voice/inbound`

### Implementation Notes
- All webhook URLs should use the custom domain
- TwiML Apps should be configured with the correct voice URL and status callback
- Phone numbers should be linked to the TwiML App using the `voiceApplicationSid` parameter
- SMS URLs should be configured separately from voice URLs
- Always verify webhook configurations after updates

## Testing and Verification

### Importance of Verification
- Always verify that webhook configurations are correctly applied
- Check both the TwiML App configuration and the phone number configuration
- Test the full communication flow from end to end

### Verification Tools
- Created a test script that:
  - Lists all phone numbers and their current configurations
  - Updates or creates a TwiML App with the correct webhook URLs
  - Updates all phone numbers to use the TwiML App
  - Verifies that the changes were applied correctly

### Lessons Learned
- Twilio's API provides a reliable way to verify and update configurations
- Regular verification helps catch configuration drift
- Automating the verification process improves reliability
- Always check both the TwiML App and phone number configurations
