using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Services;
using Twilio.Jwt.AccessToken;

namespace Softphone.Frontend.Controllers
{
    [EnableCors("AllowSpecificOrigins")]
    public class WebServiceController : ControllerBase
    {
        private IWorkspaceService _workspaceService;
        private IUserService _userService;

        public WebServiceController(IWorkspaceService workspaceService, IUserService userService)
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
    }
}
