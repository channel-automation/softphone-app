using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("workspace")]
    public class WorkspaceSearchBO : BaseModel
    {
        [PrimaryKey]
        public long id { get; set; }
        public DateTime created_at { get; set; }
        public string name { get; set; }
        public string twilio_account_sid { get; set; }
        public string twilio_api_key { get; set; }
    }
}
