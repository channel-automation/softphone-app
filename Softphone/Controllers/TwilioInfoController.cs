using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Services;
using Softphone.Models;
using Softphone.Helpers;
using Softphone.Validators;

namespace Softphone.Controllers;

[Authorize(Roles = UserRole.Admin)]
public class TwilioInfoController : Controller
{
    private IWorkspaceService _workspaceService;
    private IWorkspaceValidator _workspaceValidator;
    private IUserService _userService;

    public TwilioInfoController(
        IWorkspaceService workspaceService,
        IWorkspaceValidator workspaceValidator,
        IUserService userService)
    {
        _workspaceService = workspaceService;
        _workspaceValidator = workspaceValidator;
        _userService = userService;
    }

    public async Task<IActionResult> Config()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var workspace = await _workspaceService.FindById(user.WorkspaceId);

        return PartialView(workspace);
    }

    [HttpPost]
    public async Task<IActionResult> ConfigSave(WorkspaceBO model)
    {
        var workspace = await _workspaceService.FindById(model.Id);
        if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        workspace.TwilioAccountSID = model.TwilioAccountSID;
        workspace.TwilioAuthToken = model.TwilioAuthToken;
        workspace.TwilioAPIKey = model.TwilioAPIKey;
        workspace.TwilioAPISecret = model.TwilioAPISecret;
        workspace.TwilioTwiMLAppSID = model.TwilioTwiMLAppSID;
        await _workspaceService.Update(workspace, User.Identity.Name);

        return Json(string.Empty);
    }

    public IActionResult Numbers()
    {
        return PartialView();
    }

    public async Task<IActionResult> GetList(int draw, int start, int length)
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var result = await _workspaceService.PagingTwilioNumbers(start, length, user.WorkspaceId);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
    }

    public async Task<IActionResult> AddNumber()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        ViewBag.Assigned = CommonHelper.JsonSerialize(new List<Assigned>());
        var model = new WorkspaceTwilioNumberBO { WorkspaceId = user.WorkspaceId };
        return PartialView("EditNumber", model);
    }

    public async Task<IActionResult> EditNumber(long id)
    {
        var model = await _workspaceService.GetTwilioNumber(id);
        if (model == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var list = new List<Assigned>();
        foreach (var content in await _workspaceService.GetTwilioNumberUsers(model.Id))
        {
            var user = await _userService.FindById(content.UserId);
            list.Add(new Assigned { Id = user.Id, Name = $"{user.FirstName} {user.LastName}" });
        }

        ViewBag.Assigned = CommonHelper.JsonSerialize(list);
        return PartialView(model);
    }

    [HttpPost]
    public async Task<IActionResult> SaveNumber(WorkspaceTwilioNumberBO model, string assigned)
    {
        var wtnUsers = new List<WorkspaceTwilioNumberUserBO>();
        foreach (var content in CommonHelper.JsonDeserialize<List<Assigned>>(assigned))
            wtnUsers.Add(new WorkspaceTwilioNumberUserBO { UserId = content.Id });

        if (model.Id == 0) return await AddNumberSubmit(model, wtnUsers);
        else return await EditNumberSubmit(model, wtnUsers);
    }

    private async Task<IActionResult> AddNumberSubmit(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
    {
        var errors = await _workspaceValidator.ValidateAddTwilioNumber(model);
        if (!errors.Any()) await _workspaceService.CreateTwilioNumber(model, wtnUsers);
        return Json(new { Errors = errors });
    }

    private async Task<IActionResult> EditNumberSubmit(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
    {
        var fromDb = await _workspaceService.GetTwilioNumber(model.Id);
        if (fromDb == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = await _workspaceValidator.ValidateEditTwilioNumber(model);
        if (!errors.Any())
        {
            fromDb.TwilioNumber = model.TwilioNumber;
            await _workspaceService.UpdateTwilioNumber(fromDb, wtnUsers);
        }

        return Json(new { Errors = errors });
    }

    public async Task<IActionResult> DeleteNumber(long id)
    {
        var model = await _workspaceService.GetTwilioNumber(id);
        if (model == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = new List<string>();
        string error = await _workspaceService.DeleteTwilioNumber(model);
        if (error != string.Empty) errors.Add(error);

        return Json(new { Errors = errors });
    }

    public async Task<IActionResult> Select(long workspaceId, string assigned)
    {
        var list = CommonHelper.JsonDeserialize<List<Assigned>>(assigned);
        ViewBag.SelectedIds = list.Select(w => w.Id).ToList();

        var users = await _userService.FindByWorkspaceId(workspaceId);
        users = users.OrderBy(w => w.Role).ThenBy(w => w.FirstName).ThenBy(w => w.LastName).ToList();
        return PartialView(users);
    }

    [HttpPost]
    public async Task<IActionResult> SelectDone()
    {
        var list = new List<Assigned>();
        foreach (string key in Request.Form.Keys.Where(w => w.Contains("UserId-")))
        {
            long id = Convert.ToInt64(key.Replace("UserId-", ""));
            var user = await _userService.FindById(id);
            list.Add(new Assigned { Id = user.Id, Name = $"{user.FirstName} {user.LastName}" });
        }
        return Json(list);
    }

    private class Assigned
    {
        public long Id { get; set; }
        public string Name { get; set; }
    }

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
