using System.Data;
using Softphone.Helpers;
using Softphone.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
using static Supabase.Postgrest.Constants;

namespace Softphone.Services
{
    public class WorkspaceService : IWorkspaceService
    {
        private Client _client;

        public WorkspaceService(Client client)
        {
            _client = client;
        }

        public async Task Create(WorkspaceBO model, string username)
        {
            model.CreatedBy = username;
            model.CreatedAt = DateTime.Now;
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;
            var response = await _client.From<WorkspaceBO>().Insert(model);
            var _new = response.Models.FirstOrDefault();
            model.Id = (_new == null ? 0 : _new.Id);
        }

        public async Task Update(WorkspaceBO model, string username)
        {
            model.ModifiedBy = username;
            model.ModifiedAt = DateTime.Now;
            await _client.From<WorkspaceBO>().Update(model);
        }

        public async Task<string> Delete(WorkspaceBO model, string username)
        {
            try
            {
                await _client.From<WorkspaceBO>()
                .Where(w => w.Id == model.Id)
                .Delete();
            }
            catch (Exception ex)
            {
                if (ex.Message.ToUpper().Contains("CONSTRAINT")) 
                    return ErrorMessage.DeleteConstraintError;
                else throw;
            }
            return string.Empty;
        }

        public async Task<WorkspaceBO?> FindById(long id)
        {
            var response = await _client.From<WorkspaceBO>().Where(w => w.Id == id).Get();
            return response.Models.SingleOrDefault();
        }

        public async Task<WorkspaceBO?> FindByName(string name)
        {
            var response = await _client.From<WorkspaceBO>().Where(w => w.Name == name).Get();
            return response.Models.SingleOrDefault();
        }

        public async Task<WorkspaceTwilioNumberBO?> FindByTwilioNumber(string twilioNumber)
        {
            var response = await _client.From<WorkspaceTwilioNumberBO>().Where(w => w.TwilioNumber == twilioNumber).Get();
            return response.Models.SingleOrDefault();
        }

        public async Task<Paged<WorkspaceTwilioSearchBO>> PagingTwilioNumbers(int skip, int take, long workspaceId)
        {
            var paged = new Paged<WorkspaceTwilioSearchBO>();

            var response = await _client.From<WorkspaceTwilioSearchBO>()
                .Where(x => x.WorkspaceId == workspaceId)
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<WorkspaceTwilioSearchBO>()
                .Where(w => w.WorkspaceId == workspaceId)
                .Order(w => w.TwilioNumber, Ordering.Ascending)
                .Offset(skip).Limit(take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

        public async Task<WorkspaceTwilioNumberBO?> GetTwilioNumber(long twilioNumberId)
        {
            var response = await _client.From<WorkspaceTwilioNumberBO>().Where(w => w.Id == twilioNumberId).Get();
            return response.Models.SingleOrDefault();
        }

        public async Task<IList<WorkspaceTwilioNumberUserBO>> GetTwilioNumberUsers(long twilioNumberId)
        {
            var response = await _client.From<WorkspaceTwilioNumberUserBO>().Where(w => w.WorkspaceTwilioNumberId == twilioNumberId).Get();
            return response.Models.ToList();
        }

        public async Task CreateTwilioNumber(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
        {
            var response = await _client.From<WorkspaceTwilioNumberBO>().Insert(model);
            var _new = response.Models.FirstOrDefault();
            model.Id = (_new == null ? 0 : _new.Id);

            foreach (var content in wtnUsers)
            {
                content.WorkspaceTwilioNumberId = _new.Id;
                var response2 = await _client.From<WorkspaceTwilioNumberUserBO>().Insert(content);
            }
        }

        public async Task UpdateTwilioNumber(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
        {
            await _client.From<WorkspaceTwilioNumberBO>().Update(model);

            await _client.From<WorkspaceTwilioNumberUserBO>()
                .Where(w => w.WorkspaceTwilioNumberId == model.Id)
                .Delete();

            foreach (var content in wtnUsers)
            {
                content.WorkspaceTwilioNumberId = model.Id;
                var response2 = await _client.From<WorkspaceTwilioNumberUserBO>().Insert(content);
            }
        }

        public async Task<string> DeleteTwilioNumber(WorkspaceTwilioNumberBO model)
        {
            try
            {
                await _client.From<WorkspaceTwilioNumberBO>()
                .Where(w => w.Id == model.Id)
                .Delete();
            }
            catch (Exception ex)
            {
                if (ex.Message.ToUpper().Contains("CONSTRAINT"))
                    return ErrorMessage.DeleteConstraintError;
                else throw;
            }
            return string.Empty;
        }

        public async Task<Paged<WorkspaceSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search)
        {
            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("twilio_account_sid", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("twilio_api_key", Operator.ILike, $"%{search}%")
            };

            var response = await _client.From<WorkspaceSearchBO>()
                .Or(filters)
                .Get();

            var paged = new Paged<WorkspaceSearchBO>();
            paged.RecordsTotal = response.Models.Count();

            var response2 = await _client.From<WorkspaceSearchBO>()
                .Or(filters)
                .Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Offset(skip).Limit(take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

        public async Task<Paged<WorkspaceBO>> Remote(int skip, int take, string search)
        {
            var paged = new Paged<WorkspaceBO>();

            var response = await _client.From<WorkspaceBO>()
                .Filter(w => w.Name, Operator.ILike, $"%{search}%")
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<WorkspaceBO>()
                .Filter(w => w.Name, Operator.ILike, $"%{search}%")
                .Order(w => w.Name, Ordering.Ascending)
                .Offset(skip).Limit(take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }
    }
}
