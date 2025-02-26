using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Frontend.Models
{
    [Table("user")]
    public class UserTwilioNumberBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("user_id")]
        public long UserId { get; set; }

        [Column("workspace_twilio_number_id")]
        public long WorkspaceTwilioNumberId { get; set; }
    }
}
