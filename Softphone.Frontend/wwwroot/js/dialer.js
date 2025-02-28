(function ($) {
    "use strict"
    let device = null;
    let expiry = new Date();

    let dialer_form;
    let call_button;
    let end_button;

    $(() => {
        getAccessToken();

        dialer_form = $("#frmDialer");
        initializeFormControls(dialer_form);
        call_button = $("#btnPlaceCall");
        end_button = $("#btnEndCall");

        dialer_form.find("input").on("keyup", resetDialer);
        dialer_form.find("select").on("change", resetDialer);
        resetDialer();

        call_button.on("click", callConnect);
        end_button.on("click", callDisconnect);
    });

    function resetDialer() {
        let input = dialer_form.find("input");
        let select = dialer_form.find("select");
        let isValid = (input.inputmask("isComplete") && select.val() !== null);
        dialer_form.find("small").text(select.val());
        call_button.prop("disabled", !isValid);
        input.prop("disabled", false);
        select.prop("disabled", false);
        call_button.show();
        end_button.hide();
    }

    function getAccessToken(funcCall) {
        $.ajax({
            url: "https://webhook.call-app.channelautomation.com/api/token",
            type: "get", dataType: "json",
            success: (response) => {
                if (device === null) setupDevice(response.token);
                else device.updateToken(response.token);
                expiry = new Date(response.expires);
                if (funcCall) funcCall();
            },
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

    function setupDevice(token) {
        device = new Twilio.Device(token);

        // Listen for the 'connect' event
        device.on("connect", () => {
            toastr.success("Device connected.", "Dialer");
        });
        // Listen for the 'disconnect' event
        device.on("disconnect", () => {
            toastr.info("Device disconnected.", "Dialer");
        });
        // Listen for the 'error' event
        device.on("error", (error) => {
            toastr.error(`Device Error: ${error}`, "Dialer");
        });

        // Listen for the 'ready' event (Device is ready to handle calls)
        device.on("ready", () => {
            toastr.info("Device is ready to receive calls.", "Dialer");
        });

        // Listen for incoming calls
        device.on("incoming", (conn) => {
            toastr.warning("Incoming call received!", "Dialer");
            // Handle incoming call (e.g., answer or reject)
            const isAccept = confirm("You have an incoming call. Do you want to answer?");
            if (isAccept) {
                conn.accept(); // Accept the call
                toastr.success("Call accepted.", "Dialer");
            } else {
                conn.reject(); // Reject the call
                toastr.success("Call rejected.", "Dialer");
            }
            // Set up event listeners for the connection
            conn.on("disconnect", () => {
                toastr.info("Call disconnected.", "Dialer");
            });
            conn.on("error", (error) => {
                toastr.error(`Error during the call: ${error}`, "Dialer");
            });
        });
    }

    function callConnect() {
        if (new Date() > expiry) {
            startAjaxSpinner(call_button[0]);
            getAccessToken(callConnectContinue);
        } 
        else callConnectContinue();
    }

    function callConnectContinue() {
        let input = dialer_form.find("input");
        let select = dialer_form.find("select");
        input.prop("disabled", true);
        select.prop("disabled", true);
        call_button.hide();
        end_button.show();
        let to = `+1${input.inputmask("unmaskedvalue")}`;
        let from = select.val();
        toastr.info("Connecting call..", "Dialer");
        device.connect({ To: to, From: from });
    }

    function callDisconnect() {
        device.disconnectAll();
        resetDialer();
    }

})(jQuery);
