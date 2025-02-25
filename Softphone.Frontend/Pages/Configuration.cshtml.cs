using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Pages
{
    public class ConfigurationModel : PageModel
    {
        private IUserService _userService;
        private IWorkspaceService _workspaceService;

        [BindProperty]
        public WorkspaceModel? Workspace { get; set; }

        public ConfigurationModel(IUserService userService, IWorkspaceService workspaceService)
        {
            _userService = userService;
            _workspaceService = workspaceService;
        }

        public async Task OnGet()
        {
            var user = await _userService.FindByUsername(User.Identity.Name);
            Workspace = await _workspaceService.FindById(user.WorkspaceId);
        }

        public async Task<IActionResult> OnPost()
        {
            string error = string.Empty;
            await _workspaceService.Update(Workspace, User.Identity.Name);
            return new JsonResult(error);
        }
    }
}
