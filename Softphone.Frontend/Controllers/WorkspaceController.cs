using System.Reflection;
using System.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Controllers;

[Authorize (Roles = UserRole.Developer)]
public class WorkspaceController : Controller
{
    private IWorkspaceService _workspaceService;

    public WorkspaceController(IWorkspaceService workspaceService)
    {
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

        var result = await _workspaceService.Paging(start, length, sort, sortdir, search ?? string.Empty);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public IActionResult Create()
    {
        return PartialView("Edit", new WorkspaceBO());
    }

    public async Task<IActionResult> Edit(long id)
    {
        var workspace = await _workspaceService.FindById(id);
        if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);
        return PartialView("Edit", workspace);
    }

    [HttpPost]
    public async Task<IActionResult> Save(WorkspaceBO model)
    {
        if (model.Id == 0) return await CreateSubmit(model);
        else return await EditSubmit(model);
    }

    private async Task<IActionResult> CreateSubmit(WorkspaceBO model)
    {
        //TODO: to move "ChannelAutomationAPIKey" column to a global settings
        model.ChannelAutomationAPIKey = string.Empty; 

        var errors = new List<string>(); //No Validation yet
        if (!errors.Any()) await _workspaceService.Create(model, User.Identity.Name);
        return Json(new { Errors = errors });
    }

    private async Task<IActionResult> EditSubmit(WorkspaceBO model)
    {
        var workspace = await _workspaceService.FindById(model.Id);
        if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = new List<string>(); //No Validation yet
        if (!errors.Any())
        {
            workspace.Name = model.Name;
            workspace.TwilioAccountSID = model.TwilioAccountSID;
            workspace.TwilioAuthToken = model.TwilioAuthToken;
            workspace.TwilioAPIKey = model.TwilioAPIKey;
            workspace.TwilioAPISecret = model.TwilioAPISecret;

            //TODO: Need to check if "TwilioTwiMLAppSID" must be workdpace table or must be in Workspace Twilio Number table
            //workspace.TwilioTwiMLAppSID = model.TwilioTwiMLAppSID; 

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

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
