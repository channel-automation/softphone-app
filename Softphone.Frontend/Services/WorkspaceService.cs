using Softphone.Frontend.Models;
using Supabase;
using Microsoft.Extensions.Logging;
using Supabase.Postgrest.Models;
using Supabase.Postgrest.Attributes;

namespace Softphone.Frontend.Services
{
    public class WorkspaceService : IWorkspaceService
    {
        private readonly Client _client;
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
                var response = await _client.From<Workspace>()
                    .Insert(new[] { new Workspace {
                        CreatedBy = model.CreatedBy,
                        CreatedAt = model.CreatedAt,
                        ModifiedBy = model.ModifiedBy,
                        ModifiedAt = model.ModifiedAt,
                        TwilioAccountSID = model.TwilioAccountSID,
                        TwilioAuthToken = model.TwilioAuthToken,
                        ChannelAutomationAPIKey = model.ChannelAutomationAPIKey
                    }});
                var newModel = response.Models.FirstOrDefault();
                return newModel?.Id ?? 0;
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
                await _client.From<Workspace>()
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
                var response = await _client.From<Workspace>()
                    .Where(w => w.Id == id)
                    .Get();
                var model = response.Models.FirstOrDefault();
                if (model == null) return null;

                return new WorkspaceBO {
                    Id = model.Id,
                    CreatedBy = model.CreatedBy,
                    CreatedAt = model.CreatedAt ?? DateTime.MinValue,
                    ModifiedBy = model.ModifiedBy,
                    ModifiedAt = model.ModifiedAt ?? DateTime.MinValue,
                    TwilioAccountSID = model.TwilioAccountSID,
                    TwilioAuthToken = model.TwilioAuthToken,
                    ChannelAutomationAPIKey = model.ChannelAutomationAPIKey
                };
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
                var response = await _client.From<WorkspaceTwilioNumber>()
                    .Where(w => w.WorkspaceId == id)
                    .Get();

                return response.Models.Select(m => new WorkspaceTwilioNumberBO {
                    Id = m.Id,
                    WorkspaceId = m.WorkspaceId,
                    TwilioNumber = m.TwilioNumber
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting twilio numbers");
                throw;
            }
        }
    }

    [Table("workspace")]
    public class Workspace : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }
        [Column("created_by")]
        public string CreatedBy { get; set; } = "";
        [Column("created_at")]
        public DateTime? CreatedAt { get; set; }
        [Column("modified_by")]
        public string ModifiedBy { get; set; } = "";
        [Column("modified_at")]
        public DateTime? ModifiedAt { get; set; }
        [Column("twilio_account_sid")]
        public string TwilioAccountSID { get; set; } = "";
        [Column("twilio_auth_token")]
        public string TwilioAuthToken { get; set; } = "";
        [Column("channel_automation_api_key")]
        public string ChannelAutomationAPIKey { get; set; } = "";
    }

    [Table("user_twilio_number")]
    public class WorkspaceTwilioNumber : BaseModel
    {
        [PrimaryKey("id")]
        public long Id { get; set; }
        [Column("workspace_id")]
        public long WorkspaceId { get; set; }
        [Column("twilio_number")]
        public string TwilioNumber { get; set; } = "";
    }
}
