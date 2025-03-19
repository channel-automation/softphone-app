using Microsoft.VisualBasic;
using Softphone.Models;
using Supabase;
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

        public async Task<VoiceCallBO?> FindByCallbackCallSID(string callbackCallSID)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.CallbackCallSID == callbackCallSID)
                .Get();

            return response.Models.SingleOrDefault();
        }

        public async Task<VoiceCallBO?> FindNewOutbound(string from, string to)
        {
            var response = await _client.From<VoiceCallBO>()
                .Where(w => w.Type == Helpers.CallType.Outbound)
                .Where(w => w.CallbackCallSID == string.Empty)
                .Where(w => w.From == from)
                .Where(w => w.To == to)
                .Order(w => w.CreatedAt, Ordering.Descending)
                .Get();

            return response.Models.FirstOrDefault();
        }

        

        //public async Task<StatusCallbackBO?> LatestByTypeAndFrom(string type, string from)
        //{
        //    var response = await _client.From<StatusCallbackBO>()
        //        .Where(w => w.Type == type)
        //        .Where(w => w.FromNumber == from)
        //        .Order(w => w.CreatedAt, Ordering.Descending)
        //        .Get();

        //    return response.Models.FirstOrDefault();
        //}

        //public async Task<StatusCallbackBO?> LatestByCallSID(string callSID)
        //{
        //    var response = await _client.From<StatusCallbackBO>()
        //        .Where(w => w.CallSID == callSID)
        //        .Order(w => w.CreatedAt, Ordering.Descending)
        //        .Get();

        //    return response.Models.FirstOrDefault();
        //}
    }
}
