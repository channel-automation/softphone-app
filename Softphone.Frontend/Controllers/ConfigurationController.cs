using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class ConfigurationController : BaseController
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;

    public ConfigurationController(IUserService userService, IWorkspaceService workspaceService) : base(userService)
    {
        _userService = userService;
        _workspaceService = workspaceService;
    }

    public async Task<IActionResult> Start()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var workspace = await _workspaceService.FindById(user.WorkspaceId);

        return PartialView(workspace);
    }

    [HttpPost]
    public async Task<IActionResult> Save(WorkspaceBO workspace)
    {
        var errors = new List<string>();
        await _workspaceService.Update(workspace, User.Identity.Name);
        return Json(errors);
    }
}
