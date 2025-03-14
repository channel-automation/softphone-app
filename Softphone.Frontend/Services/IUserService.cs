using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface IUserService
    {
        Task Create(UserBO model, string username);
        Task Update(UserBO model, string username);
        Task<UserBO?> FindByUsername(string username);
        Task<UserBO?> FindById(long id);
        Task<IList<UserBO>> FindByWorkspaceId(long workspaceId);
        Task<Paged<UserSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search, string role);
        Task<Paged<UserSearchBO>> Paging(int skip, int take, string sort, string sortdir, string search, string role, long workspaceId);
        Task<Paged<PhoneNumberBO>> RemotePhoneNo(int skip, int take, string search, string username, long workspaceId);
    }
}
