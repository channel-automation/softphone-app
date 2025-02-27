//Globally declared repeatedly used values.
var baseUrl = location.protocol + "//" + location.host;

//This function is to initialized form control js widget's configs
function initializeFormControls(parent) {
    //icheck
    $(parent).find('.icheck').iCheck({
        checkboxClass: 'icheckbox_square-grey',
        radioClass: 'iradio_square-grey'
    });
    //Select2
    $(parent).find('.select2-common').select2({
        placeholder: "Select value",
    });
    $(parent).find('.select2-common-modal').select2({
        dropdownParent: $(".bootbox").last(),
        placeholder: "Select value",
    });
    //Select2 Category
    //$(parent).find('.select2-category-modal').select2({
    //    dropdownParent: $(".bootbox").last(),
    //    ajax: { url: baseUrl + '/Inventory/Category/Remote' },
    //    placeholder: "Select category"
    //});
    //Select2 Material
    //$(parent).find('.select2-material-modal').select2({
    //    dropdownParent: $(".bootbox").last(),
    //    ajax: { url: baseUrl + '/Inventory/Material/Remote' },
    //    placeholder: "Select material",
    //    templateResult: function (data) {
    //        if (data.loading) return data.text;
    //        let htm = "<div class='row'><div class='col-12'>";
    //        htm += data.text + "<br />";
    //        htm += "<span class='badge bg-light p-1 mr-1 mb-1'>" + data.unit + "</span>";
    //        htm += "<span class='badge bg-light p-1 mr-1 mb-1'>" + data.category + "</span>";
    //        htm += "</div></div>"
    //        return $(htm);
    //    }
    //});
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
    box.on('hidden.bs.modal', function () {
        if ($('.modal:visible').length) //check if any modal is open
            $('body').addClass('modal-open');//add class to body
    });
}

//This function is to display server validation errors in multiple toastr messages
function errorMessages(errors) {
    $.each(errors, function (i, v) {
        toastr.error(v, "Error..");
    });
    return errors.length > 0;
}

//This function is to set the message and back to list after a success delete event
function successBack(toUrl, message) {
    toUrl = baseUrl + toUrl;
    localStorage.removeItem(toUrl);
    localStorage.setItem(toUrl, message);
    location.href = toUrl;
}

//This function is to set the message and redirect the page after a success submit event
function successRedirect(message, url) {
    localStorage.removeItem(url);
    localStorage.setItem(url, message);
    location.href = url;
}

//This function is to display the message stored before the navigation
function successMessage() {
    let message = localStorage.getItem(location.href);
    if (message != null) {
        toastr.success(message, "Success!");
        localStorage.removeItem(location.href);
    }
}