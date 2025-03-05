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
        // Get the current phone number without formatting
        const phoneInput = divDialer.find("input.inputmask-usphone");
        const phoneNumber = phoneInput.inputmask("unmaskedvalue").toString();
        console.log('Raw phone number:', phoneNumber, 'Length:', phoneNumber.length);
        
        // Check if we have a valid phone number (10 digits)
        const isPhoneValid = phoneNumber && phoneNumber.replace(/\D/g, '').length === 10;
        console.log('Phone number valid:', isPhoneValid);
        
        // Check if we have a from number selected
        const hasFromNumber = true; // We're now hardcoding the from number
        
        // Update UI based on validation
        const canMakeCall = (isPhoneValid || bypassValidation) && (isDeviceReady || bypassValidation);
        const callButton = divDialer.find("button");
        callButton.prop('disabled', !canMakeCall);
        
        console.log(`Checking dialer status - To: ${phoneNumber.length}/10 digits, From: ${hasFromNumber ? 'selected' : 'not selected'}, Device Ready: ${isDeviceReady}`);
        
        if (!isPhoneValid && !bypassValidation) {
            console.log('Dialer validation bypassed. Would normally require: Enter a complete 10-digit number, Waiting for phone system to initialize');
        }
        
        return canMakeCall;
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
            const to = divDialer.find("input.inputmask-usphone").inputmask("unmaskedvalue").toString().replace(/\D/g, '');
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
        try {
            const phoneInput = $('#txtPhoneNumber');
            if (!phoneInput.length) {
                console.error('Phone input not found');
                toastr.error('Phone input not found');
                return;
            }

            const unmaskedValue = phoneInput.inputmask("unmaskedvalue");
            if (!unmaskedValue) {
                console.error('No phone number entered');
                toastr.error('Please enter a phone number');
                return;
            }

            const rawNumber = unmaskedValue.toString().replace(/\D/g, '');
            console.log('Raw number before formatting:', rawNumber);
            
            // Ensure we have exactly 10 digits
            if (rawNumber.length !== 10) {
                console.error('Invalid phone number length:', rawNumber.length);
                toastr.error('Please enter a valid 10-digit phone number');
                return;
            }
            
            // Get the workspace ID
            const workspaceId = $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val();
            
            if (!workspaceId) {
                throw new Error("No workspace ID found");
            }
            
            // Get the selected "from" number from the dropdown
            const from = $('#ddlFromNumber').val();
            if (!from) {
                toastr.error('Please select a phone number to call from');
                return;
            }
            
            let to = `+1${rawNumber}`;
            
            console.log(`Making call from ${from} to ${to}`);
            
            try {
                // Update UI to show we're initiating the call
                setCallingInfo(to, true);
                
                // Always use device.connect() for consistent behavior
                if (!isDeviceReady || !device) {
                    console.error('Device not ready');
                    toastr.error('Phone system not ready. Please try again.');
                    setCallingInfo(null, false);
                    return;
                }
                
                // Create params for the call
                const params = {
                    To: to,
                    From: from,
                    workspaceId: workspaceId // Pass workspace ID to TwiML endpoint
                };
                console.log('Call params:', params);
                
                // Connect using device
                device.connect(params);
            } catch (error) {
                console.error('Error connecting device:', error);
                toastr.error(error.message || "Failed to connect call");
                setCallingInfo(null, false);
            }
        } catch (error) {
            console.error('Error in deviceConnect:', error);
            toastr.error(error.message || "Error making call");
            setCallingInfo(null, false);
        }
    }

    // Function to load phone numbers into dropdown
    async function loadPhoneNumbers() {
        try {
            const workspaceId = $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val();
            
            if (!workspaceId) {
                throw new Error("No workspace ID found");
            }
            
            const response = await $.get(`${config.backendUrl}/api/twilio/phone-numbers/${workspaceId}`);
            const phones = response.phones;
            
            if (!phones || phones.length === 0) {
                toastr.warning('No phone numbers available for this workspace');
                return;
            }
            
            const ddl = $('#ddlFromNumber');
            ddl.empty();
            ddl.append($('<option></option>').val('').text('Select a number...'));
            
            phones.forEach(phone => {
                ddl.append($('<option></option>')
                    .val(phone.phone_number)
                    .text(phone.friendly_name || phone.phone_number));
            });
        } catch (error) {
            console.error('Error loading phone numbers:', error);
            toastr.error('Failed to load available phone numbers');
        }
    }

    // Call loadPhoneNumbers when the page loads
    $(document).ready(function() {
        loadPhoneNumbers();
    });

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
