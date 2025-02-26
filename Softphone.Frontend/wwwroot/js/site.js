
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
