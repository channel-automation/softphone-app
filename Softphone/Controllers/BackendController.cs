using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Softphone.Helpers;
using Softphone.Services;
using Twilio.Jwt.AccessToken;
using Twilio.TwiML;
using Twilio.TwiML.Voice;

namespace Softphone.Controllers
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

                VoiceResponse voiceResponse = new VoiceResponse();

                // Add a small delay to ensure client is ready
                voiceResponse.Pause(1);

                //Create dial for each user that is assigned on the twilio number
                foreach (long userId in workspaceNumberUsers.Select(w => w.UserId))
                {
                    var user = await _userService.FindById(userId);

                    var dial = new Dial(
                    callerId: payload.To,
                    answerOnBridge: true,
                    timeout: 30);

                    dial.Client(
                        identity: user.Username,
                        statusCallbackEvent: new Client.EventEnum[] { Client.EventEnum.Initiated, Client.EventEnum.Ringing, Client.EventEnum.Answered, Client.EventEnum.Completed },
                        statusCallback: new Uri($"{GetBaseUrl()}/Backend/InboundStatusCallback")
                    );

                    voiceResponse.Append(dial);
                }

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
        public async Task<IActionResult> OutboundVoice([FromForm] Payload payload)
        {
            Console.WriteLine($"Outbound Voice request at {DateTime.Now.ToString("o")}.");
            Console.WriteLine($"From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");
            try
            {
                VoiceResponse voiceResponse = new VoiceResponse();

                // Add a small delay to ensure client is ready
                voiceResponse.Pause(1);

                var dial = new Dial(
                    callerId: payload.From,
                    answerOnBridge: true,
                    timeout: 30,
                    record: Dial.RecordEnum.RecordFromAnswer,
                    recordingStatusCallback: new Uri($"{GetBaseUrl()}/Backend/RecordingStatusCallback"));

                dial.Number(
                    phoneNumber: new Twilio.Types.PhoneNumber(payload.To),
                    statusCallbackEvent: new Number.EventEnum[] { Number.EventEnum.Initiated, Number.EventEnum.Ringing, Number.EventEnum.Answered, Number.EventEnum.Completed },
                    statusCallback: new Uri($"{GetBaseUrl()}/Backend/OutboundStatusCallback")
                );

                voiceResponse.Append(dial);
                Console.WriteLine($"Outbound Voice Generated TwiML: {voiceResponse.ToString()}");

                Response.ContentType = "text/xml";
                return Content(voiceResponse.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Outbound Voice Exception: {ex.Message}");
                return StatusCode(500, $"Outbound Voice Exception: {ex.Message}");
            }
        }

        [HttpPost]
        public IActionResult InboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Inbound Call Status at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallStatus}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}," +
                $" Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpPost]
        public IActionResult OutboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Outbound Call Status at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallStatus}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}, " +
                $"Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpGet]
        public IActionResult InboundStatusCallback()
        {
            Payload payload = new Payload();
            payload.CallSid = Request.Query["CallSid"];
            payload.CallStatus = Request.Query["CallStatus"];
            payload.From = Request.Query["From"];
            payload.To = Request.Query["To"];
            payload.Direction = Request.Query["Direction"];

            Console.WriteLine($"Inbound Status Callback at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallStatus}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}," +
                $" Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpGet]
        public IActionResult OutboundStatusCallback()
        {
            Payload payload = new Payload();
            payload.CallSid = Request.Query["CallSid"];
            payload.CallStatus = Request.Query["CallStatus"];
            payload.From = Request.Query["From"];
            payload.To = Request.Query["To"];
            payload.Direction = Request.Query["Direction"];

            Console.WriteLine($"Outbound Status Callback at {DateTime.Now.ToString("o")}.");
            Console.WriteLine(
                $"CallSid: {payload.CallSid}, " +
                $"CallStatus: {payload.CallStatus}, " +
                $"From: {payload.From}, " +
                $"To: {payload.To}," +
                $" Direction: {payload.Direction}");
            return StatusCode(200);
        }

        [HttpGet]
        public IActionResult RecordingStatusCallback()
        {
            Payload payload = new Payload();
            payload.RecordingSid = Request.Query["RecordingSid"];
            payload.RecordingStatus = Request.Query["RecordingStatus"];
            payload.RecordingUrl = Request.Query["RecordingUrl"];
            payload.CallSid = Request.Query["CallSid"];

            Console.WriteLine($"Recording Status Callback at {DateTime.Now.ToString("o")}.");
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
