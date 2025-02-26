using Softphone.Frontend.Models;
using Supabase;

namespace Softphone.Frontend.Services
{
    public class WorkspaceService : IWorkspaceService
    {
        private Client _client;

        public WorkspaceService(Client client)
        {
            _client = client;
        }

        public async Task<long> Create(WorkspaceBO model, string username)
        {
            model.CreatedBy = username;
            model.CreatedAt = DateTime.Now;
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;

            var response = await _client.From<WorkspaceBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            return newModel == null ? 0 : newModel.Id;
        }

        public async Task Update(WorkspaceBO model, string username)
        {
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;

            var response = await _client.From<WorkspaceBO>()
                .Where(w => w.Id == model.Id)
                .Set(w => w.ModifiedBy, model.ModifiedBy)
                .Set(w => w.ModifiedAt, model.ModifiedAt)
                .Set(w => w.TwilioAccountSID, model.TwilioAccountSID)
                .Set(w => w.TwilioAuthToken, model.TwilioAuthToken)
                .Set(w => w.ChannelAutomationAPIKey, model.ChannelAutomationAPIKey)
                .Update();
        }

        public async Task<WorkspaceBO?> FindById(long id)
        {
            var response = await _client.From<WorkspaceBO>().Where(w => w.Id == id).Get();
            return response.Models.FirstOrDefault();
        }
    }
}
