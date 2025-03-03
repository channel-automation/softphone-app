# Softphone App - Administrator Guide

## Overview

This document provides instructions for administrators to set up and configure the Softphone application with Twilio for client use. The Softphone app is a multi-tenant application that allows each workspace to have its own Twilio configuration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Twilio Account Setup](#twilio-account-setup)
3. [Database Configuration](#database-configuration)
4. [Webhook Configuration](#webhook-configuration)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the Softphone app, ensure you have:

- A Twilio account with voice capabilities
- Access to the Supabase database
- Administrative access to the Softphone application
- The backend API deployed and running (current URL: `https://backend-production-3d08.up.railway.app`)

## Twilio Account Setup

### 1. Create a Twilio Account

If you don't already have a Twilio account:

1. Go to [Twilio's website](https://www.twilio.com/) and sign up for an account
2. Verify your email address and phone number
3. Complete the account setup process

### 2. Purchase a Phone Number

1. In the Twilio console, navigate to "Phone Numbers" > "Manage" > "Buy a Number"
2. Search for a number with voice capabilities
3. Purchase the number
4. Note down the phone number for later use

### 3. Locate Your Twilio Credentials

You'll need the following credentials from your Twilio account:

1. **Account SID**: Found on the Twilio Console dashboard
2. **Auth Token**: Found on the Twilio Console dashboard
3. **Phone Number(s)**: The Twilio phone number(s) you purchased

## Database Configuration

The Softphone app uses several database tables to manage Twilio integration. Here's what you need to configure:

### 1. Workspace Table

The `workspace` table stores the main Twilio credentials:

| Column | Description |
|--------|-------------|
| id | Unique identifier for the workspace |
| twilio_account_sid | The Twilio Account SID |
| twilio_auth_token | The Twilio Auth Token |
| twilio_twiml_app_sid | The TwiML App SID (will be auto-generated) |

### 2. Workspace Twilio Number Table

The `workspace_twilio_number` table stores the phone numbers associated with a workspace:

| Column | Description |
|--------|-------------|
| id | Unique identifier for the record |
| workspace_id | Foreign key to the workspace table |
| twilio_number | The Twilio phone number (in E.164 format, e.g., +15551234567) |
| friendly_name | A user-friendly name for the phone number |

### 3. Agent Phone Table

The `agent_phone` table maps phone numbers to agents for the dialer UI:

| Column | Description |
|--------|-------------|
| id | Unique identifier for the record |
| agent_id | Foreign key to the agent table |
| phone_number | The Twilio phone number (in E.164 format) |
| friendly_name | A user-friendly name for the phone number |

## Webhook Configuration

The Softphone app requires several webhooks to be configured in Twilio. These can be set up automatically through the application UI or manually in the Twilio console.

### Automatic Configuration (Recommended)

1. Log in to the Softphone application as an administrator
2. Navigate to the Configuration page
3. Enter your Twilio Account SID and Auth Token
4. Click "Save" to automatically configure the TwiML app and webhooks

### Manual Configuration

If you prefer to configure Twilio manually, follow these steps:

#### 1. Create a TwiML App

1. In the Twilio console, navigate to "Explore Products" > "Voice" > "TwiML Apps"
2. Click "Create new TwiML App"
3. Enter a friendly name (e.g., "Softphone-{workspaceId}")
4. Configure the Voice Request URL: `https://backend-production-3d08.up.railway.app/api/voice/inbound`
5. Configure the Status Callback URL: `https://backend-production-3d08.up.railway.app/api/voice/status`
6. Save the TwiML App
7. Note the TwiML App SID for later use

#### 2. Configure Phone Numbers

For each phone number in your Twilio account:

1. In the Twilio console, navigate to "Phone Numbers" > "Manage" > "Active Numbers"
2. Click on the phone number you want to configure
3. Under "Voice & Fax", set the following:
   - **Configure with**: Select "TwiML App"
   - **TwiML App**: Select the TwiML App you created earlier
   - **A Call Comes In**: Make sure it's set to use the TwiML App
   - **Status Callback URL**: `https://backend-production-3d08.up.railway.app/api/voice/status`

#### 3. Update Database with TwiML App SID

After creating the TwiML App, update the `workspace` table with the TwiML App SID:

```sql
UPDATE workspace
SET twilio_twiml_app_sid = 'YOUR_TWIML_APP_SID'
WHERE id = YOUR_WORKSPACE_ID;
```

## Endpoint Reference

The Softphone app uses the following endpoints for Twilio integration:

| Endpoint | URL | Purpose |
|----------|-----|---------|
| Token | `/api/voice/token` | Generates Twilio Client tokens for browser-based calling |
| Outbound Call | `/api/voice/outbound` | Initiates outbound calls |
| Inbound Webhook | `/api/voice/inbound` | Handles incoming calls |
| Status Callback | `/api/voice/status` | Tracks call status changes |

### Endpoint Details

#### Token Endpoint

- **URL**: `https://backend-production-3d08.up.railway.app/api/voice/token`
- **Method**: POST
- **Parameters**:
  - `workspaceId`: The ID of the workspace
  - `identity`: The username of the agent
- **Purpose**: Generates a token for the Twilio Client SDK to enable browser-based calling

#### Outbound Call Endpoint

- **URL**: `https://backend-production-3d08.up.railway.app/api/voice/outbound`
- **Method**: POST
- **Parameters**:
  - `To`: The destination phone number (in E.164 format)
  - `From`: The caller ID phone number (in E.164 format)
  - `WorkspaceId`: The ID of the workspace
  - `identity`: The username of the agent
- **Purpose**: Initiates an outbound call using the workspace's Twilio credentials

#### Inbound Webhook

- **URL**: `https://backend-production-3d08.up.railway.app/api/voice/inbound`
- **Method**: POST
- **Parameters**: Automatically provided by Twilio
- **Purpose**: Handles incoming calls and routes them to the appropriate agent

#### Status Callback

- **URL**: `https://backend-production-3d08.up.railway.app/api/voice/status`
- **Method**: POST
- **Parameters**: Automatically provided by Twilio
- **Purpose**: Tracks call status changes (ringing, in-progress, completed, etc.)

## Testing the Integration

After configuring Twilio, follow these steps to test the integration:

### 1. Test Token Generation

1. Log in to the Softphone application as an agent
2. Open the browser console (F12)
3. Verify that a token is successfully generated (look for "Token updated" messages)

### 2. Test Outbound Calls

1. In the dialer UI, enter a phone number
2. Select a "From" number from the dropdown
3. Click "Place Call"
4. Verify that the call is initiated and connected

### 3. Test Inbound Calls

1. Call one of your Twilio phone numbers from an external phone
2. Verify that the call is received in the Softphone application
3. Accept the call and verify two-way audio

## Troubleshooting

### Common Issues

#### Token Generation Fails

- Verify that the Twilio Account SID and Auth Token are correct
- Check that the TwiML App SID is properly stored in the database
- Ensure the workspace ID is correctly passed to the token endpoint

#### Outbound Calls Fail

- Check the browser console for error messages
- Verify that the "From" number is a valid Twilio number in your account
- Ensure the workspace has the correct Twilio credentials

#### Inbound Calls Not Received

- Verify that the phone number is configured with the correct TwiML App
- Check that the Voice URL is set correctly
- Ensure the agent is logged in and available to receive calls

#### Call Status Not Updating

- Verify that the Status Callback URL is configured correctly
- Check that the backend API is accessible from Twilio's servers

### Logs and Debugging

The backend API logs detailed information about call events. To troubleshoot issues:

1. Check the backend logs for error messages
2. Look for log entries with the following prefixes:
   - `📞 ===== INBOUND CALL RECEIVED =====` for incoming calls
   - `📞 ===== CALL STATUS UPDATE =====` for call status changes
   - `❌ ===== INBOUND CALL ERROR =====` for errors during incoming calls

## Additional Resources

- [Twilio Voice Documentation](https://www.twilio.com/docs/voice)
- [Twilio TwiML Documentation](https://www.twilio.com/docs/voice/twiml)
- [Twilio Client JavaScript SDK Documentation](https://www.twilio.com/docs/voice/client/javascript) 