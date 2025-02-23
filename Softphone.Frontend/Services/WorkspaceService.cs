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

        public async Task<long> Create(WorkspaceModel model, string username)
        {
            model.CreatedBy = username;
            model.CreatedAt = DateTime.Now;
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;

            var response = await _client.From<WorkspaceModel>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            return newModel == null ? 0 : newModel.Id;
        }

        public async Task<WorkspaceModel?> FindById(long id)
        {
            var response = await _client.From<WorkspaceModel>().Get();
            return response.Models.FirstOrDefault();
        }
    }
}
