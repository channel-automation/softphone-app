﻿using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
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
        var paged = await _userService.RemotePhoneNo(0, 1, string.Empty, user.Username, user.WorkspaceId);
        var phone = paged.Data.FirstOrDefault();

        ViewBag.LoggedUser = user;
        ViewBag.SelectedPhone = phone;
        return View();
    }

    public async Task<IActionResult> RemotePhoneNo(int? page, string term)
    {
        int size = 10;
        int skip = ((page ?? 1) - 1) * size;

        var user = await _userService.FindByUsername(User.Identity.Name);
        string username = user.Role == UserRole.Agent ? user.Username : string.Empty;
        var paged = await _userService.RemotePhoneNo(skip, size, term ?? string.Empty, username, user.WorkspaceId);

        var results = new List<object>();
        foreach (var phone in paged.Data)
            results.Add(new { id = phone.twilio_number, text = phone.full_name });

        var pagination = new { more = skip < paged.RecordsTotal };
        return Json(new { results, pagination });
    }
}
