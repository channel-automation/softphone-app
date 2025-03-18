using Softphone.Models;
using Softphone.Services;

namespace Softphone.Validators
{
    public class UserValidator : IUserValidator
    {
        private IUserService _service;

        public UserValidator(IUserService userService)
        {
            _service = userService;
        }

        public async Task<IList<string>> ValidateCreate(UserBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByUsername(model.Username);
            if (fromDb != null)
                errors.Add($"Username already taken. <b>\"</b>{model.Username}<b>\"</b>");

            return errors;
        }

        public async Task<IList<string>> ValidateEdit(UserBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByUsername(model.Username);
            if (fromDb != null && fromDb.Id != model.Id)
                errors.Add($"Username already taken. <b>\"</b>{model.Username}<b>\"</b>");

            return errors;
        }
    }
}
