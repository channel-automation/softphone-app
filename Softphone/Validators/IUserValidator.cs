using Softphone.Models;

namespace Softphone.Validators
{
    public interface IUserValidator
    {
        Task<IList<string>> ValidateCreate(UserBO model);
        Task<IList<string>> ValidateEdit(UserBO model);
    }
}
