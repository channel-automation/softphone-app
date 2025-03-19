using Softphone.Models;

namespace Softphone.Services
{
    public interface IVoiceCallService
    {
        Task Create(VoiceCallBO model, string username);
        Task Create(VoiceCallCallbackBO model);
        Task Create(VoiceCallRecordingBO model);
        Task Update(VoiceCallBO model, string username);
        Task<VoiceCallBO?> LastestOutbound(string from, string to);
        //Task<IList<StatusCallbackBO>> FindByTypeAndFrom(string type, string from);
        //Task<StatusCallbackBO?> LatestByTypeAndFrom(string type, string from);
        //Task<StatusCallbackBO?> LatestByCallSID(string callSID);
    }
}
