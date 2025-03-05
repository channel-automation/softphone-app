// Configuration file for Softphone application
const config = {
    // Backend API base URL - always use railway in development and production
    backendUrl: "https://backend-production-3d08.up.railway.app",
    
    // API endpoints
    endpoints: {
        token: "/api/twilio/voice-token/{workspaceId}", // Voice token endpoint
        call: "/api/twilio/call/{workspaceId}", // Call endpoint
        status: "/api/twilio/status" // Call status endpoint
    },
    
    // Debug settings
    debug: true // Set to true to enable more verbose logging
};