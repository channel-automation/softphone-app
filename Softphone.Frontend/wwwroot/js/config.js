// Configuration file for Softphone application
const config = {
    // Backend API base URL
    backendUrl: "https://backend-production-3d08.up.railway.app",
    
    // API endpoints
    endpoints: {
        token: "/voice/token",
        call: "/voice/call",
        incomingWebhook: "/voice/incoming",
        statusCallback: "/voice/status-callback"
    }
}; 