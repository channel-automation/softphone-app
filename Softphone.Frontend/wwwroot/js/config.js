// Configuration file for Softphone application
const config = {
    // Backend API base URL
    backendUrl: "https://backend-production-3d08.up.railway.app",
    
    // API endpoints
    endpoints: {
        token: "/api/voice/token",
        call: "/api/voice/call",
        incomingWebhook: "/api/voice/incoming",
        statusCallback: "/api/voice/status-callback"
    }
}; 