using Softphone.Frontend.Models;

namespace Softphone.Frontend.Validators
{
    public interface IUserValidator
    {
        Task<IList<string>> ValidateCreate(UserBO model);
        Task<IList<string>> ValidateEdit(UserBO model);
    }
}
