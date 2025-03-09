using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;
using Softphone.Frontend.Helpers;

namespace Softphone.Frontend.Controllers;

[Authorize(Roles = UserRole.Developer)]
public class SettingsController : Controller
{
    private ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    public async Task<IActionResult> Start()
    {
        var model = await _settingsService.Get() ?? new SettingsBO();
        return PartialView(model);
    }

    [HttpPost]
    public async Task<IActionResult> Save(SettingsBO model)
    {
        if (model.Id == 0) return await CreateSubmit(model);
        else return await EditSubmit(model);
    }

    private async Task<IActionResult> CreateSubmit(SettingsBO model)
    {
        var errors = new List<string>(); //No Validation yet
        if (!errors.Any()) await _settingsService.Create(model, User.Identity.Name);
        return Json(new { Errors = errors });
    }

    private async Task<IActionResult> EditSubmit(SettingsBO model)
    {
        var settings = await _settingsService.Get();
        if (settings == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

        var errors = new List<string>(); //No Validation yet
        if (!errors.Any())
        {
            settings.ChannelAutomationAPIKey = model.ChannelAutomationAPIKey;
            settings.CallInboundWebhook = model.CallInboundWebhook;
            settings.CallOutboundWebhook = model.CallOutboundWebhook;
            settings.CallStatusWebhook = model.CallStatusWebhook;
            await _settingsService.Update(settings, User.Identity.Name);
        }

        return Json(new { Errors = errors });
    }

    private IActionResult AjaxDataError(string message)
    {
        return StatusCode(418, message);
    }
}
