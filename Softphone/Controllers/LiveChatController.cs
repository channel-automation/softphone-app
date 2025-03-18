using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Services;

namespace Softphone.Controllers
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
            var paged = await _userService.RemotePhoneNo(0, 1, string.Empty, user.Username, user.WorkspaceId);
            var phone = paged.Data.FirstOrDefault();

            ViewBag.LoggedUser = user;
            ViewBag.SelectedPhone = phone;
            return View();
        }
    }
}
