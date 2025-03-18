using Softphone.Models;
using Softphone.Services;

namespace Softphone.Validators
{
    public class WorkspaceValidator : IWorkspaceValidator
    {
        private IWorkspaceService _service;

        public WorkspaceValidator(IWorkspaceService workspaceService)
        {
            _service = workspaceService;
        }

        public async Task<IList<string>> ValidateCreate(WorkspaceBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByName(model.Name);
            if (fromDb != null)
                errors.Add($"Workspace name already taken. <b>\"</b>{model.Name}<b>\"</b>");

            return errors;
        }

        public async Task<IList<string>> ValidateEdit(WorkspaceBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByName(model.Name);
            if (fromDb != null && fromDb.Id != model.Id)
                errors.Add($"Workspace name already taken. <b>\"</b>{model.Name}<b>\"</b>");

            return errors;
        }

        public async Task<IList<string>> ValidateAddTwilioNumber(WorkspaceTwilioNumberBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByTwilioNumber(model.TwilioNumber);
            if (fromDb != null)
                errors.Add($"Twilio Number already taken. <b>\"</b>{model.TwilioNumber}<b>\"</b>");

            return errors;
        }

        public async Task<IList<string>> ValidateEditTwilioNumber(WorkspaceTwilioNumberBO model)
        {
            var errors = new List<string>();

            var fromDb = await _service.FindByTwilioNumber(model.TwilioNumber);
            if (fromDb != null && fromDb.Id != model.Id)
                errors.Add($"Twilio Number already taken. <b>\"</b>{model.TwilioNumber}<b>\"</b>");

            return errors;
        }
    }
}
