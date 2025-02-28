(function ($) {
    "use strict"
    let device = null;
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
            success: (response) => {
                if (device === null) setupDevice(response.token);
                else device.updateToken(response.token);
                expiry = new Date(response.expires);
                callConnect()
            },
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

    function setupDevice(token) {
        device = new Twilio.Device(token);
        device.on("connect", () => {
            toastr.success("Call connected.", "Dialer");
        });
        device.on("disconnect", () => {
            toastr.warning("Call disconnected.", "Dialer");
        });
        device.on("error", (error) => {
            toastr.error(`Call Error: ${error}`, "Dialer");
        });
    }

    function callConnect() {
        let to = `+1${dialer_form.find("input").inputmask("unmaskedvalue")}`;
        let from = dialer_form.find("select").val();

        toastr.info("Connecting call..", "Dialer");
        device.connect({ To: to, From: from });
    }

    function callDisconnect() {
        device.disconnectAll();
        resetDialer();
    }

})(jQuery);
