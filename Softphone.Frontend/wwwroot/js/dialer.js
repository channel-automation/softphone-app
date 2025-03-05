(function ($) {
    "use strict"
    let device; // Twilio Device object
    let isDeviceReady = false;
    let currentCall = null; // Track current active call
    let isCallInProgress = false; // Track call state
    let lastCallTime = 0; // For debouncing
    const CALL_DEBOUNCE_TIME = 2000; // 2 seconds
    let socket; // Socket.io client

    let divDialer;
    let divCalling;

    let callTimerInterval;
    let callTimerStartTime;
    let tokenRetryTimeout;
    
    // Constants
    const config = {
        backendUrl: 'https://backend-production-3d08.up.railway.app',
        endpoints: {
            token: '/api/twilio/voice-token'
        }
    };
    
    const TOKEN_RETRY_INTERVAL = 5000; // 5 seconds
    const CALL_STATES = {
        IDLE: 'idle',
        CONNECTING: 'connecting',
        RINGING: 'ringing',
        IN_PROGRESS: 'in-progress',
        COMPLETED: 'completed',
        FAILED: 'failed'
    };
    
    let currentCallState = CALL_STATES.IDLE;

    // Call timer functions
    function startCallTimer() {
        callTimerStartTime = Date.now();
        updateCallTimer();
        callTimerInterval = setInterval(updateCallTimer, 1000);
    }

    function stopCallTimer() {
        if (callTimerInterval) {
            clearInterval(callTimerInterval);
            callTimerInterval = null;
        }
        $('#callTimer').text('');
    }

    function updateCallTimer() {
        if (!callTimerStartTime) return;
        
        const now = Date.now();
        const diff = now - callTimerStartTime;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        const displayHours = hours.toString().padStart(2, '0');
        const displayMinutes = (minutes % 60).toString().padStart(2, '0');
        const displaySeconds = (seconds % 60).toString().padStart(2, '0');
        
        $('#callTimer').text(`${displayHours}:${displayMinutes}:${displaySeconds}`);
    }

    function updateCallState(newState) {
        console.log(`Call state changing from ${currentCallState} to ${newState}`);
        currentCallState = newState;
        
        // Update UI based on state
        switch(newState) {
            case CALL_STATES.IDLE:
                divDialer.show();
                divCalling.hide();
                stopCallTimer();
                currentCall = null;
                isCallInProgress = false;
                break;
                
            case CALL_STATES.CONNECTING:
            case CALL_STATES.RINGING:
                divDialer.hide();
                divCalling.show();
                $('#callStatus').text(newState === CALL_STATES.CONNECTING ? 'Connecting...' : 'Ringing...');
                break;
                
            case CALL_STATES.IN_PROGRESS:
                $('#callStatus').text('Connected');
                startCallTimer();
                isCallInProgress = true;
                break;
                
            case CALL_STATES.COMPLETED:
            case CALL_STATES.FAILED:
                divDialer.show();
                divCalling.hide();
                stopCallTimer();
                break;
        }
        
        // Enable/disable buttons based on state
        checkDialer();
    }

    function setupDevice(token) {
        console.log('Setting up device...');
        
        // Clean up existing device if any
        if (device) {
            console.log('Destroying existing device');
            device.destroy();
            device = null;
        }
        
        // Create new device
        device = new Twilio.Device(token, {
            codecPreferences: ['opus', 'pcmu'],
            fakeLocalDTMF: true,
            enableRingingState: true,
            debug: true // Enable debug mode for better error logging
        });
        
        // Setup device event handlers
        device.on('ready', async () => {
            console.log('✅ Device is ready');
            
            // Resume AudioContext if it exists
            if (Twilio.Device.audio && Twilio.Device.audio.audioContext) {
                try {
                    await Twilio.Device.audio.audioContext.resume();
                    console.log('✅ AudioContext resumed');
                } catch (error) {
                    console.error('❌ Failed to resume AudioContext:', error);
                }
            }
            
            isDeviceReady = true;
            checkDialer();
            toastr.success('Phone system is ready', 'Connected');
        });
        
        device.on('error', (error) => {
            console.error('❌ Device error:', error);
            toastr.error(`Phone system error: ${error.message}`, "Device Error");
            isDeviceReady = false;
            checkDialer();
            
            // Try to get a new token
            getAccessToken();
        });
        
        device.on('disconnect', () => {
            console.log('Device disconnected');
            isDeviceReady = false;
            checkDialer();
        });

        // Handle incoming calls
        device.on('incoming', (call) => {
            console.log('📞 Incoming call', call);
            handleIncomingCall(call);
        });
        
        // Register device
        console.log('Registering device...');
        device.register()
            .then(() => {
                console.log('Device registered successfully');
                // Ensure device is ready after registration
                isDeviceReady = true;
                checkDialer();
            })
            .catch(error => {
                console.error('Failed to register device:', error);
                toastr.error('Failed to register device. Please refresh the page.', 'Registration Error');
                isDeviceReady = false;
                checkDialer();
            });
    }
    
    async function deviceConnect() {
        if (!device || !isDeviceReady) {
            console.error('Device not ready');
            toastr.error("Phone system is not ready. Please wait a moment and try again.", "Connection Error");
            return;
        }
        
        // Get the raw phone number
        const phoneInput = divDialer.find("input.inputmask-usphone");
        const rawNumber = phoneInput.inputmask("unmaskedvalue").toString();
        console.log('Raw number before formatting:', rawNumber);
        
        if (!rawNumber || rawNumber.length !== 10) {
            console.error('Invalid phone number');
            toastr.error("Please enter a valid 10-digit phone number.", "Validation Error");
            return;
        }
        
        // Get the from number (already has +1 from database)
        const fromNumber = $('#ddlFromNumber').val();
        if (!fromNumber) {
            console.error('No from number selected');
            toastr.error("Please select a phone number to call from.", "Validation Error");
            return;
        }
        
        // Format TO number to E.164 by adding +1
        const toNumber = `+1${rawNumber}`;
        
        console.log(`Making call from ${fromNumber} to ${toNumber}`);
        
        try {
            // Initiate the call
            currentCall = await device.connect({
                params: {
                    To: toNumber,
                    From: fromNumber,
                    workspaceId: $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val()
                }
            });
            
            // Setup call handlers
            setupOutboundCallHandlers(currentCall);
            
            // Update UI state
            updateCallState(CALL_STATES.CONNECTING);
            
        } catch (error) {
            console.error('Failed to connect call:', error);
            toastr.error("Failed to connect call. Please try again.", "Call Error");
            updateCallState(CALL_STATES.FAILED);
        }
    }

    function deviceDisconnect() {
        console.log('Disconnecting call...');
        if (currentCall) {
            currentCall.disconnect();
        }
        if (device) {
            device.disconnectAll();
        }
        updateCallState(CALL_STATES.COMPLETED);
    }

    function endCall() {
        deviceDisconnect();
        divDialer.show();
        divCalling.hide();
        stopCallTimer();
        currentCall = null;
        isCallInProgress = false;
        updateCallState(CALL_STATES.IDLE);
    }

    $(function () {
        console.log('Initializing dialer...');
        
        // First request audio permission (required for browsers)
        // requestAudioPermission();
        
        // Then initialize the dialer UI
        initializeDialer();
    });

    function initializeDialer() {
        console.log('Setting up dialer UI references and event handlers');
        
        // Get UI references
        divDialer = $("#divDialer");
        divCalling = $("#divCalling");
        
        // Initialize phone input mask
        divDialer.find("input.inputmask-usphone").inputmask("(999) 999-9999");
        
        // Button event handlers
        divDialer.find('.btn-call').on("click", async () => {
            console.log('Call button clicked');
            // Request audio permission first
            await requestAudioPermission();
            // Then try to connect
            deviceConnect();
        });
        
        divDialer.find('.btn-end-call').on("click", () => {
            deviceDisconnect();
        });
        
        // Load phone numbers and initialize device
        loadPhoneNumbers();
        getAccessToken();
        
        // Monitor input changes
        divDialer.find("input.inputmask-usphone").on("input", checkDialer);
        $('#ddlFromNumber').on('change', checkDialer);
    }

    async function requestAudioPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("✅ Audio permission granted");
            
            // Start AudioContext after user gesture
            if (Twilio.Device.audio) {
                await Twilio.Device.audio.audioContext.resume();
            }
            
            // Stop the tracks after getting permission
            stream.getTracks().forEach(track => track.stop());
            
            // Set device ready after audio permission
            isDeviceReady = true;
            checkDialer();
            
        } catch (error) {
            console.error("❌ Audio permission denied:", error);
            toastr.error("Please allow microphone access to make calls.", "Microphone Access Required");
            isDeviceReady = false;
            checkDialer();
        }
    }

    function checkDialer() {
        const phoneInput = divDialer.find("input.inputmask-usphone");
        const phoneNumber = phoneInput.inputmask("unmaskedvalue").toString();
        const hasFromNumber = $('#ddlFromNumber').val() !== null && $('#ddlFromNumber').val() !== '';
        const isPhoneValid = phoneNumber.length === 10;
        
        // Update button state
        const canMakeCall = isPhoneValid && hasFromNumber && isDeviceReady;
        divDialer.find('.btn-call').prop('disabled', !canMakeCall);
        
        const status = {
            phoneNumber,
            isPhoneValid,
            hasFromNumber,
            isDeviceReady,
            canMakeCall
        };
        console.log('Dialer status:', status);
        
        return canMakeCall;
    }

    async function getAccessToken() {
        try {
            console.log('🔑 Getting access token for:', {
                username: window.username,
                workspaceId: window.workspaceId
            });
            const response = await fetch(`${config.backendUrl}${config.endpoints.token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    identity: window.username,
                    workspaceId: window.workspaceId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !data.token) {
                throw new Error(data.error || 'Invalid token response');
            }
            
            // Setup device with new token
            setupDevice(data.token);
            
            // Clear any existing retry timeout
            if (tokenRetryTimeout) {
                clearTimeout(tokenRetryTimeout);
                tokenRetryTimeout = null;
            }
            
            // Initialize socket with username
            initializeSocket(window.username);
            
        } catch (error) {
            console.error('Failed to get access token:', error);
            toastr.error("Failed to connect to phone system. Retrying...", "Connection Error");
            
            // Schedule retry
            tokenRetryTimeout = setTimeout(getAccessToken, TOKEN_RETRY_INTERVAL);
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

    // Load phone numbers into dropdown
    async function loadPhoneNumbers() {
        try {
            const workspaceId = $('#CurrentWorkspaceId').val() || $('#hdnWorkspaceId').val();
            if (!workspaceId) {
                console.error('❌ No workspace ID found');
                toastr.error('Failed to load phone numbers: Workspace ID not found');
                return;
            }
            
            console.log('📞 Loading phone numbers for workspace:', workspaceId);
            const response = await $.get(`${config.backendUrl}/api/twilio/phone-numbers/${workspaceId}`);
            
            if (!response || !response.numbers) {
                console.error('❌ Invalid response format:', response);
                toastr.error('Failed to load phone numbers: Invalid response from server');
                return;
            }
            
            console.log('📱 Found numbers:', response.numbers);
            
            const $select = $('#ddlFromNumber');
            $select.empty();
            
            // Add placeholder option
            $select.append($('<option></option>')
                .attr('value', '')
                .text('Select a number...'));
            
            // Add phone numbers
            response.numbers.forEach(number => {
                $select.append($('<option></option>')
                    .attr('value', number.phone_number)
                    .text(number.friendly_name || number.phone_number));
            });
            
            // Initialize select2 with search
            $select.select2({
                placeholder: 'Select a phone number',
                allowClear: true,
                theme: 'bootstrap4',
                width: '100%'
            });
            
            // Check dialer state after loading numbers
            checkDialer();
            
        } catch (error) {
            console.error('❌ Error loading phone numbers:', error);
            toastr.error('Failed to load phone numbers. Please refresh the page.');
        }
    }

    function handleOutboundCall() {
        try {
            const toNumber = divDialer.find("input.inputmask-usphone").inputmask("unmaskedvalue").toString();
            const fromNumber = $('#ddlFromNumber').val();
            
            if (!toNumber || !fromNumber) {
                toastr.error("Please enter a valid phone number and select a 'from' number");
                return;
            }
            
            // Format number for Twilio
            const formattedToNumber = '+1' + toNumber;
            
            console.log('Making call from', fromNumber, 'to', formattedToNumber);
            
            // Make the call
            const call = device.connect({
                params: {
                    To: formattedToNumber,
                    From: fromNumber
                }
            });
            
            // Set up call handlers
            call.on('ringing', () => updateCallStatus('ringing'));
            call.on('accept', () => updateCallStatus('in-progress'));
            call.on('disconnect', () => updateCallStatus('ended'));
            call.on('error', (error) => {
                console.error('Call error:', error);
                toastr.error(error.message || 'Error during call');
                updateCallStatus('ended');
            });
            
            // Update UI
            updateCallStatus('initiated');
            
        } catch (error) {
            console.error('Error making call:', error);
            toastr.error(error.message || 'Failed to place call');
            updateCallStatus('ended');
        }
    }

    function setupOutboundCallHandlers(call) {
        if (!call) return;
        
        // Update UI to show call is connecting
        updateCallState(CALL_STATES.CONNECTING);
        
        call.on('ringing', () => {
            console.log('Call is ringing');
            updateCallState(CALL_STATES.RINGING);
        });
        
        call.on('accept', () => {
            console.log('Call was accepted');
            updateCallState(CALL_STATES.IN_PROGRESS);
            startCallTimer();
        });
        
        call.on('disconnect', () => {
            console.log('Call disconnected');
            updateCallState(CALL_STATES.COMPLETED);
            stopCallTimer();
            currentCall = null;
        });
        
        call.on('cancel', () => {
            console.log('Call was canceled');
            updateCallState(CALL_STATES.COMPLETED);
            stopCallTimer();
            currentCall = null;
        });
        
        call.on('error', (error) => {
            console.error('Call error:', error);
            toastr.error(`Call error: ${error.message}`, "Call Error");
            updateCallState(CALL_STATES.FAILED);
            stopCallTimer();
            currentCall = null;
        });
    }

    function incomingPopup(call) {
        let img = `<img src='https://backend-production-3d08.up.railway.app/caller.png' class='img img-circle mb-2' style='width:115px' />`;
        Swal.fire({
            title: "Incoming Call..",
            html: `${img}<br />${call.from}`,
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

    // Initialize socket.io
    function initializeSocket(username) {
        if (!socket) {
            console.log('🔌 Initializing socket.io connection...', {
                url: config.backendUrl,
                username: username
            });
            socket = io(config.backendUrl);
            
            socket.on('connect', () => {
                console.log('✅ Socket connected with id:', socket.id);
                // Join room with username
                console.log('🚪 Joining room for user:', username);
                socket.emit('join_user', { username });
            });
            
            socket.on('incomingCall', (data) => {
                console.log('📞 Incoming call via socket:', data);
                // Show incoming call popup
                incomingPopup({
                    from: data.from,
                    to: data.to,
                    callSid: data.callSid
                });
            });
            
            socket.on('error', (error) => {
                console.error('❌ Socket error:', error);
                toastr.error('Connection error. Please refresh the page.', 'Socket Error');
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Socket disconnected');
                // Try to reconnect
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect socket...');
                    initializeSocket(username);
                }, 5000);
            });

            socket.on('reconnect', () => {
                console.log('✅ Socket reconnected');
                // Rejoin room
                socket.emit('join_user', { username });
            });
        }
    }

})(jQuery);
