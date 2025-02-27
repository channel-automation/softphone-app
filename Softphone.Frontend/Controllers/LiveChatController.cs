using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Softphone.Frontend.Controllers
{
    [Authorize]
    public class LiveChatController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
