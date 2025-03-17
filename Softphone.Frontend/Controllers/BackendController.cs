using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Services;
using Twilio.Jwt.AccessToken;

namespace Softphone.Frontend.Controllers
{
    [EnableCors("AllowSpecificOrigins")]
    public class BackendController : ControllerBase
    {
        private IWorkspaceService _workspaceService;
        private IUserService _userService;

        public BackendController(IWorkspaceService workspaceService, IUserService userService)
        {
            _workspaceService = workspaceService;
            _userService = userService;
        }

        public async Task<IActionResult> AccessToken(string key, string username)
        {
            if (key != BackKey.Value) return StatusCode(401, "Unathorized Access!");
            try
            {
                var user = await _userService.FindByUsername(username);
                var workspace = await _workspaceService.FindById(user.WorkspaceId);
                // Create a grant for Voice
                var voiceGrant = new VoiceGrant
                {
                    OutgoingApplicationSid = workspace.TwilioTwiMLAppSID,
                    IncomingAllow = true
                };
                // Create an access token
                DateTime expiration = DateTime.Now.AddHours(1);
                var token = new Token(
                    workspace.TwilioAccountSID,
                    workspace.TwilioAPIKey,
                    workspace.TwilioAPISecret,
                    user.Username,
                    expiration,
                    grants: new HashSet<IGrant> { voiceGrant }
                );
                Console.WriteLine($"Voice token generated for identity: {user.Username}");
                return new JsonResult(new { Token = token.ToJwt(), Expires = expiration.ToString("o") });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"EXCEPTION: {ex.Message}");
                return StatusCode(500, $"EXCEPTION: {ex.Message}");
            }
        }

        //[HttpPost]
        //public IActionResult IncomingCalls([FromBody] Payload payload)
        //{
        //    //Get user based on "To" number
        //    var user = await _userService.(username);

        //    //Console.WriteLine($"Call Status update at {DateTime.Now.ToString("o")}.");
        //    //Console.WriteLine(CommonHelper.JsonSerialize(payload));
        //    //return StatusCode(200);
        //}

        [HttpPost]
        public IActionResult CallStatus([FromBody] Payload payload)
        {
            Console.WriteLine($"Call Status update at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallSid}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}, " +
                $"Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpPost]
        public IActionResult CallRecordingStatus([FromBody] Payload payload)
        {
            Console.WriteLine($"Call Recording Status update at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"RecordingSid: {payload.RecordingSid}, " +
                $"RecordingStatus: {payload.RecordingStatus}, " +
                $"RecordingUrl: {payload.RecordingUrl}, " +
                $"CallSid: {payload.CallSid}");
            return StatusCode(200);
        }

        public class Payload
        {
            public string RecordingSid { get; set; }
            public string RecordingStatus { get; set; }
            public string RecordingUrl { get; set; }
            public string CallSid { get; set; }
            public string CallStatus { get; set; }
            public string From { get; set; }
            public string To { get; set; }
            public string Direction { get; set; }
        }
    }
}
