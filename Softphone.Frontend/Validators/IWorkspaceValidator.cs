﻿using Softphone.Frontend.Models;

namespace Softphone.Frontend.Validators
{
    public interface IWorkspaceValidator
    {
        Task<IList<string>> ValidateCreate(WorkspaceBO model);
        Task<IList<string>> ValidateEdit(WorkspaceBO model);
        Task<IList<string>> ValidateAddTwilioNumber(WorkspaceTwilioNumberBO model);
        Task<IList<string>> ValidateEditTwilioNumber(WorkspaceTwilioNumberBO model);
    }
}
