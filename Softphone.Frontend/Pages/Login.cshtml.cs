using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Softphone.Frontend.Services;
using Softphone.Helpers;

namespace Softphone.Frontend.Pages
{
    public class LoginModel : PageModel
    {
        private IUserService _userService;

        public LoginModel(IUserService userService)
        {
            _userService = userService;
        }

        public void OnGet()
        {
        }

        public async Task<IActionResult> OnPost(string username, string password, bool remember) 
        {
            var user = await _userService.FindByUsername(username);
            string error = string.Empty;

            if (user == null || !GlobalHelper.EncryptVerify(password, user.Password))
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

            return new JsonResult(error);
        }
    }
}
