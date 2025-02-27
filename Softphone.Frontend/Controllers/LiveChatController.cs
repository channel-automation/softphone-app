using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers
{
    [Authorize]
    public class LiveChatController : Controller
    {
        private IUserService _userService;

        public LiveChatController(IUserService userService)
        {
            _userService = userService;
        }

        public async Task<IActionResult> Index()
        {
            var user = await _userService.FindByUsername(User.Identity.Name);
            ViewBag.User = user;
            return View();
        }
    }
}
