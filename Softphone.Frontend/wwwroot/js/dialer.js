(function ($) {
    "use strict"
    let device; //Twilio Device object
    let expiry; //Access Token expiration time
    let isDeviceReady = false;

    let divDialer;
    let divCalling;

    let callTimerInterval;
    let callTimerStartTime;
    let tokenRetryTimeout;
    const TOKEN_RETRY_INTERVAL = 5000; // 5 seconds

    $(function () {
        // Initialize UI first
        divDialer = $("#divDialer");
        divCalling = $("#divCalling");
        initializeFormControls(divDialer);
        
        // Set up event handlers
        divDialer.find("input").on("keyup", checkDialer);
        divDialer.find("input").on("paste", checkDialer);
        divDialer.find("input").on("cut", checkDialer);
        divDialer.find("select").on("change", checkDialer);
        divDialer.find("button").on("click", handleOutboundCall);
        divCalling.find("button").on("click", deviceDisconnect);
        
        // Initial check
        checkDialer();
        
        // Request permissions and initialize device
        initializeDeviceWithPermissions();
    });

    async function initializeDeviceWithPermissions() {
        try {
            // First request audio permission
            console.log('Requesting audio permission...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Audio permission granted');
            stream.getTracks().forEach(track => track.stop());

            // Then get access token and set up device
            console.log('Getting access token...');
            await getAccessToken();
        } catch (error) {
            console.error('Error initializing device:', error);
            toastr.error('Please allow microphone access to make calls.', 'Permission Required');
        }
    }

    function initializeFormControls(divDialer) {
        // Initialize form controls first
    }

    function checkDialer() {
        const to = divDialer.find("input").val()?.replace(/\D/g, '') || '';
        const from = divDialer.find("select").val();
        
        console.log('Dialer check - to:', to, 'from:', from, 'isDeviceReady:', isDeviceReady);
        
        // Disable button if any condition is not met
        const isValid = to.length === 10 && from !== null && isDeviceReady;
        divDialer.find("button").prop("disabled", !isValid);
        
        // Show helpful message about what's missing
        let message = '';
        if (!isDeviceReady) {
            message = 'Waiting for phone system to initialize...';
        } else if (to.length !== 10) {
            message = 'Please enter a valid 10-digit phone number';
        } else if (from === null) {
            message = 'Please select a "From" number';
        }
        
        divDialer.find("small").text(message);
    }

    async function getAccessToken() {
        // Clear any existing retry timeout
        if (tokenRetryTimeout) clearTimeout(tokenRetryTimeout);

        // Get the workspace ID from the global variable
        const workspaceId = globalWorkspaceId;
        
        console.log('Fetching access token...');
        $.ajax({
            url: `${config.backendUrl}/api/twilio/token/${workspaceId}`,
            type: "post",
            dataType: "json",
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            success: async (response) => {
                console.log('Token response:', response);
                if (response && response.token) {
                    if (!device) {
                        console.log('Setting up new device');
                        await setupDevice(response.token);
                    } else {
                        console.log('Updating existing device token');
                        await device.updateToken(response.token);
                    }
                    
                    // Schedule token refresh in 1 hour (tokens typically expire in 1 hour)
                    setTimeout(getAccessToken, 3600000 - 60000); // 1 hour minus 1 minute
                    console.log("Token updated.");
                } else {
                    console.error('Invalid token response:', response);
                    toastr.error(response.error || "Failed to get access token", "Error!");
                    // Retry after delay if failed
                    tokenRetryTimeout = setTimeout(getAccessToken, TOKEN_RETRY_INTERVAL);
                }
            },
            error: (xhr) => {
                console.error("Token error:", xhr);
                toastr.error("Failed to communicate with backend service.", "Error!");
                // Retry after delay
                tokenRetryTimeout = setTimeout(getAccessToken, TOKEN_RETRY_INTERVAL);
            }
        });
    }

    async function setupDevice(token) {
        try {
            console.log('Starting device setup...');
            
            // Create a temporary audio context to ensure it's ready
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                console.log('Audio context suspended, waiting for user interaction...');
                
                // Wait for first user interaction
                await new Promise(resolve => {
                    const handleInteraction = async () => {
                        console.log('User interaction detected, resuming audio context...');
                        await audioContext.resume();
                        document.removeEventListener('click', handleInteraction);
                        document.removeEventListener('touchstart', handleInteraction);
                        resolve();
                    };
                    document.addEventListener('click', handleInteraction);
                    document.addEventListener('touchstart', handleInteraction);
                });
            }
            
            console.log('Audio context ready, creating Twilio device...');
            
            // Now create and set up the device
            device = new Twilio.Device(token, {
                closeProtection: true,
                enableRingingState: true,
                edge: ['ashburn', 'sydney', 'dublin', 'frankfurt']
            });

            // Set up event handlers
            device.on("ready", function() {
                console.log("Device is ready, setting isDeviceReady = true");
                isDeviceReady = true;
                checkDialer();
                toastr.success("Phone system initialized successfully.", "Ready");
            });

            device.on("offline", function() {
                console.log('Device is offline, setting isDeviceReady = false');
                isDeviceReady = false;
                checkDialer();
                toastr.warning("Phone system is offline. Attempting to reconnect...", "Offline");
                getAccessToken();
            });

            device.on("error", function(error) {
                console.error(`Device Error: ${error.message || error}`, error);
                isDeviceReady = false;
                checkDialer();
                toastr.error("Phone system encountered an error. Please refresh the page.", "Error");
            });

            device.on("incoming", handleIncomingCall);

            // Finally register the device
            console.log('Registering device...');
            await device.register();
            device.audio.incoming(true);
            device.audio.disconnect(true);

            console.log('Device setup complete, waiting for ready event...');
        } catch (error) {
            console.error("Error setting up Twilio device:", error);
            toastr.error("Failed to initialize phone system. Please refresh the page.", "Setup Error");
            isDeviceReady = false;
            checkDialer();
        }
    }

    function handleIncomingCall(call) {
        console.log(`Incoming call received from ${call.parameters.From}.`);
        incomingPopup(call);

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
            console.error(`Error during inbound call:`, error);
            toastr.error("Unexpected error during call.", "Call Error");
            divDialer.show();
            divCalling.hide();
            clearInterval(callTimerInterval);
        });
    }

    async function handleOutboundCall() {
        console.log('handleOutboundCall triggered');
        
        try {
            // First, ensure audio context is resumed
            if (Twilio.Device.audio?.audioContext?.state === 'suspended') {
                console.log('Resuming audio context');
                await Twilio.Device.audio.audioContext.resume();
                console.log('Audio context resumed');
            }

            // Now check device ready state
            if (!isDeviceReady || !device) {
                console.log('Device not ready - isDeviceReady:', isDeviceReady, 'device:', !!device);
                toastr.error("Phone system is not ready. Please wait a moment and try again.", "Not Ready");
                return;
            }
            
            // Call the deviceConnect function which uses our backend API
            console.log('Calling deviceConnect');
            await deviceConnect();
        } catch (error) {
            console.error("Error making outbound call:", error);
            toastr.error("Failed to place call. Please try again.", "Call Error");
            divDialer.show();
            divCalling.hide();
        }
    }

    function setupOutboundCallHandlers(call, to) {
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
            divDialer.show();
            divCalling.hide();
            toastr.warning("Call was rejected.", "Call Ended");
        });
        call.on("cancel", () => {
            console.log("Outbound call cancelled.");
            divDialer.show();
            divCalling.hide();
            toastr.info("Call was cancelled.", "Call Ended");
        });
        call.on("disconnect", () => {
            console.log("Outbound call disconnected.");
            divDialer.show();
            divCalling.hide();
            clearInterval(callTimerInterval);
        });
        call.on("error", (error) => {
            console.error(`Error during outbound call:`, error);
            toastr.error("Unexpected error during call.", "Call Error");
            divDialer.show();
            divCalling.hide();
            clearInterval(callTimerInterval);
        });
    }

    function deviceDisconnect() {
        if (device) {
            device.disconnectAll();
        }
        divDialer.show();
        divCalling.hide();
        clearInterval(callTimerInterval);
    }

    function incomingPopup(call) {
        let img = `<img src='https://backend-production-3d08.up.railway.app/caller.png' class='img img-circle mb-2' style='width:115px' />`;
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

    async function deviceConnect() {
        let to = `+1${divDialer.find("input").inputmask("unmaskedvalue")}`;
        let from = divDialer.find("select").val();
        
        try {
            // Resume audio context if needed
            if (Twilio.Device.audio?.audioContext?.state === 'suspended') {
                await Twilio.Device.audio.audioContext.resume();
            }

            // Make the call using Twilio Device
            const params = {
                To: to,
                From: from
            };
            console.log('Making call with params:', params);
            
            const call = await device.connect({ params });
            console.log('Call connected:', call);
            
            // Set up handlers for the call
            setupOutboundCallHandlers(call, to);
        } catch (error) {
            console.error("Failed to connect call:", error);
            toastr.error("Failed to connect call. Please check your Twilio configuration.", "Error");
        }
    }

})(jQuery);
