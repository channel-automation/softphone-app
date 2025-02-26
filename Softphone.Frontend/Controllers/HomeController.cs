﻿using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        ViewBag.User = user;
        return View();
    }

    //public async Task<IActionResult> UserInfo()
    //{
    //    var user = await _userService.FindByUsername(User.Identity.Name);
    //    return Json(new { user.FirstName, user.LastName, user.WorkspaceId });
    //}
}
