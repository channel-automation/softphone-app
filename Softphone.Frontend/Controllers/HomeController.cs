using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class HomeController : Controller
{
    private IUserService _userService;

    public HomeController(IUserService userService)
    {
        _userService = userService;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var paged = await _userService.RemoteAgentPhone(0, 1, string.Empty, user.WorkspaceId);
        var selected = paged.Data.FirstOrDefault() ?? new AgentPhoneBO();

        ViewBag.LoggedUser = user;
        ViewBag.SelectedName = selected.FullName;
        ViewBag.SelectedNumber = selected.TwilioNumber;
        return View();
    }
}
