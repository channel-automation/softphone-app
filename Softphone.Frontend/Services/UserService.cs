using Softphone.Frontend.Helpers;
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

        public async Task<long> Create(UserModel model, string username)
        {
            model.CreatedAt = DateTime.Now;
            model.CreatedBy = username;
            model.ModifiedAt = DateTime.Now;
            model.ModifiedBy = username;

            var response = await _client.From<UserModel>().Insert(model);
            var newModel = response.Models.FirstOrDefault();
            return newModel == null ? 0 : newModel.Id;
        }

        public async Task<UserModel?> FindByUsername(string username)
        {
            var response = await _client.From<UserModel>()
                .Filter(w => w.Username, Operator.Like, $"%{username.ToLower()}%")
                .Get();

            return response.Models.FirstOrDefault();
        }

        public async Task<UserModel?> FindById(long id)
        {
            var response = await _client.From<UserModel>().Where(w => w.Id == id).Get();
            return response.Models.FirstOrDefault();
        }

        public async Task<Paging<AgentModel>> PagingAgents(int skip, int take, string sort, string sortdir, string search)
        {
            var paged = new Paging<AgentModel>();

            var response = await _client.From<AgentModel>()
                .Filter(w => w.FirstName, Operator.Like, $"%{search.ToLower()}%")
                .Filter(w => w.LastName, Operator.Like, $"%{search.ToLower()}%")
                .Filter(w => w.Username, Operator.Like, $"%{search.ToLower()}%")
                .Get();

            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<AgentModel>()
                .Filter(w => w.FirstName, Operator.Like, $"%{search.ToLower()}%")
                .Filter(w => w.LastName, Operator.Like, $"%{search.ToLower()}%")
                .Filter(w => w.Username, Operator.Like, $"%{search.ToLower()}%")
                //.Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }
    }
}
