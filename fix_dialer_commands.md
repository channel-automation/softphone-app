# SQL Commands to Fix Dialer Issues

## 1. Update the TwiML App SID in the workspace table

```sql
UPDATE workspace 
SET twilio_twiml_app_sid = 'AP9fc913e21acfd8774aaffef012ba1b0a' 
WHERE id = 118;
```

## 2. Add the phone number to the agent_phone table

```sql
INSERT INTO agent_phone (id, workspace_id, full_name, twilio_number, username) 
VALUES (DEFAULT, 118, 'Developer', '+16573857999', 'developer');
```

## 3. Add the phone number to the workspace_twilio_number table

```sql
INSERT INTO workspace_twilio_number (id, workspace_id, twilio_number, friendly_name) 
VALUES (DEFAULT, 118, '+16573857999', 'Developer Phone');
```

## 4. Verify the configuration

```sql
-- Check if the TwiML App SID is set correctly
SELECT id, twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid 
FROM workspace 
WHERE id = 118;

-- Check if the phone number is in the agent_phone table
SELECT * 
FROM agent_phone 
WHERE workspace_id = 118;

-- Check if the phone number is in the workspace_twilio_number table
SELECT * 
FROM workspace_twilio_number 
WHERE workspace_id = 118;
```

## Additional Notes

1. After running these SQL commands, refresh the page to see if the "Place Call" button is enabled.
2. If the button is still not enabled, check the browser console for any errors.
3. Make sure the Twilio Account SID and Auth Token are correct in the workspace table.
4. Verify that the TwiML App is properly configured in the Twilio console with the correct webhook URLs. 