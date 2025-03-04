// Configuration file for Softphone application
const config = {
    // Backend API base URL - always use railway in development and production
    backendUrl: "https://backend-production-3d08.up.railway.app/api",
    
    // API endpoints
    endpoints: {
        token: "/twilio/voice-token",  // Voice token endpoint
        call: "/twilio/call",          // Call endpoint
        sms: "/twilio/send"
    },
    
    // Debug settings
    debug: true // Set to true to enable more verbose logging
};