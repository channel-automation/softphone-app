using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Helpers;
using Softphone.Models;
using Softphone.Services;
using Softphone.Validators;

namespace Softphone.Controllers;

[Authorize (Roles = UserRole.Developer)]
public class WorkspaceController : Controller
{
    private IWorkspaceService _workspaceService;
    private IWorkspaceValidator _workspaceValidator;

    public WorkspaceController(IWorkspaceService workspaceService, IWorkspaceValidator workspaceValidator)
    {
        _workspaceService = workspaceService;
        _workspaceValidator = workspaceValidator;
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

        var result = await _workspaceService.Paging(start, length, sort ?? "id", sortdir ?? "asc", search ?? string.Empty);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public IActionResult Create()
    {
        return PartialView("Edit", new WorkspaceBO());
    }

    public async Task<IActionResult> Edit(long id)
    {
        var model = await _workspaceService.FindById(id);
        if (model == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);
        return PartialView("Edit", model);
    }

    [HttpPost]
    public async Task<IActionResult> Save(WorkspaceBO model)
    {
        if (model.Id == 0) return await CreateSubmit(model);
        else return await EditSubmit(model);
    }

    private async Task<IActionResult> CreateSubmit(WorkspaceBO model)
    {
        var errors = await _workspaceValidator.ValidateCreate(model);
        if (!errors.Any()) await _workspaceService.Create(model, User.Identity.Name);
        return Json(new { Errors = errors });
    }

    private async Task<IActionResult> EditSubmit(WorkspaceBO model)
    {
        var workspace = await _workspaceService.FindById(model.Id);
        if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = await _workspaceValidator.ValidateEdit(model);
        if (!errors.Any())
        {
            workspace.Name = model.Name;
            workspace.TwilioAccountSID = model.TwilioAccountSID;
            workspace.TwilioAuthToken = model.TwilioAuthToken;
            workspace.TwilioAPIKey = model.TwilioAPIKey;
            workspace.TwilioAPISecret = model.TwilioAPISecret;
            workspace.TwilioTwiMLAppSID = model.TwilioTwiMLAppSID; 
            await _workspaceService.Update(workspace, User.Identity.Name);
        }

        return Json(new { Errors = errors });
    }

    public async Task<IActionResult> Delete(long id)
    {
        var workspace = await _workspaceService.FindById(id);
        if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = new List<string>();
        string error = await _workspaceService.Delete(workspace, User.Identity.Name);
        if (error != string.Empty) errors.Add(error);

        return Json(new { Errors = errors });
    }

    public async Task<IActionResult> Remote(int? page, string term)
    {
        int size = 10;
        int skip = ((page ?? 1) - 1) * size;

        var paged = await _workspaceService.Remote(skip, size, term ?? string.Empty);

        var results = new List<object>();
        foreach (var workspace in paged.Data)
            results.Add(new { id = workspace.Id, text = workspace.Name });

        var pagination = new { more = skip < paged.RecordsTotal };
        return Json(new { results, pagination });
    }

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
