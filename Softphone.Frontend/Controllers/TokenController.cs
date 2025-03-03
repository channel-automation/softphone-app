using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using System.Net.Http;
using System.Text.Json;

namespace Softphone.Frontend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class TokenController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IWorkspaceService _workspaceService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public TokenController(
        IUserService userService,
        IWorkspaceService workspaceService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _userService = userService;
        _workspaceService = workspaceService;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            // Get the current user
            var user = await _userService.FindByUsername(User.Identity?.Name);
            if (user == null)
            {
                return Unauthorized("User not found");
            }

            // Get the workspace
            var workspace = await _workspaceService.FindById(user.WorkspaceId);
            if (workspace == null)
            {
                return BadRequest("Workspace not found");
            }

            // Check if Twilio is configured
            if (string.IsNullOrEmpty(workspace.TwilioAccountSID) || string.IsNullOrEmpty(workspace.TwilioAuthToken))
            {
                return BadRequest("Twilio is not configured");
            }

            // Get the backend API URL from configuration
            var backendUrl = _configuration["BackendApiUrl"] ?? "https://backend-production-3d08.up.railway.app";
            var tokenUrl = $"{backendUrl}/api/token";

            // Create HTTP client
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            // Add headers
            client.DefaultRequestHeaders.Add("Accept", "application/json");
            client.DefaultRequestHeaders.Add("User-Agent", "Softphone.Frontend/1.0");

            // Make request to backend
            var response = await client.GetAsync(tokenUrl);
            var content = await response.Content.ReadAsStringAsync();

            // Log the response
            Console.WriteLine($"Token response status: {response.StatusCode}");
            Console.WriteLine($"Token response content: {content}");

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)response.StatusCode, $"Failed to get token: {content}");
            }

            // Return the token response as is
            return Content(content, "application/json");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error generating token: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            return StatusCode(500, $"Error generating token: {ex.Message}");
        }
    }
} 