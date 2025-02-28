using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Helpers;
using Microsoft.AspNetCore.Authorization;

namespace Softphone.Frontend.Controllers;

public class SecurityController : Controller
{
    private IUserService _userService;

    public SecurityController(IUserService userService)
    {
        _userService = userService;
    }

    public IActionResult Login()
    {
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Login(string username, string password, bool remember)
    {
        var user = await _userService.FindByUsername(username);
        string error = string.Empty;

        if (user == null || !EncryptHelper.Verify(password, user.Password))
            error = "Invalid Username or Password.";

        else if (!user.IsActive)
            error = "Username '" + user.Username + "' is not active.";

        if (error == string.Empty)
        {
            var identity = new ClaimsIdentity(CookieAuthenticationDefaults.AuthenticationScheme);
            identity.AddClaim(new Claim(ClaimTypes.Name, user.Username));
            identity.AddClaim(new Claim(ClaimTypes.Role, user.Role));

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                new AuthenticationProperties { IsPersistent = remember, ExpiresUtc = DateTime.Now.AddHours(24) });
        }

        return Json(error);
    }

    [Authorize]
    public IActionResult Logout()
    {
        return PartialView();
    }

    [Authorize]
    public async Task<IActionResult> LogoutYes()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

    [Authorize]
    public IActionResult ChangePassword()
    {
        return PartialView();
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> ChangePassword(string currentPassword, string newPassword)
    {
        string error = string.Empty;
        var user = await _userService.FindByUsername(User.Identity.Name);
        if (EncryptHelper.Verify(currentPassword, user.Password))
        {
            user.Password = EncryptHelper.Hash(newPassword);
            await _userService.Update(user, User.Identity.Name);
        }
        else error = "Incorrect Current Password.";
        return Json(error);
    }
}
