using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("settings")]
    public class SettingsBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("created_by")]
        public string CreatedBy { get; set; }

        [Column("modified_at")]
        public DateTime ModifiedAt { get; set; }

        [Column("modified_by")]
        public string ModifiedBy { get; set; }

        [Column("channel_automation_api_key")]
        public string ChannelAutomationAPIKey { get; set; }

        [Column("inbound_voice_endpoint")]
        public string InboundVoiceEndpoint { get; set; }

        [Column("outbound_voice_endpoint")]
        public string OutboundVoiceEndpoint { get; set; }

        [Column("inbound_call_status_endpoint")]
        public string InboundCallStatusEndpoint { get; set; }

        [Column("outbound_call_status_endpoint")]
        public string OutboundCallStatusEndpoint { get; set; }
    }
}
