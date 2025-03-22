using Softphone.Models;
using Supabase;

namespace Softphone.Services
{
    public class SettingsService : ISettingsService
    {
        private Client _client;

        public SettingsService(Client client)
        {
            _client = client;
        }

        public async Task Create(SettingsBO model, string username)
        {
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = username;
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;
            var response = await _client.From<SettingsBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            model.Id = (newModel == null ? 0 : newModel.Id);
        }

        public async Task Update(SettingsBO model, string username)
        {
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;
            await _client.From<SettingsBO>().Update(model);
        }

        public async Task<SettingsBO?> Get()
        {
            var response = await _client.From<SettingsBO>().Get();
            return response.Models.FirstOrDefault();
        }
    }
}
