using Softphone.Frontend.Models;
using Supabase;
using static Supabase.Postgrest.Constants;

namespace Softphone.Frontend.Services
{
    public class UserService : IUserService
    {
        private Client _client;

        public UserService(Client client)
        {
            _client = client;
        }

        public async Task Create(UserBO model, string username)
        {
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = username;
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;

            var response = await _client.From<UserBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            model.Id = (newModel == null ? 0 : newModel.Id);
        }

        public async Task Update(UserBO model, string username)
        {
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;
            await _client.From<UserBO>().Update(model);
        }

        public async Task<UserBO?> FindByUsername(string username)
        {
            var response = await _client.From<UserBO>()
                .Filter(w => w.Username, Operator.ILike, $"{username}")
                .Get();

            return response.Models.FirstOrDefault();
        }

        public async Task<UserBO?> FindById(long id)
        {
            var response = await _client.From<UserBO>().Where(w => w.Id == id).Get();
            return response.Models.FirstOrDefault();
        }

        public async Task<Paging<AgentBO>> PagingAgent(int skip, int take, string sort, string sortdir, string search, long workspaceId)
        {
            var paged = new Paging<AgentBO>();

            var response = await _client.From<AgentBO>()
                .Filter(w => w.FullName, Operator.ILike, $"%{search}%")
                .Filter(w => w.Username, Operator.ILike, $"%{search}%")
                .Where(x => x.WorkspaceId == workspaceId)
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<AgentBO>()
                .Filter(w => w.FullName, Operator.ILike, $"%{search}%")
                .Filter(w => w.Username, Operator.ILike, $"%{search}%")
                .Where(x => x.WorkspaceId == workspaceId)
                //.Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

        public async Task<Paging<AgentPhoneBO>> RemoteAgentPhone(int skip, int take, string search, long workspaceId, string agentUsername)
        {
            var paged = new Paging<AgentPhoneBO>();

            var response = await _client.From<AgentPhoneBO>()
                .Filter(w => w.FullName, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioNumber, Operator.ILike, $"%{search}%")
                .Filter(w => w.Username, Operator.ILike, $"%{agentUsername}%")
                .Where(x => x.WorkspaceId == workspaceId)
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<AgentPhoneBO>()
                .Filter(w => w.FullName, Operator.ILike, $"%{search}%")
                .Filter(w => w.TwilioNumber, Operator.ILike, $"%{search}%")
                .Filter(w => w.Username, Operator.ILike, $"%{agentUsername}%")
                .Where(x => x.WorkspaceId == workspaceId)
                .Order(w => w.FullName, Ordering.Ascending)
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

    }
}
