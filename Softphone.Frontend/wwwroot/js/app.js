//Globally set Toast JS options
toastr.options = { "positionClass": "toast-bottom-right" };

//Globally declared repeatedly used values.
var baseUrl = location.protocol + "//" + location.host
var globalWorkspaceId = 0;

//This function is to initialized form control js widget's configs
function initializeFormControls(parent) {
    //icheck
    $(parent).find(".icheck").iCheck({
        checkboxClass: "icheckbox_square-purple",
        radioClass: "iradio_square-purple"
    });
    //Select2
    $(parent).find(".select2-common").select2({
        placeholder: "Select Value",
    });
    $(parent).find(".select2-common-modal").select2({
        dropdownParent: $(".bootbox").last(),
        placeholder: "Select Value",
    });
    //Select2 Agent Phone
    $(parent).find(".select2-agentphone").select2({
        ajax: { url: baseUrl + "/AgentList/RemoteAgentPhone?workspaceId=" + globalWorkspaceId },
        placeholder: "Select Agent",
        templateResult: function (data) {
            if (data.loading) return data.text;
            let htm = "<div class='row'><div class='col-12'>";
            htm += data.text + "<br />";
            htm += "<span class='badge bg-light p-1 mr-1 mb-1'>" + new Inputmask("(999) 999-9999").format(data.id.replaceAll("+1", "")) + "</span>";
            htm += "</div></div>"
            return $(htm);
        }
    });
    //Input Mask US Phone
    $(parent).find(".inputmask-usphone").inputmask("(999) 999-9999")
}

//Custom bootbox form modal implementation
function bootModal(title, message, size) {
    let box = bootbox.dialog({
        title: title,
        message: message,
        size: size == undefined ? "medium" : size,
        centerVertical: true,
    });
    _bootboxScrollFix(box);
    return box;
}

//Custom bootbox confirm dialog implementation
function bootConfirm(message, callbackEvent) {
    let box = bootbox.confirm({
        title: "<span><i class='fa fa-info-circle'></i> Confirmation</span>",
        message: message,
        size: "small",
        centerVertical: true,
        callback: callbackEvent,
        buttons: {
            cancel: { label: "Cancel" },
            confirm: { label: "Ok", className: "bg-gradient-dark text-center" },
        },
    });
    _bootboxScrollFix(box);
    return box;
}

//This function is to solve bootstrap multi-modal scroll issue. (Just use it here privately)
function _bootboxScrollFix(box) {
    box.on("hidden.bs.modal", function () {
        if ($(".modal:visible").length) //check if any modal is open
            $("body").addClass("modal-open");//add class to body
    });
}

//This function is to display server validation errors in multiple toastr messages
function errorMessages(errors) {
    $.each(errors, function (i, v) {
        toastr.error(v, "Error..");
    });
    return errors.length > 0;
}