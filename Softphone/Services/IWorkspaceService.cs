using Softphone.Models;

namespace Softphone.Services
{
    public interface IWorkspaceService
    {
        Task Create(WorkspaceBO model, string username);
        Task Update(WorkspaceBO model, string username);
        Task<string> Delete(WorkspaceBO model, string username);
        Task<WorkspaceBO?> FindById(long id);
        Task<WorkspaceBO?> FindByName(string name);
        Task<WorkspaceTwilioNumberBO?> FindByTwilioNumber(string twilioNumber);
        Task<Paged<WorkspaceTwilioSearchBO>> PagingTwilioNumbers(int skip, int take, long workspaceId);
        Task<WorkspaceTwilioNumberBO?> GetTwilioNumber(long twilioNumberId);
        Task<IList<WorkspaceTwilioNumberUserBO>> GetTwilioNumberUsers(long twilioNumberId);
        Task CreateTwilioNumber(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers);
        Task UpdateTwilioNumber(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers);
        Task<string> DeleteTwilioNumber(WorkspaceTwilioNumberBO model);
        Task<Paged<WorkspaceSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search);
        Task<Paged<WorkspaceBO>> Remote(int skip, int take, string search);
    }
}
