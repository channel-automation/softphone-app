//Globally set Toast JS options
toastr.options = { "positionClass": "toast-bottom-right" };

//Globally declared repeatedly used values.
var baseUrl = "";
var backendKey = "";

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
        width: "100%",
    });
    $(parent).find(".select2-common-modal").select2({
        dropdownParent: $(".bootbox").last(),
        placeholder: "Select Value",
        width: "100%",
    });
    //Select2 Agent Phone
    $(parent).find(".select2-phone").select2({
        ajax: { url: baseUrl + "/Home/RemotePhoneNo" },
        placeholder: "Select Phone No.",
        width: "100%",
        templateResult: function (data) {
            if (data.loading) return data.text;
            let htm = "<div class='row'><div class='col-12'>";
            htm += data.text + "<br />";
            htm += "<span class='badge bg-light p-1 mr-1 mb-1'>" + new Inputmask("(999) 999-9999").format(data.id.replaceAll("+1", "")) + "</span>";
            htm += "</div></div>"
            return $(htm);
        }
    });
    //Select2 workspace
    $(parent).find(".select2-workspace-modal").select2({
        dropdownParent: $(".bootbox").last(),
        ajax: { url: baseUrl + "/Workspace/Remote" },
        placeholder: "Select Workspace",
        width: "100%"
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

//Custom sweetalert2 confirm dialog implementation
function swalConfirm(title, message, callbackEvent) {
    Swal.fire({
        title: title,
        html: message,
        showCancelButton: true,
        confirmButtonText: "<i class='fas fa-check-circle'></i> Yes",
        cancelButtonText: "<i class='fas fa-times-circle'></i> No",
        allowOutsideClick: false,
        allowEscapeKey: false,
        width: "auto",
        customClass: {
            title: "text-lg",
        }
    }).then((result) => {
        if (result.isConfirmed) callbackEvent();
    });
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