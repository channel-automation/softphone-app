using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("workspace")]
    public class WorkspaceBO : BaseModel
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

        [Column("name")]
        public string Name { get; set; }

        [Column("twilio_account_sid")]
        public string TwilioAccountSID { get; set; }

        [Column("twilio_auth_token")]
        public string TwilioAuthToken { get; set; }

        [Column("twilio_api_key")]
        public string TwilioAPIKey { get; set; }

        [Column("twilio_api_secret")]
        public string TwilioAPISecret { get; set; }

        [Column("twilio_twiml_app_sid")]
        public string TwilioTwiMLAppSID { get; set; }
    }
}
