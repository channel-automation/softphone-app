using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Frontend.Models
{
    [Table("agent")]
    public class AgentBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("workspace_id")]
        public long WorkspaceId { get; set; }

        [Column("workspace_name")]
        public string WorkspaceName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("full_name")]
        public string FullName { get; set; }

        [Column("username")]
        public string Username { get; set; }

        [Column("twilio_numbers")]
        public string TwilioNumbers { get; set; }
    }
}
