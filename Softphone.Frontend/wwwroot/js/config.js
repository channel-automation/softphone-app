// Configuration file for Softphone application
const config = {
    // Backend API base URL - always use railway in development and production
    backendUrl: "https://backend-production-3d08.up.railway.app",
    
    // API endpoints
    endpoints: {
        token: "/api/twilio/voice-token",  // Updated to new voice token endpoint
        call: "/api/twilio/call",          // Updated to Twilio route
        incomingWebhook: "/api/twilio/incoming",
        statusCallback: "/api/twilio/status"
    }
};