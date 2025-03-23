using Softphone.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
using static Supabase.Postgrest.Constants;

namespace Softphone.Services
{
    public class VoiceCallService : IVoiceCallService
    {
        private Client _client;

        public VoiceCallService(Client client)
        {
            _client = client;
        }

        public async Task Create(VoiceCallBO model, string username)
        {
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = username;
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;
            var response = await _client.From<VoiceCallBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            model.Id = (newModel == null ? 0 : newModel.Id);
        }

        public async Task Create(VoiceCallCallbackBO model)
        {
            model.CreatedAt = DateTime.Now;
            var response = await _client.From<VoiceCallCallbackBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            model.Id = (newModel == null ? 0 : newModel.Id);
        }

        public async Task Create(VoiceCallRecordingBO model)
        {
            model.CreatedAt = DateTime.Now;
            var response = await _client.From<VoiceCallRecordingBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            model.Id = (newModel == null ? 0 : newModel.Id);
        }

        public async Task Update(VoiceCallBO model, string username)
        {
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;
            await _client.From<VoiceCallBO>().Update(model);
        }

        public async Task<VoiceCallBO?> FindCallbackCallSID(string callbackCallSID)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.CallbackCallSID == callbackCallSID)
                .Get();

            return response.Models.SingleOrDefault();
        }

        public async Task<VoiceCallBO?> FindRecordingCallSID(string recordingCallSID)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.RecordingCallSID == recordingCallSID)
                .Get();

            return response.Models.SingleOrDefault();
        }

        public async Task<VoiceCallBO?> FindNewInbound(string identity, string to)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.Type == Helpers.CallType.Inbound)
                .Where(w => w.CallbackCallSID == "")
                .Where(w => w.Identity == identity)
                .Where(w => w.To == to)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Get();

            return response.Models.FirstOrDefault();
        }

        public async Task<VoiceCallBO?> FindNewOutbound(string from, string to)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.Type == Helpers.CallType.Outbound)
                .Where(w => w.CallbackCallSID == "")
                .Where(w => w.From == from)
                .Where(w => w.To == to)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Get();

            return response.Models.FirstOrDefault();
        }

        public async Task<VoiceCallBO?> FindRecentOutbound(string identity)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.Type == Helpers.CallType.Outbound)
                .Where(w => w.RecordingCallSID == "")
                .Where(w => w.Identity == identity)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Get();

            return response.Models.FirstOrDefault();
        }

        public async Task<VoiceCallCallbackBO?> FindCallback(long voiceId, string callStatus)
        {
            var response = await _client.From<VoiceCallCallbackBO>()
                .Where(w => w.VoiceId == voiceId)
                .Where(w => w.CallStatus == callStatus)
                .Get();

            return response.Models.SingleOrDefault();
        }

        public async Task<int> Count(DateTime dateAsOf, string type, long workspaceId, string identity)
        {
            var filters = new List<IPostgrestQueryFilter> { new Supabase.Postgrest.QueryFilter("identity", Operator.ILike, $"%{identity}%") };
            int response = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.CreatedAt <= dateAsOf)
                .Where(w => w.Type == type)
                .Where(w => w.WorkspaceId == workspaceId)
                .Count(CountType.Exact);

            return response;
        }

        public async Task<IList<int>> Durations(DateTime dateAsOf, long workspaceId, string identity)
        {
            var filters = new List<IPostgrestQueryFilter> { new Supabase.Postgrest.QueryFilter("identity", Operator.ILike, $"%{identity}%") };
            var response = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.Duration > 0)
                .Where(w => w.CreatedAt <= dateAsOf)
                .Where(w => w.WorkspaceId == workspaceId)
                .Select("duration")
                .Get();

            return response.Models.Select(w => w.Duration).ToList();
        }

        public async Task<IList<string>> Statuses(long workspaceId, string identity)
        {
            var filters = new List<IPostgrestQueryFilter> { new Supabase.Postgrest.QueryFilter("identity", Operator.ILike, $"%{identity}%") };
            var response = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.WorkspaceId == workspaceId)
                .Select("call_status")
                .Get();

            return response.Models.Select(w => w.CallStatus).ToList();
        }

        public async Task<IList<VoiceSearchBO>> GetByDate(long workspaceId, string identity, DateTime dateFrom, DateTime dateTo)
        {
            var filters = new List<IPostgrestQueryFilter> { new Supabase.Postgrest.QueryFilter("identity", Operator.ILike, $"%{identity}%") };
            var response = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.WorkspaceId == workspaceId)
                .Where(w => w.CreatedAt >= dateFrom && w.CreatedAt <= dateTo)
                .Order(w => w.CreatedAt, Ordering.Ascending)
                .Get();

            return response.Models.ToList();
        }

        public async Task<Paged<VoiceSearchBO>> Paging(int skip, int take, long workspaceId, string identity)
        {
            var filters = new List<IPostgrestQueryFilter> { new Supabase.Postgrest.QueryFilter("identity", Operator.ILike, $"%{identity}%") };
            var response = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.WorkspaceId == workspaceId)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Get();

            var paged = new Paged<VoiceSearchBO>();
            paged.RecordsTotal = response.Models.Count();

            var response2 = await _client.From<VoiceSearchBO>()
                .Or(filters)
                .Where(w => w.WorkspaceId == workspaceId)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }
    }
}
