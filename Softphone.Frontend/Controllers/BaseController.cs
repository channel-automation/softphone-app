using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers
{
    public class BaseController : Controller
    {
        private readonly IUserService _userService;

        public BaseController(IUserService userService)
        {
            _userService = userService;
        }

        public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Set the user in ViewBag if the user is authenticated
            if (User?.Identity?.IsAuthenticated == true)
            {
                try
                {
                    var user = await _userService.FindByUsername(User.Identity.Name);
                    ViewBag.User = user;
                }
                catch (Exception)
                {
                    // If there's an error getting the user, create a default one to prevent null reference exceptions
                    ViewBag.User = new UserBO
                    {
                        FirstName = "Guest",
                        LastName = "User",
                        Username = "guest"
                    };
                }
            }
            else
            {
                // Set a default user for non-authenticated requests
                ViewBag.User = new UserBO
                {
                    FirstName = "Guest",
                    LastName = "User",
                    Username = "guest"
                };
            }

            await base.OnActionExecutionAsync(context, next);
        }
    }
} 