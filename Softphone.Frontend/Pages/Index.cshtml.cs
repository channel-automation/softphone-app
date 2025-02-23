using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Softphone.Frontend.Services;
namespace Softphone.Frontend.Pages;

[Authorize]
public class IndexModel : PageModel
{
    private IUserService _userService;

    public IndexModel(IUserService userService)
    {
        _userService = userService;
    }

    public async Task OnGet()
    {
        ViewData["User"] = await _userService.FindByUsername(User.Identity.Name);
    }

    public async Task<IActionResult> OnGetLogout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToPage("Index");
    }
}
