using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Services;
using Softphone.Frontend.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace Softphone.Frontend.Controllers;

[Authorize]
public class ConfigurationController : Controller
{
    private IUserService _userService;
    private IWorkspaceService _workspaceService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public ConfigurationController(
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

    public async Task<IActionResult> Start()
    {
        try
        {
            var user = await _userService.FindByUsername(User.Identity?.Name);
            if (user == null)
            {
                // Create a default workspace if user doesn't exist
                return PartialView(new WorkspaceBO 
                { 
                    Id = 0,
                    Name = "New Workspace",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = User.Identity?.Name
                });
            }

            var workspace = await _workspaceService.FindById(user.WorkspaceId);
            if (workspace == null)
            {
                // Create a default workspace if it doesn't exist
                workspace = new WorkspaceBO
                {
                    Id = user.WorkspaceId,
                    Name = "New Workspace",
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = User.Identity?.Name
                };
            }

            return PartialView(workspace);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in Start action: {ex.Message}");
            // Return a default workspace in case of any error
            return PartialView(new WorkspaceBO 
            { 
                Id = 0,
                Name = "New Workspace",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name
            });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Save(WorkspaceBO workspace)
    {
        var errors = new List<string>();
        
        try
        {
            // 1. Update workspace in database
            await _workspaceService.Update(workspace, User.Identity?.Name ?? "system");
            
            // 2. If Twilio credentials are provided, configure Twilio
            if (!string.IsNullOrEmpty(workspace.TwilioAccountSID) && !string.IsNullOrEmpty(workspace.TwilioAuthToken))
            {
                // Get the backend API URL from configuration
                var backendUrl = _configuration["BackendApiUrl"] ?? "https://backend-production-3d08.up.railway.app";
                var configureUrl = $"{backendUrl}/api/twilio/configure-from-credentials";
                
                // Create HTTP client
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(30); // Increase timeout
                
                // Add headers
                client.DefaultRequestHeaders.Add("Accept", "application/json");
                client.DefaultRequestHeaders.Add("User-Agent", "Softphone.Frontend/1.0");
                
                // Prepare request data
                var requestData = new
                {
                    workspaceId = workspace.Id,
                    accountSid = workspace.TwilioAccountSID,
                    authToken = workspace.TwilioAuthToken
                };
                
                // Convert to JSON
                var content = new StringContent(
                    JsonSerializer.Serialize(requestData),
                    Encoding.UTF8,
                    "application/json");
                
                // Send request to configure Twilio
                Console.WriteLine($"📡 Sending request to configure Twilio: {configureUrl}");
                Console.WriteLine($"📦 Request data: {JsonSerializer.Serialize(requestData)}");
                
                var response = await client.PostAsync(configureUrl, content);
                
                // Log the response
                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"📥 Response status: {response.StatusCode}, Content: {responseContent}");
                
                // Check if successful
                if (!response.IsSuccessStatusCode)
                {
                    errors.Add($"Failed to configure Twilio: {responseContent}");
                }
            }
        }
        catch (Exception ex)
        {
            errors.Add($"Error saving configuration: {ex.Message}");
            Console.WriteLine($"Error in Save action: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
        }
        
        return Json(errors);
    }
    
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> ClearTwilioConfiguration(long workspaceId)
    {
        try
        {
            // Log the request
            Console.WriteLine($" Clearing Twilio configuration for workspace {workspaceId}");
            
            // Only update the workspace to clear Twilio credentials
            var workspace = await _workspaceService.FindById(workspaceId);
            if (workspace != null)
            {
                workspace.TwilioAccountSID = null;
                workspace.TwilioAuthToken = null;
                workspace.TwilioTwiMLAppSID = null;
                await _workspaceService.Update(workspace, User.Identity?.Name ?? "system");
                Console.WriteLine(" Twilio credentials cleared from workspace!");
            }
            
            return Json(new { success = true, message = "Twilio configuration cleared successfully. Please run the provided SQL commands in Supabase." });
        }
        catch (Exception ex)
        {
            Console.WriteLine($" Error clearing Twilio configuration: {ex.Message}");
            Console.WriteLine($" Stack trace: {ex.StackTrace}");
            return Json(new { success = false, error = $"Error clearing Twilio configuration: {ex.Message}" });
        }
    }
}
