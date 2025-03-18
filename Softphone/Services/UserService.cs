using Softphone.Models;
using Supabase;
using Supabase.Postgrest.Interfaces;
using static Supabase.Postgrest.Constants;

namespace Softphone.Services
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

            return response.Models.SingleOrDefault();
        }

        public async Task<IList<UserBO>> FindByWorkspaceId(long workspaceId)
        {
            var response = await _client.From<UserBO>().Where(w => w.WorkspaceId == workspaceId).Get();
            return response.Models.ToList();
        }

        public async Task<UserBO?> FindById(long id)
        {
            var response = await _client.From<UserBO>().Where(w => w.Id == id).Get();
            return response.Models.SingleOrDefault();
        }

        public async Task<Paged<UserSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search, string role)
        {
            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("workspace_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("first_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("last_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("username", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("role", Operator.ILike, $"%{search}%")
            };

            var response = await _client.From<UserSearchBO>()
                .Or(filters)
                .Where(w => w.role == role)
                .Get();

            var paged = new Paged<UserSearchBO>();
            paged.RecordsTotal = response.Models.Count();

            var response2 = await _client.From<UserSearchBO>()
                .Or(filters)
                .Where(w => w.role == role)
                .Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

        public async Task<Paged<UserSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search, string role, long workspaceId)
        {
            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("first_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("last_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("username", Operator.ILike, $"%{search}%")
            };

            var response = await _client.From<UserSearchBO>()
                .Or(filters)
                .Where(w => w.role == role)
                .Where(w => w.workspace_id == workspaceId)
                .Get();

            var paged = new Paged<UserSearchBO>();
            paged.RecordsTotal = response.Models.Count();

            var response2 = await _client.From<UserSearchBO>()
                .Or(filters)
                .Where(w => w.role == role)
                .Where(w => w.workspace_id == workspaceId)
                .Order(sort, (sortdir == "asc" ? Ordering.Ascending : Ordering.Descending))
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();
            return paged;
        }

        public async Task<Paged<PhoneNumberBO>> RemotePhoneNo(int skip, int take, string search, string username, long workspaceId)
        {
            var filters = new List<IPostgrestQueryFilter>
            {
                new Supabase.Postgrest.QueryFilter("full_name", Operator.ILike, $"%{search}%"),
                new Supabase.Postgrest.QueryFilter("twilio_number", Operator.ILike, $"%{search}%")
            };

            var response = await _client.From<PhoneNumberBO>()
                .Or(filters)
                .Filter("username", Operator.ILike, $"%{username}%")
                .Where(w => w.workspace_id == workspaceId)
                .Get();

            var paged = new Paged<PhoneNumberBO>();
            paged.RecordsTotal = response.Models.Count;

            var response2 = await _client.From<PhoneNumberBO>()
                .Or(filters)
                .Filter("username", Operator.ILike, $"%{username}%")
                .Where(w => w.workspace_id == workspaceId)
                .Order("full_name", Ordering.Ascending)
                .Range(skip, take)
                .Get();

            paged.Data = response2.Models.ToList();

            foreach (var content in paged.Data)
                content.full_name = content.full_name.Trim() == string.Empty ? "No Name" : content.full_name;

            return paged;
        }
    }
}
