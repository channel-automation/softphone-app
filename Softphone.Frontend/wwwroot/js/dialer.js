(function ($) {
    "use strict"
    let device;
    let expiry;

    let dialer_form;
    let call_button;
    let end_button;

    $(function () {
        requestAudioPermission();
        getAccessToken();

        dialer_form = $("#frmDialer");
        initializeFormControls(dialer_form);
        call_button = $("#btnPlaceCall");
        end_button = $("#btnEndCall");

        dialer_form.find("input").on("keyup", resetDialer);
        dialer_form.find("input").on("paste", resetDialer);
        dialer_form.find("input").on("cut", resetDialer);
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
        if (select.val() !== null) {
            let mask = new Inputmask("(999) 999-9999");
            dialer_form.find("small").text(mask.format(select.val().replaceAll("+1", "")));
        }
        call_button.prop("disabled", (!input.inputmask("isComplete") || select.val() === null));
        input.prop("disabled", false);
        select.prop("disabled", false);
        call_button.show();
        end_button.hide();
    }

    function getAccessToken() {
        $.ajax({
            url: "https://webhook.call-app.channelautomation.com/api/token",
            type: "get", dataType: "json",
            success: function (response) {
                if (!device) setupDevice(response.token);
                else device.updateToken(response.token);
                expiry = new Date(response.expires);
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

        device.register();

        // Listen for the "ready" event (Device is ready to handle calls)
        device.on("ready", function () {
            console.log("Device is ready to receive calls.");
        });
        // Listen for the "connect" event
        device.on("connect", function () {
            console.log("Device connected.");
        });
        // Listen for the "disconnect" event
        device.on("disconnect", function () {
            console.log("Device disconnected.");
        });
        // Listen for the "offline" event
        device.on("offline", function () {
            console.log('Device is offline. WebSocket connection is closed.');
        });
        // Listen for the "error" event
        device.on("error", function (error) {
            console.log(`Device Error: ${error}`);
        });

        // Listen for incoming calls
        device.on("incoming", function (call) {
            console.log("Incoming call received.");

            // Handle incoming call (e.g., answer or reject)
            const isAccept = confirm("You have an incoming call. Do you want to answer?");
            if (isAccept) {
                call.accept(); // Accept the call
                console.log("Call accepted.");
            } else {
                call.reject(); // Reject the call
                console.log("Call rejected.");
            }

            // Set up event listeners for the connection
            call.on("disconnect", function () {
                console.log("Call disconnected.");
            });
            call.on("error", function (error) {
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
