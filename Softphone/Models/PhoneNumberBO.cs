using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("phone_number")]
    public class PhoneNumberBO : BaseModel
    {
        [PrimaryKey]
        public long id { get; set; }
        public long workspace_id { get; set; }
        public string workspace_name { get; set; }
        public string username { get; set; }
        public string full_name { get; set; }
        public string twilio_number { get; set; }
    }
}
