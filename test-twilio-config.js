const axios = require('axios');
const { URLSearchParams } = require('url');

// Twilio credentials should be provided as environment variables
// Never hardcode credentials in source code
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACCOUNT_SID_PLACEHOLDER';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'AUTH_TOKEN_PLACEHOLDER';

// Base URL for your backend
const BASE_URL = 'https://backend-production-3d08.up.railway.app';

async function testTwilioConfig() {
  try {
    console.log('🔧 Testing Twilio configuration...');
    
    // Check if credentials are provided
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Error: Twilio credentials not provided as environment variables.');
      console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      console.error('Example: TWILIO_ACCOUNT_SID=[your-sid] TWILIO_AUTH_TOKEN=[your-token] node test-twilio-config.js');
      process.exit(1);
    }
    
    // 1. List phone numbers
    console.log('1. Listing phone numbers...');
    
    const numbersResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        }
      }
    );
    
    const numbersData = numbersResponse.data;
    
    if (!numbersData.incoming_phone_numbers || numbersData.incoming_phone_numbers.length === 0) {
      console.log('⚠️ No phone numbers found in your Twilio account');
      return;
    }
    
    console.log(`Found ${numbersData.incoming_phone_numbers.length} phone numbers:`);
    
    // Store phone numbers for later use
    const phoneNumbers = numbersData.incoming_phone_numbers;
    for (const number of phoneNumbers) {
      console.log(`- ${number.phone_number} (SID: ${number.sid})`);
      console.log(`  Voice URL: ${number.voice_url || 'Not set'}`);
      console.log(`  Voice Application SID: ${number.voice_application_sid || 'Not set'}`);
      console.log(`  SMS URL: ${number.sms_url || 'Not set'}`);
      console.log('');
    }
    
    // 2. Create or update TwiML App
    console.log('\n2. Creating/Updating TwiML App...');
    
    // Check if we already have a TwiML App
    const appsResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Applications.json`,
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        }
      }
    );
    
    const appsData = appsResponse.data;
    let twimlAppSid;
    
    if (appsData.applications && appsData.applications.length > 0) {
      // Use the first app
      const app = appsData.applications[0];
      twimlAppSid = app.sid;
      
      console.log(`Updating existing TwiML App: ${app.friendly_name} (${app.sid})`);
      
      // Update the app
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Applications/${app.sid}.json`,
        new URLSearchParams({
          'VoiceUrl': `${BASE_URL}/api/voice/outbound`,
          'VoiceMethod': 'POST',
          'StatusCallback': `${BASE_URL}/api/voice/status`,
          'StatusCallbackMethod': 'POST'
        }),
        {
          auth: {
            username: TWILIO_ACCOUNT_SID,
            password: TWILIO_AUTH_TOKEN
          }
        }
      );
      
      console.log('✅ TwiML App updated successfully');
    } else {
      // Create a new app
      console.log('Creating new TwiML App...');
      
      const createAppResponse = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Applications.json`,
        new URLSearchParams({
          'FriendlyName': 'Softphone App',
          'VoiceUrl': `${BASE_URL}/api/voice/outbound`,
          'VoiceMethod': 'POST',
          'StatusCallback': `${BASE_URL}/api/voice/status`,
          'StatusCallbackMethod': 'POST'
        }),
        {
          auth: {
            username: TWILIO_ACCOUNT_SID,
            password: TWILIO_AUTH_TOKEN
          }
        }
      );
      
      twimlAppSid = createAppResponse.data.sid;
      console.log(`✅ Created new TwiML App with SID: ${twimlAppSid}`);
    }
    
    // 3. Update phone numbers to use the TwiML App
    console.log('\n3. Updating phone numbers to use the TwiML App...');
    
    for (const number of phoneNumbers) {
      console.log(`Updating ${number.phone_number}...`);
      
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${number.sid}.json`,
        new URLSearchParams({
          'VoiceApplicationSid': twimlAppSid,
          'SmsUrl': `${BASE_URL}/api/twilio/webhook`
        }),
        {
          auth: {
            username: TWILIO_ACCOUNT_SID,
            password: TWILIO_AUTH_TOKEN
          }
        }
      );
      
      console.log(`✅ Updated ${number.phone_number} to use TwiML App ${twimlAppSid}`);
    }
    
    // 4. Verify the updates
    console.log('\n4. Verifying updates...');
    
    const updatedNumbersResponse = await axios.get(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      {
        auth: {
          username: TWILIO_ACCOUNT_SID,
          password: TWILIO_AUTH_TOKEN
        }
      }
    );
    
    const updatedNumbers = updatedNumbersResponse.data.incoming_phone_numbers;
    
    for (const number of updatedNumbers) {
      console.log(`- ${number.phone_number}`);
      console.log(`  Voice Application SID: ${number.voice_application_sid || 'Not set'}`);
      console.log(`  SMS URL: ${number.sms_url || 'Not set'}`);
      console.log('');
    }
    
    console.log('✅ Test completed successfully');
  } catch (error) {
    console.error('❌ Error testing Twilio configuration:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

testTwilioConfig();
