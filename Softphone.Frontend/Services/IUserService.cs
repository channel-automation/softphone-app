using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IUserService
    {
        Task Create(UserBO model, string username);
        Task Update(UserBO model, string username);
        Task<UserBO?> FindByUsername(string username);
        Task<UserBO?> FindById(long id);
        Task<Paged<UserSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search);
        Task<Paged<AgentBO>> PagingAgent(int skip, int take, string sort, string sortdir, string search, long workspaceId);
        Task<Paged<AgentPhoneBO>> RemoteAgentPhone(int skip, int take, string search, long workspaceId, string loggedUsername, string loggedRole);
    }
}
