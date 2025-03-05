-- Create agent_phone table
CREATE TABLE IF NOT EXISTS agent_phone (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    full_name VARCHAR(255),
    twilio_number VARCHAR(20) NOT NULL,
    username VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id)
);

-- Create workspace_twilio_number table
CREATE TABLE IF NOT EXISTS workspace_twilio_number (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    twilio_number VARCHAR(20) NOT NULL,
    friendly_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id)
);

-- Insert phone number for Benjie into agent_phone table
INSERT INTO agent_phone (
    workspace_id, 
    full_name, 
    twilio_number, 
    username
) VALUES (
    127, 
    'Benjie', 
    '+16573857999', 
    'benjie'
);

-- Insert phone number into workspace_twilio_number table
INSERT INTO workspace_twilio_number (
    workspace_id, 
    twilio_number, 
    friendly_name
) VALUES (
    127, 
    '+16573857999', 
    'Benjie Phone'
);

-- Verify the data
SELECT * FROM agent_phone WHERE workspace_id = 127;
SELECT * FROM workspace_twilio_number WHERE workspace_id = 127;

-- Check if TwiML App SID is set
SELECT id, twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid 
FROM workspace 
WHERE id = 127; 