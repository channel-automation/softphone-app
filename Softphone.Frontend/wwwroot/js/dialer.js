(function ($) {
    "use strict"
    let device; // Twilio Device object
    let isDeviceReady = false;

    let divDialer;
    let divCalling;

    let callTimerInterval;
    let callTimerStartTime;
    let tokenRetryTimeout;
    
    // Constants
    const TOKEN_RETRY_INTERVAL = 5000; // 5 seconds
    
    $(function () {
        console.log('Initializing dialer...');
        
        // First request audio permission (required for browsers)
        requestAudioPermission();
        
        // Then initialize the dialer UI
        initializeDialer();
    });

    function initializeDialer() {
        console.log('Setting up dialer UI references and event handlers');
        
        // Get UI references
        divDialer = $("#divDialer");
        divCalling = $("#divCalling");
        
        // Initialize form controls first
        initializeFormControls(divDialer);
        
        // Then set up event handlers
        divDialer.find("input").on("keyup", checkDialer);
        divDialer.find("input").on("paste", checkDialer);
        divDialer.find("input").on("cut", checkDialer);
        divDialer.find("select").on("change", checkDialer);
        divDialer.find("button").on("click", handleOutboundCall);
        divCalling.find("button").on("click", deviceDisconnect);
        
        // Initial check and get token
        checkDialer();
        getAccessToken();
    }

    async function requestAudioPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Audio permission granted");
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
        } catch (error) {
            console.error("Audio permission denied or error occurred:", error);
            toastr.error("Please allow microphone access to make calls.", "Microphone Access Required");
        }
    }

    function checkDialer() {
        const to = divDialer.find("input").inputmask("unmaskedvalue") || '';
        const from = divDialer.find("select").val();
        const callButton = divDialer.find("button");
        
        console.log(`Checking dialer status - To: ${to.length}/10 digits, From: ${from ? 'selected' : 'not selected'}, Device Ready: ${isDeviceReady}`);
        
        // TEMPORARILY DISABLED VALIDATION - Comment back in when ready
        // const isValid = to.length === 10 && from !== null && isDeviceReady;
        
        // Force button to be enabled for testing
        const isValid = true;
        
        // Update button state
        callButton.prop("disabled", !isValid);
        
        // Still log what conditions would normally be required
        if (to.length !== 10 || !from || !isDeviceReady) {
            let message = [];
            if (to.length !== 10) message.push("Enter a complete 10-digit number");
            if (!from) message.push("Select a 'From' number");
            if (!isDeviceReady) message.push("Waiting for phone system to initialize");
            
            console.log('Dialer validation bypassed. Would normally require:', message.join(', '));
        } else {
            console.log('Dialer is ready to make calls');
        }
        
        return isValid;
    }

    // Get a token from the backend
    function getAccessToken() {
        console.log('Getting access token...');
        isDeviceReady = false;
        
        // Try to get the workspace ID from different possible sources
        const workspaceId = $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val();
        
        if (!workspaceId) {
            console.error('❌ No workspace ID found');
            toastr.error("Cannot initialize the phone system: Workspace ID not found in the page.", "Configuration Error");
            return;
        }
        
        console.log(`Getting token for workspace: ${workspaceId}`);
        
        $.ajax({
            url: `${config.backendUrl}${config.endpoints.token}/${workspaceId}`,
            type: "POST",
            contentType: "application/json",
            success: (data) => {
                console.log('✅ Token received successfully');
                
                // Clean up any existing device
                if (device) {
                    console.log('Destroying existing device before setting up a new one');
                    device.destroy();
                    device = null;
                }
                
                // Setup device with the new token
                setupDevice(data.token);
            },
            error: (xhr) => {
                console.error('❌ Failed to get token:', xhr);
                console.error('Status:', xhr.status, 'Response:', xhr.responseText);
                const errorMessage = xhr.responseJSON?.error || xhr.statusText || "Unknown error";
                toastr.error(`Failed to initialize phone system: ${errorMessage}`, "Token Error");
                isDeviceReady = false;
                checkDialer();
            }
        });
    }

    function setupDevice(token) {
        try {
            console.log('Initializing device with token:', token);
            
            // First, check if we need to handle AudioContext initialization
            const needsAudioContextInit = !Twilio.Device.audio?.audioContext || 
                Twilio.Device.audio.audioContext.state === 'suspended';
                
            if (needsAudioContextInit) {
                console.log('Audio context needs initialization. Adding initialization handler...');
                
                // Add a one-time click handler to initialize audio
                $(document).one('click', function() {
                    console.log('User clicked. Initializing AudioContext...');
                    
                    // Try to resume existing context if it exists
                    if (Twilio.Device.audio?.audioContext?.state === 'suspended') {
                        console.log('Resuming suspended AudioContext...');
                        Twilio.Device.audio.audioContext.resume()
                            .then(() => {
                                console.log('AudioContext resumed successfully');
                                if (device) {
                                    console.log('Refreshing device registration after AudioContext resume');
                                    device.register();
                                }
                            })
                            .catch(err => console.error('Error resuming AudioContext:', err));
                    }
                });
                
                // Show a message to the user
                toastr.info("Please click anywhere on the page to activate the phone system", "Audio Activation Required");
            }
            
            // Create device with all options
            device = new Twilio.Device(token, {
                closeProtection: true,
                enableRingingState: true,
                debug: true,
                edge: ['ashburn', 'sydney', 'dublin', 'frankfurt']
            });
            
            console.log('Device created with token. Setting up event handlers...');

            // Register all event handlers
            device.on("ready", function() {
                console.log("✅ Device is ready! Setting isDeviceReady = true");
                isDeviceReady = true;
                checkDialer();
                toastr.success("Phone system initialized successfully.", "Ready");
            });

            device.on("offline", function() {
                console.log('❌ Device is offline! Setting isDeviceReady = false');
                isDeviceReady = false;
                checkDialer();
                toastr.warning("Phone system is offline. Attempting to reconnect...", "Offline");
                getAccessToken();
            });

            device.on("error", function(error) {
                console.error(`❌ Device Error: ${error.message || error}`, error);
                isDeviceReady = false;
                checkDialer();
                toastr.error(`Phone system error: ${error.message || "Unknown error"}`, "Error");
            });

            device.on("incoming", handleIncomingCall);

            // Register the device
            console.log('Registering device...');
            device.register();
            
            // Set up audio options
            device.audio.incoming(true);
            device.audio.disconnect(true);

            console.log('Device setup complete, waiting for ready event...');
        } catch (error) {
            console.error("Error setting up Twilio device:", error);
            toastr.error(`Failed to initialize phone system: ${error.message}`, "Setup Error");
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
            // First ensure we have a valid phone number and "from" number
            const to = divDialer.find("input").inputmask("unmaskedvalue") || '';
            const from = divDialer.find("select").val();
            
            // TEMPORARY: Log validation warnings but proceed anyway
            if (to.length !== 10) {
                console.warn("Phone number should be 10 digits but continuing anyway");
            }
            
            if (!from) {
                console.warn("From number is missing but continuing anyway");
            }
            
            if (!isDeviceReady || !device) {
                console.warn("Device not ready but continuing anyway");
            }
            
            // Hide dialer and show calling UI
            divDialer.hide();
            divCalling.show();
            
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

    function setupOutboundCallHandlers(call, phoneNumber) {
        console.log('Setting up handlers for outbound call to:', phoneNumber);
        
        // Set up disconnection handler
        call.on('disconnect', function() {
            console.log('Call has been disconnected');
            endCall();
        });
        
        // Set up accept handler (when the other party accepts)
        call.on('accept', function() {
            console.log('Call has been accepted');
            setCallingInfo(phoneNumber, false);
        });
        
        // Set up error handler
        call.on('error', function(error) {
            console.error('Call error:', error);
            toastr.error(`Call error: ${error.message || "Unknown error"}`, "Call Error");
            endCall();
        });
        
        // Set up cancel handler (when user cancels before connected)
        call.on('cancel', function() {
            console.log('Call was canceled');
            endCall();
        });
        
        // Mute button handler
        $("#mute-call").on("click", function() {
            if (call) {
                const isMuted = !call.isMuted();
                call.mute(isMuted);
                $(this).text(isMuted ? "Unmute" : "Mute");
                console.log(`Call ${isMuted ? 'muted' : 'unmuted'}`);
            }
        });
        
        // Hang up button handler
        $("#hang-up").on("click", function() {
            if (call) {
                console.log('User initiated hang up');
                call.disconnect();
            }
            endCall();
        });
        
        // Update UI
        setCallingInfo(phoneNumber, true);
    }

    function deviceDisconnect() {
        if (device) {
            device.disconnectAll();
        }
        endCall();
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
        // Get the to and from values
        let to = `+1${divDialer.find("input").inputmask("unmaskedvalue")}`;
        let from = '+13614704885'; // Use the actual Twilio number
        
        console.log(`Making call from ${from} to ${to}`);
        
        try {
            // Update UI to show we're initiating the call
            setCallingInfo(to, true);
            
            // If device isn't ready yet, try to make a direct API call instead
            if (!isDeviceReady || !device) {
                console.log('Device not ready, attempting direct API call');
                
                // Get the workspace ID
                const workspaceId = $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val();
                
                if (!workspaceId) {
                    throw new Error("No workspace ID found");
                }
                
                console.log(`Making direct API call to ${config.backendUrl}${config.endpoints.call}/${workspaceId}`);
                
                // Make a direct call to the backend API
                $.ajax({
                    url: `${config.backendUrl}${config.endpoints.call}/${workspaceId}`,
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify({ 
                        to: to,
                        from: from
                    }),
                    success: (data) => {
                        console.log('Call initiated via API:', data);
                        toastr.success("Call initiated successfully", "Call Connected");
                    },
                    error: (xhr) => {
                        console.error('Failed to initiate call via API:', xhr);
                        console.error('Status:', xhr.status, 'Response:', xhr.responseText);
                        throw new Error(xhr.responseJSON?.error || xhr.statusText || "Unknown error");
                    }
                });
                return;
            }
            
            // Create params for the call
            const params = {
                To: to,
                From: from
            };
            console.log('Call params:', params);
            
            // Make the call via Twilio Device
            console.log('Connecting call via device...');
            const call = await device.connect({ params });
            console.log('Call connected:', call);
            
            // Set up handlers for call status events
            setupOutboundCallHandlers(call, to);
        } catch (error) {
            console.error("Failed to connect call:", error);
            toastr.error(`Call failed: ${error.message || "Unknown error"}`, "Call Error");
            
            // Reset UI
            endCall();
        }
    }

    function endCall() {
        // Reset UI
        divDialer.show();
        divCalling.hide();
        
        // Clear call timer
        clearInterval(callTimerInterval);
        
        // Reset buttons to default state
        $("#mute-call").text("Mute");
        
        console.log('Call ended, UI reset');
    }

})(jQuery);
