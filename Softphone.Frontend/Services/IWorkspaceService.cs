using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IWorkspaceService
    {
        Task<long> Create(WorkspaceModel model, string username);
        Task<WorkspaceModel?> FindById(long id);
        Task Update(WorkspaceModel model, string username);
    }
}
