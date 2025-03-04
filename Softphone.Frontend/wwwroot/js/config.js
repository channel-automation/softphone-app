// Configuration file for Softphone application
const config = {
    // Backend API base URL - always use railway in development and production
    backendUrl: "https://backend-production-3d08.up.railway.app",
    
    // API endpoints
    endpoints: {
        token: "/api/twilio/voice-token",  // Voice token endpoint
        call: "/api/twilio/call",          // Call endpoint
        incomingWebhook: "/api/twilio/incoming",
        statusCallback: "/api/twilio/status"
    }
};