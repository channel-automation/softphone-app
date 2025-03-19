﻿using System.Text.Json.Serialization;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace Softphone.Models
{
    [Table("voice_call_recording")]
    public class VoiceCallRecordingBO : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }

        [Column("voice_id")]
        public long VoiceId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("recording_status")]
        public string RecordingStatus { get; set; }

        [Column("recording_url")]
        public string RecordingUrl { get; set; }

        [JsonPropertyName("payload")]
        [Column("payload")]
        public object Payload { get; set; }
    }
}
