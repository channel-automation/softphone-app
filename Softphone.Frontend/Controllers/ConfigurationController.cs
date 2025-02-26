using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class ConfigurationController : Controller
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;

    public ConfigurationController(IUserService userService, IWorkspaceService workspaceService)
    {
        _userService = userService;
        _workspaceService = workspaceService;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var workspace = await _workspaceService.FindById(user.WorkspaceId);

        return View(workspace);
    }

    [HttpPost]
    public async Task<IActionResult> Save(WorkspaceBO workspace)
    {
        string error = string.Empty;
        await _workspaceService.Update(workspace, User.Identity.Name);
        return Json(error);
    }
}
