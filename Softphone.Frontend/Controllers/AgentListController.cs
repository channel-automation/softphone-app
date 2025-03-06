using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class AgentListController : Controller
{
    private IUserService _userService;

    public AgentListController(IUserService userService)
    {
        _userService = userService;
    }

    [Authorize(Roles = UserRole.Admin)]
    public IActionResult Start()
    {
        // Get the method info
        //MethodInfo methodInfo = typeof(MyClass).GetMethod("MyMethod");

        //// Check if the method has the custom attribute
        //if (methodInfo != null && methodInfo.GetCustomAttribute(typeof(MyCustomAttribute)) is MyCustomAttribute attribute)
        //{
        //    // Get the attribute value
        //    Console.WriteLine($"Method: {methodInfo.Name}");
        //    Console.WriteLine($"Attribute Description: {attribute.Description}");
        //}

        return PartialView();
    }

    [Authorize(Roles = UserRole.Admin)]
    [HttpPost]
    public async Task<IActionResult> Search(int draw, int start, int length, string search, long workspaceId)
    {
        string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
        string sortdir = Request.Form["order[0][dir]"];

        var result = await _userService.PagingAgent(start, length, sort, sortdir, search ?? string.Empty, workspaceId);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Edit(int id)
    {
        var user = await _userService.FindById(id) ?? new UserBO();
        return PartialView(user);
    }

    public async Task<IActionResult> RemoteAgentPhone(int? page, string term, long workspaceId)
    {
        int size = 10;
        int skip = ((page ?? 1) - 1) * size;

        string role = User.Claims.Where(w => w.Type == ClaimTypes.Role).First().Value;
        var paged = await _userService.RemoteAgentPhone(skip, size, term ?? string.Empty, workspaceId, User.Identity.Name, role);

        var results = new List<object>();
        foreach (var phone in paged.Data)
            results.Add(new { id = phone.TwilioNumber, text = phone.FullName });

        var pagination = new { more = skip < paged.RecordsTotal };
        return Json(new { results, pagination });
    }
}
