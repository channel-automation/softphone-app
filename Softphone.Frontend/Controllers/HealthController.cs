using Microsoft.AspNetCore.Mvc;

namespace Softphone.Frontend.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class HealthController : Controller
    {
        [HttpGet]
        [Route("/health")]
        public IActionResult Check()
        {
            return Ok(new { 
                status = "healthy", 
                timestamp = DateTime.UtcNow.ToString("o") 
            });
        }
    }
} 