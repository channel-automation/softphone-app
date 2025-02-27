using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;

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


    public IActionResult RemoteAgentPhoneNo(int? page, string term)
    {
        int size = 10;
        int skip = ((page ?? 1) - 1) * size;

        //int total;
        //var list = _supplierService.Remote(out total, skip, size, term ?? string.Empty);
        //var results = new List<object>();

        //foreach (var supplier in list)
        //    results.Add(new { id = supplier.Code, text = supplier.Name });

        int total = 0;
        var results = new List<object>();

        for (;total <= 5; total++)
        results.Add(new { id = $"+1919800116{total}", text = $"Mr. Agent # {total}" });

        var pagination = new { more = skip < total };
        return Json(new { results, pagination });
    }
}
