using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("voice_call_callback")]
    public class VoiceCallCallbackBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("voice_id")]
        public long VoiceId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("call_sid")]
        public string CallSID { get; set; }

        [Column("call_status")]
        public string CallStatus { get; set; }

        [JsonPropertyName("payload")]
        [Column("payload")]
        public object Payload { get; set; }
    }
}
