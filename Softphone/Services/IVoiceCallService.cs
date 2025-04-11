using Softphone.Models;

namespace Softphone.Services
{
    public interface IVoiceCallService
    {
        Task Create(VoiceCallBO model, string username);
        Task Create(VoiceCallCallbackBO model);
        Task Create(VoiceCallRecordingBO model);
        Task Update(VoiceCallBO model, string username);
        Task<VoiceCallBO?> FindById(long id);
        Task<VoiceCallBO?> FindCallbackCallSID(string callbackCallSID);
        Task<VoiceCallBO?> FindRecordingCallSID(string recordingCallSID);
        Task<VoiceCallBO?> FindNewInbound(string identity, string to);
        Task<VoiceCallBO?> FindNewOutbound(string from, string to);
        Task<VoiceCallBO?> FindRecentOutbound(string identity);
        Task<VoiceCallCallbackBO?> FindCallback(long voiceId, string callStatus);
        Task<int> Count(DateTime dateAsOf, string type, long workspaceId, string identity);
        Task<IList<int>> Durations(DateTime dateAsOf, long workspaceId, string identity);
        Task<IList<string>> Statuses(long workspaceId, string identity);
        Task<IList<VoiceSearchBO>> GetByDate(long workspaceId, string identity, DateTime dateFrom, DateTime dateTo);
        Task<Paged<VoiceSearchBO>> Paging(int skip, int take, long workspaceId, string identity);
        Task<VoiceSearchBO?> GetLatest(string type, string identity);
    }
}
