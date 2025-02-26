using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class AgentListController : Controller
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;

    public AgentListController(IUserService userService, IWorkspaceService workspaceService)
    {
        _userService = userService;
        _workspaceService = workspaceService;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        ViewBag.WorkspaceId = user.WorkspaceId;
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Search(int draw, int start, int length, string search)
    {
        string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
        string sortdir = Request.Form["order[0][dir]"];

        var result = await _userService.PagingAgents(start, length, sort, sortdir, search ?? string.Empty);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public async Task<IActionResult> Edit(int id)
    {
        var user = await _userService.FindById(id);
        return PartialView(user);
    }
}
