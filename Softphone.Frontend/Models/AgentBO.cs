using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Frontend.Models
{
    [Table("agent")]
    public class AgentBO : BaseModel
    {
        [PrimaryKey("id")]
        public long id { get; set; }

        [Column("created_at")]
        public DateTime created_at { get; set; }

        //[Column("full_name")]
        public string full_name { get; set; }

        //[Column("username")]
        public string username { get; set; }

        //[Column("twilio_numbers")]
        public string twilio_numbers { get; set; }
    }
}
