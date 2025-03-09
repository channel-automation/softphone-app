using System.Threading.Tasks;
using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IWorkspaceService
    {
        Task Create(WorkspaceBO model, string username);
        Task Update(WorkspaceBO model, string username);
        Task<string> Delete(WorkspaceBO model, string username);
        Task<WorkspaceBO?> FindById(long id);
        Task<IList<WorkspaceTwilioNumberBO>> GetTwilioNumbers(long id);
        Task<Paged<WorkspaceBO>> Paging(int skip, int take, string sort, string sortdir, string search);
        Task<Paged<WorkspaceBO>> Remote(int skip, int take, string search);
    }
}
