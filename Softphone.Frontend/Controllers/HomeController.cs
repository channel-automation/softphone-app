﻿using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
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
        var paged = await _userService.RemoteAgentPhone(0, 1, string.Empty, user.WorkspaceId, user.Username, string.Empty);
        var phone = paged.Data.FirstOrDefault();

        ViewBag.LoggedUser = user;
        ViewBag.SelectedPhone = phone;
        return View();
    }
}
