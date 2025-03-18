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

        [Column("call_inbound_webhook")]
        public string CallInboundWebhook { get; set; }

        [Column("call_outbound_webhook")]
        public string CallOutboundWebhook { get; set; }

        [Column("call_status_webhook")]
        public string CallStatusWebhook { get; set; }
    }
}
