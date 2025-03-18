using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("workspace_twilio_number_user")]
    public class WorkspaceTwilioNumberUserBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("workspace_twilio_number_id")]
        public long WorkspaceTwilioNumberId { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }
    }
}
