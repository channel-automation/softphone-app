using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Softphone.Frontend.Services;

namespace Softphone.Frontend.Pages
{
    public class AgentListModel : PageModel
    {
        private IUserService _userService;
        private IWorkspaceService _workspaceService;

        public AgentListModel(IUserService userService, IWorkspaceService workspaceService)
        {
            _userService = userService;
            _workspaceService = workspaceService;
        }

        public async Task OnGet()
        {
            var user = await _userService.FindByUsername(User.Identity.Name);
            ViewData["WorkspaceId"] = user.WorkspaceId;
        }

        public async Task<JsonResult> OnPostSearch(int draw, int start, int length, string search)
        {
            string sort = Request.Form["columns[" + Request.Form["order[0][column]"] + "][data]"];
            string sortdir = Request.Form["order[0][dir]"];

            var result = await _userService.PagingAgents(start, length, sort, sortdir, search ?? string.Empty);
            return new JsonResult(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
        }

        public async Task<IActionResult> OnGetEditAgent() 
        {
            return Partial("Partial/EditAgent");
        }
    }
}
