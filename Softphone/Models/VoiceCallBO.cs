using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("voice_call")]
    public class VoiceCallBO : BaseModel
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

        [Column("workspace_id")]
        public long WorkspaceId { get; set; }

        [Column("identity")]
        public string Identity { get; set; }

        [Column("type")]
        public string Type { get; set; }

        [Column("from")]
        public string From { get; set; }

        [Column("to")]
        public string To { get; set; }

        [Column("duration_seconds")]
        public decimal DurationSeconds { get; set; }

        [Column("recording_call_sid")]
        public string RecordingCallSID { get; set; }
    }
}
