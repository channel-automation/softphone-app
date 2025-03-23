using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using Softphone.Helpers;
using Softphone.Services;
using Twilio.TwiML.Voice;

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

    public async Task<IActionResult> CountingCardsData()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        string identity = user.Role == UserRole.Agent ? user.Username : string.Empty;

        int inboundCountNow = await _voiceCallService.Count(DateTime.Now, CallType.Inbound, user.WorkspaceId, identity);
        int outboundCountNow = await _voiceCallService.Count(DateTime.Now, CallType.Outbound, user.WorkspaceId, identity);
        int inboundCountLast24H = await _voiceCallService.Count(DateTime.Now.AddHours(-24), CallType.Inbound, user.WorkspaceId, identity);
        int outboundCountLast24H = await _voiceCallService.Count(DateTime.Now.AddHours(-24), CallType.Outbound, user.WorkspaceId, identity);
        IList<int> durationsNow = await _voiceCallService.Durations(DateTime.Now, user.WorkspaceId, identity);
        IList<int> durationsLast24H = await _voiceCallService.Durations(DateTime.Now.AddHours(-24), user.WorkspaceId, identity);
        int totalCountNow = inboundCountNow + outboundCountNow;
        int totalCountLast24H = inboundCountLast24H + outboundCountLast24H;

        decimal inboundCountChanges = (inboundCountLast24H != 0 ? Convert.ToDecimal(inboundCountNow - inboundCountLast24H) / inboundCountLast24H : inboundCountNow) * 100;
        decimal outboundCountChanges = (outboundCountLast24H != 0 ? Convert.ToDecimal(outboundCountNow - outboundCountLast24H) / outboundCountLast24H : outboundCountNow) * 100;
        decimal totalCountChanges = (totalCountLast24H != 0 ? Convert.ToDecimal(totalCountNow - totalCountLast24H) / totalCountLast24H : totalCountNow) * 100;

        decimal averageDurationNow = durationsNow.Count != 0 ? Convert.ToDecimal(durationsNow.Sum()) / durationsNow.Count : 0;
        decimal averageDurationLast24H = durationsLast24H.Count != 0 ? Convert.ToDecimal(durationsLast24H.Sum()) / durationsLast24H.Count : 0;
        decimal averageDurationChanges = (averageDurationLast24H != 0 ? Convert.ToDecimal(averageDurationNow - averageDurationLast24H) / averageDurationLast24H : averageDurationNow) * 100;

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

    public async Task<IActionResult> DistributionChartData()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        string identity = user.Role == UserRole.Agent ? user.Username : string.Empty;
        var statuses = await _voiceCallService.Statuses(user.WorkspaceId, identity);

        int count = 0, ringingRate = 0, inProgressRate = 0, completedRate = 0, busyRate = 0, noAnswerRate = 0, failedRate = 0;
        if (statuses.Any())
        {
            count = statuses.Where(w => w == CallStatus.Ringing).Count();
            ringingRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
            count = statuses.Where(w => w == CallStatus.InProgress).Count();
            inProgressRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
            count = statuses.Where(w => w == CallStatus.Completed).Count();
            completedRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
            count = statuses.Where(w => w == CallStatus.Busy).Count();
            busyRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
            count = statuses.Where(w => w == CallStatus.NoAnswer).Count();
            noAnswerRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
            count = statuses.Where(w => w == CallStatus.Failed).Count();
            failedRate = (int)((Convert.ToDecimal(count) / Convert.ToDecimal(statuses.Count)) * 100);
        }

        var labels = new List<string>();
        var values = new List<int>();
        var backgrounds = new List<string>();
        var borders = new List<string>();
 
        if (ringingRate != 0)
        {
            labels.Add(CallStatus.Ringing);
            values.Add(ringingRate);
            backgrounds.Add("rgba(254, 153, 0, 0.8)");
            borders.Add("rgba(254, 153, 0, 1)");
        }
        if (inProgressRate != 0)
        {
            labels.Add(CallStatus.InProgress);
            values.Add(inProgressRate);
            backgrounds.Add("rgba(93, 226, 231, 0.8)");
            borders.Add("rgba(93, 226, 231, 1)");
        }
        if (completedRate != 0)
        {
            labels.Add(CallStatus.Completed);
            values.Add(completedRate);
            backgrounds.Add("rgba(125, 218, 88, 0.8)");
            borders.Add("rgba(125, 218, 88, 1)");
        }
        if (busyRate != 0)
        {
            labels.Add(CallStatus.Busy);
            values.Add(busyRate);
            backgrounds.Add("rgba(229, 66, 68, 0.8)");
            borders.Add("rgba(229, 66, 68, 1)");
        }
        if (noAnswerRate != 0)
        {
            labels.Add(CallStatus.NoAnswer);
            values.Add(noAnswerRate);
            backgrounds.Add("rgba(166, 166, 166, 0.8)");
            borders.Add("rgba(166, 166, 166, 1)");

        }
        if (failedRate != 0)
        {
            labels.Add(CallStatus.Failed);
            values.Add(failedRate);
            backgrounds.Add("rgba(93, 93, 93, 0.8)");
            borders.Add("rgba(93, 93, 93, 1)");
        }

        return new JsonResult(new { labels, values, backgrounds, borders });
    }

    public async Task<IActionResult> WeeklyChartData()
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        string identity = user.Role == UserRole.Agent ? user.Username : string.Empty;

        DateTime weekTo = DateTime.Now;
        DateTime weekFrom = weekTo.AddDays(-6).Date;
        DateTime lastWeekTo = weekFrom.AddDays(-1);
        lastWeekTo = new DateTime(lastWeekTo.Year, lastWeekTo.Month, lastWeekTo.Day, 23, 59, 59);
        DateTime lastWeekFrom = lastWeekTo.AddDays(-6).Date;

        var weekData = await _voiceCallService.GetByDate(user.WorkspaceId, identity, weekFrom, weekTo);
        var lastWeekData = await _voiceCallService.GetByDate(user.WorkspaceId, identity, lastWeekFrom, lastWeekTo);
        decimal weekChanges = (lastWeekData.Count != 0 ? Convert.ToDecimal(weekData.Count - lastWeekData.Count) / lastWeekData.Count : weekData.Count) * 100;

        var labels = new List<string>();
        var inboundValues = new List<int>();
        var outboundValues = new List<int>();
        for (; weekFrom <= weekTo; weekFrom = weekFrom.AddDays(1))
        {
            labels.Add(weekFrom.ToString("ddd"));
            inboundValues.Add(weekData.Count(w => w.CreatedAt.DayOfWeek == weekFrom.DayOfWeek && w.Type == CallType.Inbound));
            outboundValues.Add(weekData.Count(w => w.CreatedAt.DayOfWeek == weekFrom.DayOfWeek && w.Type == CallType.Outbound));
        }

        return new JsonResult(new { labels, inboundValues, outboundValues, weekChanges });
    }

    [IgnoreAntiforgeryToken]
    [HttpPost]
    public async Task<IActionResult> CallLogSearch(int draw, int start, int length)
    {
        var user = await _userService.FindByUsername(User.Identity.Name);
        string identity = user.Role == UserRole.Agent ? user.Username : string.Empty;

        var result = await _voiceCallService.Paging(start, length, user.WorkspaceId, identity);
        return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
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
