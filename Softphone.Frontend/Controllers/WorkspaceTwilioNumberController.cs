using Microsoft.AspNetCore.Mvc;
using Softphone.Frontend.Helpers;
using Softphone.Frontend.Models;
using Softphone.Frontend.Services;
using Softphone.Frontend.Validators;
using Supabase.Gotrue;

namespace Softphone.Frontend.Controllers
{
    public class WorkspaceTwilioNumberController : Controller
    {
        private IWorkspaceService _workspaceService;
        private IWorkspaceValidator _workspaceValidator;
        private IUserService _userService;

        public WorkspaceTwilioNumberController(
            IWorkspaceService workspaceService, 
            IWorkspaceValidator workspaceValidator, 
            IUserService userService)
        {
            _workspaceService = workspaceService;
            _workspaceValidator = workspaceValidator;
            _userService = userService;
        }

        public async Task<IActionResult> Start(long workspaceId)
        {
            var workspace = await _workspaceService.FindById(workspaceId);
            if (workspace == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

            return PartialView(workspace);
        }

        public async Task<IActionResult> GetList(int draw, int start, int length, long workspaceId)
        {
            var result = await _workspaceService.PagingTwilioNumbers(start, length, workspaceId);
            return Json(new { draw, recordsFiltered = result.RecordsTotal, result.RecordsTotal, result.Data });
        }

        public IActionResult Add(long workspaceId)
        {
            ViewBag.Assigned = CommonHelper.JsonSerialize(new List<Assigned>());
            var model = new WorkspaceTwilioNumberBO { WorkspaceId = workspaceId };
            return PartialView("Edit", model);
        }

        public async Task<IActionResult> Edit(long id)
        {
            var model = await _workspaceService.GetTwilioNumber(id);
            if (model == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

            var list = new List<Assigned>();
            foreach (var content in await _workspaceService.GetTwilioNumberUsers(model.Id))
            {
                var user = await _userService.FindById(content.UserId);
                list.Add(new Assigned { Id = user.Id, Name = $"{user.FirstName} {user.LastName}" });
            }

            ViewBag.Assigned = CommonHelper.JsonSerialize(list);
            return PartialView(model);
        }

        [HttpPost]
        public async Task<IActionResult> Save(WorkspaceTwilioNumberBO model, string assigned)
        {
            var wtnUsers = new List<WorkspaceTwilioNumberUserBO>();
            foreach (var content in CommonHelper.JsonDeserialize<List<Assigned>>(assigned))
                wtnUsers.Add(new WorkspaceTwilioNumberUserBO { UserId = content.Id });

            if (model.Id == 0) return await AddSubmit(model, wtnUsers);
            else return await EditSubmit(model, wtnUsers);
        }

        private async Task<IActionResult> AddSubmit(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
        {
            var errors = await _workspaceValidator.ValidateAddTwilioNumber(model);
            if (!errors.Any()) await _workspaceService.CreateTwilioNumber(model, wtnUsers);
            return Json(new { Errors = errors });
        }

        private async Task<IActionResult> EditSubmit(WorkspaceTwilioNumberBO model, IList<WorkspaceTwilioNumberUserBO> wtnUsers)
        {
            var fromDb = await _workspaceService.GetTwilioNumber(model.Id);
            if (fromDb == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

            var errors = await _workspaceValidator.ValidateEditTwilioNumber(model);
            if (!errors.Any())
            {
                fromDb.TwilioNumber = model.TwilioNumber;
                await _workspaceService.UpdateTwilioNumber(fromDb, wtnUsers);
            }

            return Json(new { Errors = errors });
        }

        public async Task<IActionResult> Delete(long id)
        {
            var model = await _workspaceService.GetTwilioNumber(id);
            if (model == null) return AjaxDataError(ErrorMessage.DataError_NoLongerExist);

            var errors = new List<string>();
            string error = await _workspaceService.DeleteTwilioNumber(model);
            if (error != string.Empty) errors.Add(error);

            return Json(new { Errors = errors });
        }

        public async Task<IActionResult> Select(long workspaceId, string assigned)
        {
            var list = CommonHelper.JsonDeserialize<List<Assigned>>(assigned);
            ViewBag.SelectedIds = list.Select(w => w.Id).ToList();

            var users = await _userService.FindByWorkspaceId(workspaceId);
            users = users.OrderBy(w => w.Role).ThenBy(w => w.FirstName).ThenBy(w => w.LastName).ToList();
            return PartialView(users);
        }

        [HttpPost]
        public async Task<IActionResult> SelectDone()
        {
            var list = new List<Assigned>();
            foreach (string key in Request.Form.Keys.Where(w => w.Contains("UserId-")))
            {
                long id = Convert.ToInt64(key.Replace("UserId-", ""));
                var user = await _userService.FindById(id);
                list.Add(new Assigned { Id = user.Id, Name = $"{user.FirstName} {user.LastName}" });
            }
            return Json(list);
        }

        private class Assigned
        {
            public long Id { get; set; }
            public string Name { get; set; }
        }

        private IActionResult AjaxDataError(string message)
        {
            return StatusCode(418, message);
        }
    }
}
