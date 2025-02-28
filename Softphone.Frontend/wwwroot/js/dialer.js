(function ($) {
    "use strict"
    let device;
    let expiry;

    let dialer_form;
    let call_button;
    let end_button;

    $(() => {
        requestAudioPermission();
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

    async function requestAudioPermission() {
        try {
            // Request audio access from the user
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Audio permission granted');
            // Stop the audio stream after permission is granted to release resources
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        } catch (error) {
            console.error('Audio permission denied or error occurred:', error);
        }
    }

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

    function getAccessToken() {
        $.ajax({
            url: "https://webhook.call-app.channelautomation.com/api/token",
            type: "get", dataType: "json",
            success: (res) => {
                if (!device) setupDevice(res.token);
                else device.updateToken(res.token);
                expiry = new Date(res.expires);
                const interval = expiry - Date.now() - 60000; //-> 1 Minute before expiration
                setTimeout(getAccessToken, interval);
                console.log(`Token updated at ${moment(Date.now()).format("MMM D, YYYY h:mm:ss A")}`);
            },
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

    function setupDevice(token) {
        device = new Twilio.Device(token, {
            closeProtection: true,
            edge: ['ashburn', 'sydney', 'dublin', 'frankfurt']
        });

        // Listen for the "ready" event (Device is ready to handle calls)
        device.on("ready", () => {
            toastr.info("Device is ready to receive calls.", "Dialer");
            console.log("Device is ready to receive calls.");
        });

        // Listen for the "connect" event
        device.on("connect", () => {
            toastr.success("Device connected.", "Dialer");
            console.log("Device connected.");
        });

        // Listen for the "disconnect" event
        device.on("disconnect", () => {
            toastr.info("Device disconnected.", "Dialer");
            console.log("Device disconnected.");
        });

        // Listen for the "error" event
        device.on("error", (error) => {
            toastr.error(`Device Error: ${error}`, "Dialer");
            console.log(`Device Error: ${error}`);
        });

        // Listen for incoming calls
        device.on("incoming", call => {
            toastr.warning("Incoming call received!", "Dialer");
            console.log("Incoming call received!");

            // Handle incoming call (e.g., answer or reject)
            const isAccept = confirm("You have an incoming call. Do you want to answer?");
            if (isAccept) {
                call.accept(); // Accept the call
                toastr.success("Call accepted.", "Dialer");
                console.log("Call accepted.");
            } else {
                call.reject(); // Reject the call
                toastr.success("Call rejected.", "Dialer");
                console.log("Call rejected.");
            }

            // Set up event listeners for the connection
            call.on("disconnect", () => {
                toastr.info("Call disconnected.", "Dialer");
                console.log("Call disconnected.");
            });
            call.on("error", (error) => {
                toastr.error(`Error during the call: ${error}`, "Dialer");
                console.log(`Error during the call: ${error}`);
            });
        });
    }

    function callConnect() {
        let input = dialer_form.find("input");
        let select = dialer_form.find("select");
        input.prop("disabled", true);
        select.prop("disabled", true);
        call_button.hide();
        end_button.show();
        let to = `+1${input.inputmask("unmaskedvalue")}`;
        let from = select.val();

        toastr.info("Connecting..", "Dialer");
        console.log("Connecting..");

        let params = { To: to, From: from };
        device.connect({ params });
    }

    function callDisconnect() {
        device.disconnectAll();
        resetDialer();
    }
})(jQuery);
