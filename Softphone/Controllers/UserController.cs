using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Helpers;
using Softphone.Models;
using Softphone.Services;
using Softphone.Validators;

namespace Softphone.Controllers;

[Authorize (Roles = UserRole.Developer)]
public class UserController : Controller
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;
    private IUserValidator _userValidator;

    public UserController(
        IUserService userService, 
        IWorkspaceService workspaceService,
        IUserValidator userValidator)
    {
        _userService = userService;
        _workspaceService = workspaceService;
        _userValidator = userValidator;
    }

    public IActionResult Start(string byRole)
    {
        ViewBag.ByRole = byRole;
        return PartialView();
    }

    [HttpPost]
    public async Task<IActionResult> Search(int draw, int start, int length, string search, string byRole)
    {
        string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
        string sortdir = Request.Form["order[0][dir]"];

        var result = await _userService.Paging(start, length, sort ?? "id", sortdir ?? "asc", search ?? string.Empty, byRole);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public IActionResult Create(string byRole)
    {
        ViewBag.WorkspaceName = string.Empty;
        return PartialView("Edit", new UserBO { IsActive = true, Role = byRole });
    }

    public async Task<IActionResult> Edit(long id)
    {
        var user = await _userService.FindById(id);
        if (user == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

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
        var errors = await _userValidator.ValidateCreate(model);
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

        var errors = await _userValidator.ValidateEdit(model);
        if (!errors.Any())
        {
            user.WorkspaceId = model.WorkspaceId;
            user.FirstName = model.FirstName;
            user.LastName = model.LastName;
            user.IsActive = model.IsActive;
            if (isResetPassword) user.Password = CommonHelper.EncryptHash("123456");
            await _userService.Update(user, User.Identity.Name);
        }

        return Json(new { Errors = errors });
    }

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
