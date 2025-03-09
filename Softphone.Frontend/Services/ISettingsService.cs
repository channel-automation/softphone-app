using Softphone.Frontend.Models;

namespace Softphone.Frontend.Services
{
    public interface ISettingsService
    {
        Task Create(SettingsBO model, string username);
        Task Update(SettingsBO model, string username);
        Task<SettingsBO?> Get();
    }
}
