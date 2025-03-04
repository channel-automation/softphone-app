using Softphone.Frontend.Models;
using Supabase;
using Microsoft.Extensions.Logging;

namespace Softphone.Frontend.Services
{
    public class WorkspaceService : IWorkspaceService
    {
        private Client _client;
        private readonly ILogger<WorkspaceService> _logger;

        public WorkspaceService(Client client, ILogger<WorkspaceService> logger)
        {
            _client = client;
            _logger = logger;
        }

        public async Task<long> Create(WorkspaceBO model, string username)
        {
            model.CreatedBy = username;
            model.CreatedAt = DateTime.Now;
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;

            try
            {
                var response = await _client.From("workspace").Insert(model);
                var newModel = response.Models.FirstOrDefault();
                return newModel == null ? 0 : newModel.Id;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating workspace");
                throw;
            }
        }

        public async Task Update(WorkspaceBO model, string username)
        {
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;

            try
            {
                var response = await _client.From("workspace")
                    .Where(w => w.Id == model.Id)
                    .Set(w => w.ModifiedBy, model.ModifiedBy)
                    .Set(w => w.ModifiedAt, model.ModifiedAt)
                    .Set(w => w.TwilioAccountSID, model.TwilioAccountSID)
                    .Set(w => w.TwilioAuthToken, model.TwilioAuthToken)
                    .Set(w => w.ChannelAutomationAPIKey, model.ChannelAutomationAPIKey)
                    .Update();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating workspace");
                throw;
            }
        }

        public async Task<WorkspaceBO?> FindById(long id)
        {
            try
            {
                var response = await _client.From("workspace").Where(w => w.Id == id).Get();
                return response.Models.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding workspace by id");
                throw;
            }
        }

        public async Task<IList<WorkspaceTwilioNumberBO>> GetTwilioNumbers(long id)
        {
            try
            {
                var response = await _client.From("user_twilio_number")
                    .Where(w => w.WorkspaceId == id)
                    .Get();

                return response.Models.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting twilio numbers");
                throw;
            }
        }
    }
}
