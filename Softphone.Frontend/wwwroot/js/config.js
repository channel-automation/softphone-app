// Configuration file for Softphone application
const config = {
    // Backend API base URL - always use railway in development and production
    backendUrl: "https://backend-production-3d08.up.railway.app/api",
    
    // API endpoints
    endpoints: {
        token: "/twilio/voice/token",       // Voice token endpoint
        outbound: "/twilio/outbound-twiml", // Outbound call endpoint
        status: "/twilio/voice/status",     // Call status endpoint
        sms: "/twilio/send"                 // SMS endpoint
    },
    
    // Debug settings
    debug: true // Set to true to enable more verbose logging
};