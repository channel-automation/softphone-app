using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Supabase;
using static Supabase.Postgrest.Constants;

namespace Softphone.Frontend.Services
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
            return response.Models.FirstOrDefault();
        }

        public async Task<IList<WorkspaceTwilioNumberBO>> GetTwilioNumbers(long id)
        {
            var response = await _client.From<WorkspaceTwilioNumberBO>()
                .Where(w => w.WorkspaceId == id)
                .Get();

            return response.Models.ToList();
        }

        public async Task<Paged<WorkspaceBO>> Paging(int skip, int take, string sort, string sortdir, string search)
        {
            var paged = new Paged<WorkspaceBO>();

            var response = await _client.From<WorkspaceBO>()
                .Filter(w => w.Name, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioAccountSID, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioAPIKey, Operator.ILike, $"%{search}%")
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<WorkspaceBO>()
                .Filter(w => w.Name, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioAccountSID, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioAPIKey, Operator.ILike, $"%{search}%")

                //TODO Sorting:
                //.Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))

                .Range(skip, take)
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
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }
    }
}
