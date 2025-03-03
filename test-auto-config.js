/**
 * Test script for the automatic Twilio configuration feature
 * 
 * This script tests the /api/twilio/configure-from-credentials endpoint
 * to verify that it correctly configures a Twilio account.
 * 
 * Usage:
 * node test-auto-config.js <workspaceId> <accountSid> <authToken>
 */

const axios = require('axios');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error('Usage: node test-auto-config.js <workspaceId> <accountSid> <authToken>');
  process.exit(1);
}

const [workspaceId, accountSid, authToken] = args;

// Base URL for the API
const baseUrl = process.env.API_URL || 'https://backend-production-3d08.up.railway.app';
const configureUrl = `${baseUrl}/api/twilio/configure-from-credentials`;

async function testAutoConfiguration() {
  console.log('🔍 Testing automatic Twilio configuration...');
  console.log(`📋 Workspace ID: ${workspaceId}`);
  console.log(`📋 Account SID: ${accountSid.substring(0, 10)}...`);
  console.log(`📋 Auth Token: ${authToken.substring(0, 5)}...`);
  
  try {
    console.log(`🚀 Sending request to ${configureUrl}`);
    
    const response = await axios.post(configureUrl, {
      workspaceId,
      accountSid,
      authToken
    });
    
    console.log('\n✅ Configuration successful!');
    console.log('📊 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.twimlAppSid) {
      console.log(`\n📱 TwiML App SID: ${response.data.twimlAppSid}`);
    }
    
    if (response.data.phoneNumbers) {
      console.log(`📞 Configured ${response.data.phoneNumbers} phone numbers`);
    }
    
    console.log('\n🔍 Next steps:');
    console.log('1. Verify in Twilio Console that the TwiML app has been created/updated');
    console.log('2. Check that phone numbers have been configured with the correct webhooks');
    console.log('3. Test making a call to verify the configuration is working');
    
  } catch (error) {
    console.error('\n❌ Configuration failed!');
    
    if (error.response) {
      console.error('📊 Response:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('📊 Error:');
      console.error(error.message);
    }
    
    console.log('\n🔍 Troubleshooting steps:');
    console.log('1. Verify that the Twilio credentials are correct');
    console.log('2. Check that the workspace ID exists in the database');
    console.log('3. Ensure the backend API is running and accessible');
    console.log('4. Check the backend logs for more detailed error information');
  }
}

// Run the test
testAutoConfiguration();
