using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IUserService
    {
        Task Create(UserBO model, string username);
        Task Update(UserBO model, string username);
        Task<UserBO?> FindByUsername(string username);
        Task<UserBO?> FindById(long id);
        Task<Paging<AgentBO>> PagingAgent(int skip, int take, string sort, string sortdir, string search, long workspaceId);
        Task<Paging<AgentPhoneBO>> RemoteAgentPhone(int skip, int take, string search, long workspaceId, string agentUsername);
    }
}
