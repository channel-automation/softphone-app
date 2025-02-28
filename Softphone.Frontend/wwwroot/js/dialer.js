(function ($) {
    "use strict"
    const Device = Twilio.Device;
    let token = "";
    let expiry = new Date();

    let dialer_form;
    let call_button;
    let end_button;

    $(() => {
        dialer_form = $("#frmDialer");
        initializeFormControls(dialer_form);
        call_button = $("#btnPlaceCall");
        end_button = $("#btnEndCall");

        dialer_form.find("input").on("keyup", resetDialer);
        dialer_form.find("select").on("change", resetDialer);
        resetDialer();

        call_button.on("click", () => {
            if (new Date() > expiry) { //Check token if expired
                startAjaxSpinner(call_button[0]);
                getAccessToken();
            }
            else callConnect();
        });

        end_button.on("click", callDisconnect);
    });

    function resetDialer() {
        let input = dialer_form.find("input");
        let select = dialer_form.find("select");
        let isValid = (input.inputmask("isComplete") && select.val() !== null);
        dialer_form.find("small").text(select.val());
        call_button.prop("disabled", !isValid);
        end_button.hide();
    }

    function getAccessToken() {
        $.ajax({
            url: "https://webhook.call-app.channelautomation.com/api/token",
            type: "get", dataType: "json",
            success: callConnect(),
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

    function callConnect() {
        let to = dialer_form.find("input").inputmask("unmaskedvalue");
        let from = dialer_form.find("select").val();
    }

    function callDisconnect() {

        resetDialer();
    }

})(jQuery);







function placeCall(btn) {
    let expiry = new Date("2025-02-28T01:39:42.207Z");
    let now = new Date();
    alert(now > expiry ? "Expired!" : "Not Expired!");


    return false;

    //startAjaxSpinner(btn);
    //$.ajax({
    //    url: "https://webhook.call-app.channelautomation.com/api/token",
    //    type: "get",
    //    dataType: "json",
    //    success: function (response) {
    //        const token = response.token;
    //        const device = new Device(token);

    //        toastr.info("Connecting call..", "Dialer");
    //        device.connect();

    //        //document.getElementById('hangup-button').addEventListener('click', () => {
    //        //    device.disconnectAll();
    //        //});

    //        device.on("connect", () => {
    //            toastr.success("Call connected.", "Dialer");
    //        });

    //        device.on("disconnect", () => {
    //            toastr.warning("Call disconnected.", "Dialer");
    //        });

    //        device.on("error", (error) => {
    //            toastr.error(`Call Error: ${error}`, "Dialer");
    //        });
    //    },
    //    error: function (ex) {
    //        alert(`Error: ${JSON.stringify(ex)}`);
    //    }
    //});

}
