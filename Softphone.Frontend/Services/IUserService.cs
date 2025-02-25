using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IUserService
    {
        Task<long> Create(UserModel model, string username);
        Task<UserModel?> FindByUsername(string username);
        Task<UserModel?> FindById(long id);
        Task<Paging<AgentModel>> PagingAgents(int skip, int take, string sort, string sortdir, string search);
    }
}
