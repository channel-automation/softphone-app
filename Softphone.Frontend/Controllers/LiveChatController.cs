using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers
{
    [Authorize]
    public class LiveChatController : BaseController
    {
        private IUserService _userService;

        public LiveChatController(IUserService userService) : base(userService)
        {
            _userService = userService;
        }

        public async Task<IActionResult> Index()
        {
            return View();
        }
    }
}
