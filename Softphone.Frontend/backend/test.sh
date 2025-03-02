#!/bin/bash

# Test script for Softphone backend voice functionality

# Load environment variables
source .env

# Set variables
WORKSPACE_ID=120  # Replace with your workspace ID
BASE_URL="http://localhost:3001"  # Use local server for testing

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Softphone Voice Backend${NC}"
echo "----------------------------------------"

# Test 1: Configure Twilio
echo -e "${YELLOW}Test 1: Configure Twilio${NC}"
echo "Enter your Twilio Account SID:"
read ACCOUNT_SID
echo "Enter your Twilio Auth Token:"
read AUTH_TOKEN

RESPONSE=$(curl -s -X POST $BASE_URL/api/configure-twilio \
  -H "Content-Type: application/json" \
  -d "{
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"accountSid\": \"$ACCOUNT_SID\",
    \"authToken\": \"$AUTH_TOKEN\"
  }")

if [[ $RESPONSE == *"success\":true"* ]]; then
  echo -e "${GREEN}✓ Twilio configuration successful${NC}"
  TWIML_APP_SID=$(echo $RESPONSE | grep -o '"twimlAppSid":"[^"]*' | sed 's/"twimlAppSid":"//')
  echo "TwiML App SID: $TWIML_APP_SID"
else
  echo -e "${RED}✗ Twilio configuration failed${NC}"
  echo "Response: $RESPONSE"
fi

echo "----------------------------------------"

# Test 2: Generate Token
echo -e "${YELLOW}Test 2: Generate Token${NC}"
AGENT_USERNAME="agent01"  # Replace with your agent username

RESPONSE=$(curl -s -X POST $BASE_URL/api/voice/token \
  -H "Content-Type: application/json" \
  -d "{
    \"workspaceId\": \"$WORKSPACE_ID\",
    \"identity\": \"$AGENT_USERNAME\"
  }")

if [[ $RESPONSE == *"success\":true"* ]]; then
  echo -e "${GREEN}✓ Token generation successful${NC}"
  TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo "Token: ${TOKEN:0:50}..." # Show first 50 chars of token
else
  echo -e "${RED}✗ Token generation failed${NC}"
  echo "Response: $RESPONSE"
fi

echo "----------------------------------------"

# Test 3: Test Outbound Call TwiML
echo -e "${YELLOW}Test 3: Test Outbound Call TwiML${NC}"
TO_NUMBER="+12345678900"  # Replace with a test phone number
FROM_NUMBER="+12624130047"  # Replace with one of your Twilio numbers

RESPONSE=$(curl -s -X POST $BASE_URL/api/voice/outbound \
  -H "Content-Type: application/json" \
  -d "{
    \"To\": \"$TO_NUMBER\",
    \"From\": \"$FROM_NUMBER\",
    \"WorkspaceId\": \"$WORKSPACE_ID\"
  }")

if [[ $RESPONSE == *"<Dial"* && $RESPONSE == *"<Number"* ]]; then
  echo -e "${GREEN}✓ Outbound call TwiML generation successful${NC}"
  echo "TwiML: $(echo $RESPONSE | head -50)..." # Show first part of TwiML
else
  echo -e "${RED}✗ Outbound call TwiML generation failed${NC}"
  echo "Response: $RESPONSE"
fi

echo "----------------------------------------"
echo -e "${GREEN}Testing complete!${NC}"
