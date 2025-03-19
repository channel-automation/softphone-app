using Microsoft.AspNetCore.Mvc;
using Softphone.Helpers;
using Softphone.Models;
using Softphone.Services;
using Twilio.Jwt.AccessToken;
using Twilio.TwiML;
using Twilio.TwiML.Voice;
using static Softphone.Controllers.BackendController;

namespace Softphone.Controllers
{
    [IgnoreAntiforgeryToken]
    public class BackendController : ControllerBase
    {
        private IVoiceCallService _voiceCallService;
        private IWorkspaceService _workspaceService;
        private IUserService _userService;

        public BackendController(
            IVoiceCallService voiceCallService,
            IWorkspaceService workspaceService, 
            IUserService userService)
        {
            _voiceCallService = voiceCallService;
            _workspaceService = workspaceService;
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> AccessToken(string backendKey)
        {
            if (backendKey != BackendKey.Value) return StatusCode(401, "Unathorized Access!");
            try
            {
                var user = await _userService.FindByUsername(User.Identity.Name);
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
                Console.WriteLine($"[Access Token] EXCEPTION: {ex.Message}");
                return StatusCode(500, $"[Access Token] EXCEPTION: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> PlaceCall(string backendKey, string from, string to)
        {
            if (backendKey != BackendKey.Value) return StatusCode(401, "Unathorized Access!");
            try
            {
                var user = await _userService.FindByUsername(User.Identity.Name);
                var model = new VoiceCallBO();
                model.WorkspaceId = user.WorkspaceId;
                model.Identity = user.Username;
                model.Type = CallType.Outbound;
                model.From = from;
                model.To = to;
                model.CallbackCallSID = string.Empty;
                model.RecordingCallSID = string.Empty;
                await _voiceCallService.Create(model, user.Username);
                return new JsonResult("");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Place Call] EXCEPTION: {ex.Message}");
                return StatusCode(500, $"[Place Call] EXCEPTION: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> InboundVoice([FromForm] Payload payload)
        {
            try
            {
                Console.WriteLine($"Inbound Voice request at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
                Console.WriteLine($"From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");

                //Get user based on "To" number
                var workspaceNumber = await _workspaceService.FindByTwilioNumber(payload.To);
                var workspaceNumberUsers = await _workspaceService.GetTwilioNumberUsers(workspaceNumber.Id);

                VoiceResponse voiceResponse = new VoiceResponse();
                voiceResponse.Pause(1); // Add a small delay to ensure client is ready

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
                Console.WriteLine($"[Inbound Voice] EXCEPTION: {ex.Message}");
                return StatusCode(500, $"[Inbound Voice] EXCEPTION: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> OutboundVoice([FromForm] Payload payload)
        {
            try
            {
                Console.WriteLine($"Outbound Voice request at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
                Console.WriteLine($"From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");

                VoiceResponse voiceResponse = new VoiceResponse();
                voiceResponse.Pause(1); // Add a small delay to ensure client is ready

                var dial = new Dial(
                    callerId: payload.From,
                    answerOnBridge: true,
                    timeout: 30,
                    record: Dial.RecordEnum.RecordFromAnswer,
                    recordingStatusCallback: new Uri($"{GetBaseUrl()}/Backend/OutboundRecordingCallback"));

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
                Console.WriteLine($"[Outbound Voice] EXCEPTION: {ex.Message}");
                return StatusCode(500, $"[Outbound Voice] EXCEPTION: {ex.Message}");
            }
        }

        [HttpPost]
        public IActionResult InboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Inbound Call Status at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");
            return StatusCode(200);
            //try
            //{
            //    Console.WriteLine($"Inbound Call Status at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            //    Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");

            //    //Process to Database
            //    var user = await _userService.FindByUsername(payload.From.Replace("client:", ""));
            //    var latest = await _statusCallbackService.LatestByCallSID(payload.CallSid);
            //    var model = new StatusCallbackBO();
            //    model.WorkspaceId = user.WorkspaceId;
            //    model.Type = CallType.Inbound;
            //    model.Identity = user.Username;
            //    model.CallSID = payload.CallSid;
            //    model.CallStatus = payload.CallStatus;
            //    model.FromNumber = latest != null ? latest.FromNumber : string.Empty;
            //    model.ToNumber = payload.To;
            //    model.Payload = payload;
            //    await _statusCallbackService.Create(model, "endpoint");

            //    return StatusCode(200);
            //}
            //catch (Exception ex)
            //{
            //    Console.WriteLine($"[Inbound Call Status] EXCEPTION: {ex.Message}");
            //    return StatusCode(500, $"[Inbound Call Status] EXCEPTION: {ex.Message}");
            //}
        }

        [HttpPost]
        public IActionResult OutboundCallStatus([FromForm] Payload payload)
        {
            Console.WriteLine($"Outbound Call Status at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");
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

            Console.WriteLine($"Inbound Status Callback at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");
            return StatusCode(200);
            //try
            //{
            //    Payload payload = new Payload();
            //    payload.CallSid = Request.Query["CallSid"];
            //    payload.CallStatus = Request.Query["CallStatus"];
            //    payload.From = Request.Query["From"];
            //    payload.To = Request.Query["To"];
            //    payload.Direction = Request.Query["Direction"];

            //    Console.WriteLine($"Inbound Status Callback at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            //    Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");

            //    //Process to Database
            //    var user = await _userService.FindByUsername(payload.From.Replace("client:", ""));
            //    var latest = await _statusCallbackService.LatestByCallSID(payload.CallSid); 
            //    var model = new StatusCallbackBO();
            //    model.WorkspaceId = user.WorkspaceId;
            //    model.Type = CallType.Inbound;
            //    model.Identity = user.Username;
            //    model.CallSID = payload.CallSid;
            //    model.CallStatus = payload.CallStatus;
            //    model.FromNumber = latest != null ? latest.FromNumber : string.Empty;
            //    model.ToNumber = payload.To;
            //    model.Payload = payload;
            //    await _statusCallbackService.Create(model, "endpoint");
            //    return StatusCode(200);
            //}
            //catch (Exception ex)
            //{
            //    Console.WriteLine($"[Inbound Status Callback] EXCEPTION: {ex.Message}");
            //    return StatusCode(500, $"[Inbound Status Callback] EXCEPTION: {ex.Message}");
            //}
        }

        [HttpGet]
        public async Task<IActionResult> OutboundStatusCallback()
        {
            try
            {
                Payload payload = new Payload();
                payload.CallSid = Request.Query["CallSid"];
                payload.CallStatus = Request.Query["CallStatus"];
                payload.From = Request.Query["From"];
                payload.To = Request.Query["To"];
                payload.Direction = Request.Query["Direction"];

                Console.WriteLine($"Outbound Status Callback at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
                Console.WriteLine($"CallSid: {payload.CallSid}, CallStatus: {payload.CallStatus}, From: {payload.From}, To: {payload.To}, Direction: {payload.Direction}");

                //Database process
                VoiceCallBO outbound = await _voiceCallService.FindByCallbackCallSID(payload.CallSid);
                if (outbound == null)
                {
                    outbound = await _voiceCallService.FindNewOutbound(payload.From, payload.To);
                    outbound.CallbackCallSID = payload.CallSid;
                    await _voiceCallService.Update(outbound, "endpoint");
                }
                //Save Callback
                var model = new VoiceCallCallbackBO();
                model.VoiceId = outbound.Id;
                model.CallStatus = payload.CallStatus;
                model.Payload = payload;
                await _voiceCallService.Create(model);
                return StatusCode(200);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Outbound Status Callback] EXCEPTION: {ex.Message}");
                return StatusCode(500, $"[Outbound Status Callback] EXCEPTION: {ex.Message}");
            }
        }

        [HttpGet]
        public IActionResult OutboundRecordingCallback()
        {
            Payload payload = new Payload();
            payload.RecordingSid = Request.Query["RecordingSid"];
            payload.RecordingStatus = Request.Query["RecordingStatus"];
            payload.RecordingUrl = Request.Query["RecordingUrl"];
            payload.CallSid = Request.Query["CallSid"];

            Console.WriteLine($"Recording Status Callback at {DateTime.Now.ToString("MMM d, yyyy h:mm:ss tt zzz")}.");
            Console.WriteLine($"RecordingSid: {payload.RecordingSid}, RecordingStatus: {payload.RecordingStatus}, RecordingUrl: {payload.RecordingUrl}, CallSid: {payload.CallSid}");
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
            public int Duration { get; set; }
        }

        private string GetBaseUrl()
        {
            string host = Request.Host.ToUriComponent();
            string pathBase = Request.PathBase.ToUriComponent();
            string scheme = Request.Scheme.Replace("s", "") + "s"; //Make sure http become https
            return $"{scheme}://{host}{pathBase}";
        }
    }
}
