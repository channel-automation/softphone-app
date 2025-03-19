(function ($) {
    "use strict"
    let device; //Twilio Device object
    let expiry; //Access Token expiration time

    let divDialer;
    let divCalling;

    let callTimerInterval;
    let callTimerStartTime;

    $(function () {
        requestAudioPermission();
        getAccessToken();
        divDialer = $("#divDialer");
        divCalling = $("#divCalling");
        initializeFormControls(divDialer);
        divDialer.find("input").on("keyup", checkDialer);
        divDialer.find("input").on("paste", checkDialer);
        divDialer.find("input").on("cut", checkDialer);
        divDialer.find("select").on("change", checkDialer);
        divDialer.find("button").on("click", deviceConnect);
        divCalling.find("button").on("click", deviceDisconnect);
        checkDialer();
    });

    async function requestAudioPermission() {
        try {
            // Request audio access from the user
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Audio permission granted");
            // Stop the audio stream after permission is granted to release resources
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        } catch (error) {
            console.error("Audio permission denied or error occurred:", error);
        }
    }

    function checkDialer() {
        let to = divDialer.find("input").inputmask("unmaskedvalue");
        let from = divDialer.find("select").val();
        if (from !== null) {
            let mask = new Inputmask("(999) 999-9999");
            divDialer.find("small").text(mask.format(from.replaceAll("+1", "")));
        }
        divDialer.find("button").prop("disabled", (to.length !== 10 || from === null));
    }

    function getAccessToken() {
        $.ajax({
            url: `${baseUrl}/Backend/AccessToken?backendKey=${backendKey}`,
            type: "get", dataType: "json",
            success: (response) => {
                if (!device) setupDevice(response.token);
                else device.updateToken(response.token);
                expiry = new Date(response.expires);
                const sched = expiry - Date.now() - 60000; //-> 1 Minute before expiration
                setTimeout(getAccessToken, sched);
                console.log("Token updated.");
            },
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

     function setupDevice(token) {
        device = new Twilio.Device(token, {
            closeProtection: true,
            enableRingingState: true,
            edge: ['ashburn', 'sydney', 'dublin', 'frankfurt']
        });

        device.register();
        device.audio.incoming(true);
        device.audio.disconnect(true);

        // Listen for the "ready" event
        device.on("ready", () => {
            console.log("Device is ready.");
        });
        // Listen for the "offline" event
        device.on("offline", () => {
            console.log('Device is offline.');
        });
        // Listen for the "error" event
        device.on("error", (error) => {
            console.log(`Device Error: ${error}`);
        });

        // Listen for incoming calls
        device.on("incoming", (call) => {
            console.log(`Incoming call received from ${call.parameters.From}.`);
            incomingPopup(call); // Handle incoming call (e.g., answer or reject)

            // Set up event listeners for the connection
            call.on("disconnect", () => {
                console.log("Inbound call disconnected.");
                divDialer.show();
                divCalling.hide();
                clearInterval(callTimerInterval);
            });
            call.on("cancel", () => {
                console.log("Inbound call cancelled.");
                Swal.close();
            });
            call.on("accept", () => {
                console.log("Inbound call accepted.");
                divDialer.hide();
                divCalling.show();
                setCallingInfo(call.parameters.From, true);
            });
            call.on("reject", () => {
                console.log("Inbound call rejected.");
            });
            call.on("error", (error) => {
                console.log(`Error during inbound call: ${error}`);
                toastr.error("Unexpected error during call.", "Error!");
                divDialer.show();
                divCalling.hide();
                clearInterval(callTimerInterval);
            });
        });
    }

    async function deviceConnect() {
        let to = `+1${divDialer.find("input").inputmask("unmaskedvalue")}`;
        let from = divDialer.find("select").val();
        startAjaxSpinner(divDialer.find("button"));
        $.ajax({
            url: `${baseUrl}/Backend/PlaceCall?backendKey=${backendKey}&from=${from}&to=${to}`,
            type: "post", dataType: "json",
            success: async () => {
                //Start device for outbound call
                let params = { To: to, From: from };
                const call = await device.connect({ params });

                // Set up event listeners for the connection
                call.on("connecting", () => {
                    console.log("Outbound call connecting.");
                });
                call.on("ringing", () => {
                    console.log("Outbound call ringing.");
                    divDialer.hide();
                    divCalling.show();
                    setCallingInfo(to, false);
                });
                call.on("connect", () => {
                    console.log("Outbound call connected.");
                });
                call.on("accept", () => {
                    console.log("Outbound call accepted.");
                    divDialer.hide();
                    divCalling.show();
                    setCallingInfo(to, true);
                });
                call.on("reject", () => {
                    console.log("Outbound call rejected.");
                });
                call.on("cancel", () => {
                    console.log("Outbound call cancelled.");
                });
                call.on("disconnect", () => {
                    console.log("Outbound call disconnected.");
                    divDialer.show();
                    divCalling.hide();
                    clearInterval(callTimerInterval);
                });
                call.on("error", (error) => {
                    console.log(`Error during outbound call: ${error}`);
                    toastr.error("Unexpected error during call.", "Error!");
                    divDialer.show();
                    divCalling.hide();
                    clearInterval(callTimerInterval);
                });
            },
            error: () => {
                toastr.error("Failed to communicate backend service.", "Error!");
            }
        });
    }

    function deviceDisconnect() {
        device.disconnectAll();
        divDialer.show();
        divCalling.hide();
        clearInterval(callTimerInterval);
    }

    function incomingPopup(call) {
        let img = `<img src='${baseUrl}/caller.png' class='img img-circle mb-2' style='width:115px' />`;
        Swal.fire({
            title: "Incoming Call..",
            html: `${img}<br />${call.parameters.From}`,
            showCancelButton: true,
            confirmButtonText: "<i class='fas fa-phone-volume'></i> Accept",
            cancelButtonText: "<i class='fas fa-phone-slash'></i> Reject",
            allowOutsideClick: false,
            allowEscapeKey: false,
            width: "300px",
            customClass: {
                confirmButton: "bg-success",
                cancelButton: "bg-danger",
                title: "text-lg",
            }
        }).then((result) => {
            if (result.isConfirmed) call.accept();
            else call.reject();
        });
    }

    function setCallingInfo(phoneNo, isAccepted) {
        divCalling.find("h6").text(phoneNo);
        if (!isAccepted) divCalling.find("h4").text("Calling..");
        else {
            divCalling.find("h4").text("00:00:00");
            if (callTimerInterval) clearInterval(callTimerInterval);
            callTimerStartTime = new Date().getTime();
            callTimerInterval = setInterval(() => {
                let now = new Date().getTime();
                let diff = now - callTimerStartTime;
                let hrs = Math.floor(diff / 3600000);
                let mins = Math.floor((diff % 3600000) / 60000);
                let secs = Math.floor((diff % 60000) / 1000);
                divCalling.find("h4").text(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
            }, 1000);
        }
    }

    function pad(number) {
        return number < 10 ? '0' + number : number;
    }

})(jQuery);
