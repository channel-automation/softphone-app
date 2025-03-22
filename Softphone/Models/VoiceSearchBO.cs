using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("voice_search")]
    public class VoiceSearchBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

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

        [Column("duration")]
        public int Duration { get; set; }

        [Column("call_status")]
        public string CallStatus { get; set; }
    }
}
