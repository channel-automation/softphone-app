using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Services;
using Twilio.Jwt.AccessToken;
using Twilio.TwiML;
using Twilio.TwiML.Voice;
using static Twilio.TwiML.Voice.Client;

namespace Softphone.Frontend.Controllers
{
    [IgnoreAntiforgeryToken]
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

        [HttpGet]
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
                Console.WriteLine($"Access Token Exception: {ex.Message}");
                return StatusCode(500, $"Access Token Exception: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> InboundVoice([FromForm] Payload payload)
        {
            Console.WriteLine($"Inbound Voice request at {DateTime.Now.ToString("o")}.");
            Console.WriteLine($"From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");
            try
            {
                //Get user based on "To" number
                var workspaceNumber = await _workspaceService.FindByTwilioNumber(payload.To);
                var workspaceNumberUsers = await _workspaceService.GetTwilioNumberUsers(workspaceNumber.Id);
                var user = await _userService.FindById(workspaceNumberUsers.First().UserId);

                VoiceResponse voiceResponse = new VoiceResponse();

                // Add a small delay to ensure client is ready
                voiceResponse.Pause(1);

                var dial = new Dial(
                    callerId: workspaceNumber.TwilioNumber,
                    answerOnBridge: true,
                    timeout: 30);

                dial.Client(
                    identity: user.Username,
                    statusCallbackEvent: new EventEnum[] { EventEnum.Initiated, EventEnum.Ringing, EventEnum.Answered, EventEnum.Completed },
                    statusCallback: new Uri($"{GetBaseUrl()}/Backend/InboundCallStatus"),
                    statusCallbackMethod: new Twilio.Http.HttpMethod("post")
                );

                voiceResponse.Append(dial);
                Console.WriteLine($"Inbound Voice Generated TwiML: {voiceResponse.ToString()}");

                Response.ContentType = "text/xml";
                return Content(voiceResponse.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Inbound Voice Exception: {ex.Message}");
                return StatusCode(500, $"Inbound Voice Exception: {ex.Message}");
            }
        }

        [HttpPost]
        public IActionResult InboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Inbound Call Status update at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallSid}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}, " +
                $"Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpPost]
        public IActionResult OutboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Outbound Call Status update at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallSid}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}, " +
                $"Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpPost]
        public IActionResult CallRecordingStatus([FromForm] Payload payload)
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

        private string GetBaseUrl()
        {
            var host = Request.Host.ToUriComponent();
            var pathBase = Request.PathBase.ToUriComponent();
            return $"{Request.Scheme}://{host}{pathBase}";
        }
    }
}
