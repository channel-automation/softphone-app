using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IWorkspaceService
    {
        Task<long> Create(WorkspaceBO model, string username);
        Task<WorkspaceBO?> FindById(long id);
        Task Update(WorkspaceBO model, string username);
    }
}
