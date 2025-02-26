using System.Reflection.Metadata;
using System.Reflection;
using Softphone.Frontend.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
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

        public async Task<long> Create(UserBO model, string username)
        {
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = username;
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;

            var response = await _client.From<UserBO>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            return newModel == null ? 0 : newModel.Id;
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

        public async Task<Paging<AgentBO>> PagingAgents(int skip, int take, string sort, string sortdir, string search)
        {
            var paged = new Paging<AgentBO>();

            var filter1 = new Supabase.Postgrest.QueryFilter("full_name", Operator.ILike, $"%{search}%");
            var filter2 = new Supabase.Postgrest.QueryFilter("username", Operator.ILike, $"%{search}%");

            var response = await _client.From<AgentBO>()
                .Or(new List<IPostgrestQueryFilter> { filter1, filter2 })
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<AgentBO>()
                .Or(new List<IPostgrestQueryFilter> { filter1, filter2 })
                .Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }
    }
}
