using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Helpers;
using Softphone.Services;

namespace Softphone.Controllers;

[Authorize]
public class HomeController : Controller
{
    private IUserService _userService;
    private IVoiceCallService _voiceCallService;

    public HomeController(IUserService userService, IVoiceCallService voiceCallService)
    {
        _userService = userService;
        _voiceCallService = voiceCallService;
    }

    public async Task<IActionResult> Index()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        var paged = await _userService.RemotePhoneNo(0, 1, string.Empty, user.Username, user.WorkspaceId);
        var phone = paged.Data.FirstOrDefault();

        ViewBag.LoggedUser = user;
        ViewBag.SelectedPhone = phone;
        ViewBag.BaseUrl = GetBaseUrl();
        return View();
    }

    public async Task<IActionResult> DashboardData()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        string identity = user.Role == UserRole.Agent ? user.Username : string.Empty;

        int inboundCountNow = await _voiceCallService.Count(DateTime.UtcNow, CallType.Inbound, user.WorkspaceId, identity);
        int outboundCountNow = await _voiceCallService.Count(DateTime.UtcNow, CallType.Outbound, user.WorkspaceId, identity);
        int inboundCountLast24H = await _voiceCallService.Count(DateTime.UtcNow.AddHours(-24), CallType.Inbound, user.WorkspaceId, identity);
        int outboundCountLast24H = await _voiceCallService.Count(DateTime.UtcNow.AddHours(-24), CallType.Inbound, user.WorkspaceId, identity);
        IList<int> durationsNow = await _voiceCallService.Durations(DateTime.UtcNow, user.WorkspaceId, identity);
        IList<int> durationsLast24H = await _voiceCallService.Durations(DateTime.UtcNow.AddHours(-24), user.WorkspaceId, identity);
        int totalCountNow = inboundCountNow + outboundCountNow;
        int totalCountLast24H = inboundCountLast24H + outboundCountLast24H;

        int inboundCountChanges = 0;
        try { inboundCountChanges = Convert.ToInt32(Convert.ToDecimal((inboundCountNow - inboundCountLast24H) / inboundCountLast24H) * 100); }
        catch { };
        int outboundCountChanges = 0;
        try { outboundCountChanges = Convert.ToInt32(Convert.ToDecimal((outboundCountNow - outboundCountLast24H) / outboundCountLast24H) * 100); }
        catch { }
        int totalCountChanges = 0;
        try { totalCountChanges = Convert.ToInt32(Convert.ToDecimal((totalCountNow - totalCountLast24H) / totalCountLast24H) * 100); }
        catch { }
        decimal averageDurationNow = 0;
        try { averageDurationNow = Convert.ToDecimal(durationsNow.Sum() / durationsNow.Count); }
        catch { }
        decimal averageDurationLast24H = 0;
        try { averageDurationLast24H = Convert.ToDecimal(durationsLast24H.Sum() / durationsLast24H.Count); }
        catch { }
        int averageDurationChanges = 0;
        try { averageDurationChanges = Convert.ToInt32(Convert.ToDecimal((averageDurationNow - averageDurationLast24H) / averageDurationLast24H) * 100); }
        catch { }

        return new JsonResult(new 
        {
            totalCountNow,
            totalCountChanges,
            inboundCountNow,
            inboundCountChanges,
            outboundCountNow,
            outboundCountChanges,
            averageDurationNow,
            averageDurationChanges
        });
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

    private string GetBaseUrl()
    {
        string host = Request.Host.ToUriComponent();
        string pathBase = Request.PathBase.ToUriComponent();
        return $"{Request.Scheme}://{host}{pathBase}";
    }
}
