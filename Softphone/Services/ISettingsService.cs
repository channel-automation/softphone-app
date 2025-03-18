using Softphone.Models;

namespace Softphone.Services
{
    public interface ISettingsService
    {
        Task Create(SettingsBO model, string username);
        Task Update(SettingsBO model, string username);
        Task<SettingsBO?> Get();
    }
}
