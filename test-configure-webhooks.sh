#!/bin/bash
# Configuration
BACKEND_URL="https://backend-production-3d08.up.railway.app"
WORKSPACE_ID="1"  # Replace with your workspace ID
ACCOUNT_SID="your_twilio_account_sid"  # Replace with your Twilio Account SID
AUTH_TOKEN="your_twilio_auth_token"    # Replace with your Twilio Auth Token

# Print test information
echo "Testing Twilio webhook configuration"
echo "Backend URL: $BACKEND_URL"
echo "Workspace ID: $WORKSPACE_ID"
echo "Account SID: ${ACCOUNT_SID:0:6}...${ACCOUNT_SID: -4}"
echo "Auth Token: ${AUTH_TOKEN:0:4}..."

# Call the API
echo -e "
Sending request to configure webhooks..."
curl -X POST "$BACKEND_URL/api/twilio/configure-from-credentials" \
  -H "Content-Type: application/json" \
  -d "{
    \"workspaceId\": \"$WORKSPACE_ID\",
