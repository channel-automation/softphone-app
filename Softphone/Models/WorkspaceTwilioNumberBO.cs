﻿using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("workspace_twilio_number")]
    public class WorkspaceTwilioNumberBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("workspace_id")]
        public long WorkspaceId { get; set; }

        [Column("twilio_number")]
        public string TwilioNumber { get; set; }
    }
}
