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
            var response = await _client.From<UserModel>()
                .Where(w => w.Id == id)
                .Get();

            return response.Models.FirstOrDefault();
        }
    }
}
