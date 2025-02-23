using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Pages
{
    public class ConfigurationModel : PageModel
    {
        private IUserService _userService;

        public ConfigurationModel(IUserService userService)
        {
            _userService = userService;
        }

        public async Task OnGet()
        {
            ViewData["User"] = await _userService.FindByUsername(User.Identity.Name);
        }
    }
}
