using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;
using Softphone.Frontend.Validators;

namespace Softphone.Frontend.Controllers;

[Authorize(Roles = UserRole.Admin)]
public class AgentsController : Controller
{
    private IUserService _userService;
    private IUserValidator _userValidator;

    public AgentsController(IUserService userService, IUserValidator userValidator)
    {
        _userService = userService;
        _userValidator = userValidator;
    }

    public IActionResult Start()
    {
        return PartialView();
    }

    [HttpPost]
    public async Task<IActionResult> Search(int draw, int start, int length, string search)
    {
        var user = await _userService.FindByUsername(User.Identity.Name);

        string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
        string sortdir = Request.Form["order[0][dir]"];

        var result = await _userService.Paging(start, length, sort ?? "id", sortdir ?? "asc", search ?? string.Empty, UserRole.Agent, user.WorkspaceId);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public async Task<IActionResult> Create()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        return PartialView("Edit", new UserBO { WorkspaceId = user.WorkspaceId, Role = UserRole.Agent, IsActive = true });
    }

    public async Task<IActionResult> Edit(long id)
    {
        var agent = await _userService.FindById(id);
        if (agent == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        return PartialView("Edit", agent);
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
        var agent = await _userService.FindById(model.Id);
        if (agent == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = await _userValidator.ValidateEdit(model);
        if (!errors.Any())
        {
            agent.FirstName = model.FirstName;
            agent.LastName = model.LastName;
            agent.IsActive = model.IsActive;
            if (isResetPassword) agent.Password = CommonHelper.EncryptHash("123456");
            await _userService.Update(agent, User.Identity.Name);
        }

        return Json(new { Errors = errors });
    }

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
