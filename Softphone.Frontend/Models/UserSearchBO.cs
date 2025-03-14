using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Frontend.Models
{
    [Table("user_search")]
    public class UserSearchBO : BaseModel
    {
        [PrimaryKey]
        public long id { get; set; }
        public DateTime created_at { get; set; }
        public string workspace_name { get; set; }
        public long workspace_id { get; set; }
        public string first_name { get; set; }
        public string last_name { get; set; }
        public string username { get; set; }
        public string role { get; set; }
        public bool is_active { get; set; }
    }
}
