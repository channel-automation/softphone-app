﻿using Softphone.Models;

namespace Softphone.Services
{
    public interface IVoiceCallService
    {
        Task Create(VoiceCallBO model, string username);
        Task Create(VoiceCallCallbackBO model);
        Task Create(VoiceCallRecordingBO model);
        Task Update(VoiceCallBO model, string username);
        Task<VoiceCallBO?> FindCallbackCallSID(string callbackCallSID);
        Task<VoiceCallBO?> FindRecordingCallSID(string recordingCallSID);
        Task<VoiceCallBO?> FindNewInbound(string identity, string to);
        Task<VoiceCallBO?> FindNewOutbound(string from, string to);
        Task<VoiceCallBO?> FindRecentOutbound(string identity);
        Task<VoiceCallCallbackBO?> FindCallback(long voiceId, string callStatus);
    }
}
