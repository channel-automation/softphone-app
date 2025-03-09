using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers;

[Authorize (Roles = UserRole.Developer)]
public class UserController : Controller
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;

    public UserController(IUserService userService, IWorkspaceService workspaceService)
    {
        _userService = userService;
        _workspaceService = workspaceService;
    }

    public IActionResult Start()
    {
        return PartialView();
    }

    [HttpPost]
    public async Task<IActionResult> Search(int draw, int start, int length, string search)
    {
        string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
        string sortdir = Request.Form["order[0][dir]"];

        var result = await _userService.Paging(start, length, sort, sortdir, search ?? string.Empty);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public IActionResult Create()
    {
        var roles = CommonHelper.ConstantList(typeof(UserRole), true);
        roles.Remove(UserRole.Agent);
        ViewBag.Roles = roles;
        ViewBag.WorkspaceName = string.Empty;
        return PartialView("Edit", new UserBO { IsActive = true });
    }

    public async Task<IActionResult> Edit(long id)
    {
        var user = await _userService.FindById(id);
        if (user == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var roles = CommonHelper.ConstantList(typeof(UserRole), true);
        roles.Remove(UserRole.Agent);
        ViewBag.Roles = roles;
        ViewBag.WorkspaceName = await GetWorkspaceName(user.WorkspaceId);
        return PartialView("Edit", user);
    }

    [HttpPost]
    public async Task<IActionResult> Save(UserBO model, bool isResetPassword)
    {
        if (model.Id == 0) return await CreateSubmit(model);
        else return await EditSubmit(model, isResetPassword);
    }

    private async Task<IActionResult> CreateSubmit(UserBO model)
    {
        var errors = new List<string>(); //No Validation yet
        if (!errors.Any())
        {
            model.Password = CommonHelper.EncryptHash("123456");
            await _userService.Create(model, User.Identity.Name);
        }
        return Json(new { Errors = errors });
    }

    private async Task<IActionResult> EditSubmit(UserBO model, bool isResetPassword)
    {
        var user = await _userService.FindById(model.Id);
        if (user == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = new List<string>(); //No Validation yet
        if (!errors.Any())
        {
            user.WorkspaceId = model.WorkspaceId;
            user.FirstName = model.FirstName;
            user.LastName = model.LastName;
            user.Role = model.Role;
            user.IsActive = model.IsActive;
            if (isResetPassword) user.Password = CommonHelper.EncryptHash("123456");
            await _userService.Update(user, User.Identity.Name);
        }

        return Json(new { Errors = errors });
    }

    //public async Task<IActionResult> Delete(long id)
    //{
    //    var workspace = await _workspaceService.FindById(id);
    //    if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

    //    var errors = new List<string>();
    //    string error = await _workspaceService.Delete(workspace, User.Identity.Name);
    //    if (error != string.Empty) errors.Add(error);

    //    return Json(new { Errors = errors });
    //}

    private async Task<string> GetWorkspaceName(long workspaceId)
    {
        var workspace = await _workspaceService.FindById(workspaceId);
        return workspace.Name;
    }

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
