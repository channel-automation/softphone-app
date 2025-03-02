# Database Structure Documentation

This document outlines the database structure for the Softphone application, which is hosted on Supabase.

## Tables Overview

The database consists of the following main tables:
- agent
- agent_phone
- user
- user_twilio_number
- workspace
- workspace_twilio_number

## Table Structures

### Agent Table

The agent table stores information about agents in the system.

| Column Name | Data Type | Is Nullable |
|-------------|-----------|-------------|
| id | bigint | YES |
| workspace_id | bigint | YES |
| full_name | text | YES |
| username | character varying | YES |
| created_at | timestamp with time zone | YES |
| twilio_numbers | text | YES |

### Workspace Table

The workspace table stores information about workspaces in the system.

| Column Name | Data Type | Is Nullable |
|-------------|-----------|-------------|
| id | bigint | NO |
| created_at | timestamp with time zone | NO |
| created_by | character varying | NO |
| modified_at | timestamp with time zone | NO |
| modified_by | character varying | NO |
| name | character varying | NO |
| twilio_account_sid | character varying | NO |
| twilio_auth_token | character varying | NO |
| channel_automation_api_key | character varying | NO |

### Agent Phone Relationship

The agent_phone table establishes relationships between agents and their phone numbers.

| Column Name | Description |
|-------------|-------------|
| id | Unique identifier for the agent-phone relationship |
| workspace_id | Reference to the workspace the agent belongs to |
| username | Username of the agent |
| full_name | Full name of the agent |
| twilio_number | The Twilio phone number assigned to the agent |

### Workspace Twilio Numbers

The workspace_twilio_number table stores Twilio phone numbers associated with each workspace.

| Column Name | Description |
|-------------|-------------|
| id | Unique identifier for the workspace-number relationship |
| workspace_id | Reference to the workspace |
| twilio_number | The Twilio phone number assigned to the workspace |

## Database Relationships

1. **Workspace to Agent**: One-to-many relationship. A workspace can have multiple agents.
   - Foreign key: `agent.workspace_id` references `workspace.id`

2. **Workspace to Twilio Numbers**: One-to-many relationship. A workspace can have multiple Twilio phone numbers.
   - Foreign key: `workspace_twilio_number.workspace_id` references `workspace.id`

3. **Agent to Phone Numbers**: One-to-many relationship. An agent can have multiple phone numbers.
   - The `agent_phone` table serves as a junction table that connects agents with their phone numbers.

## Notes

- The application is focused on inbound and outbound calling functionality.
- Twilio integration is used for handling phone calls.
- Each workspace has its own Twilio account credentials.
- Agents within a workspace can be assigned specific Twilio phone numbers.
