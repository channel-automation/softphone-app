using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IUserService
    {
        Task<long> Create(UserBO model, string username);
        Task<UserBO?> FindByUsername(string username);
        Task<UserBO?> FindById(long id);
        Task<Paging<AgentBO>> PagingAgents(int skip, int take, string sort, string sortdir, string search);
    }
}
