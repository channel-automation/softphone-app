"use strict"
//import { Device } from '@twilio/voice-sdk';

function placeCall(btn) {
    startAjaxSpinner(btn);
    $.ajax({
        url: "https://webhook.call-app.channelautomation.com/api/token",
        type: "get",
        dataType: "json",
        success: function (response) {
            alert(JSON.stringify(response));
        },
        error: function (ex) {
            alert(`Error: ${JSON.stringify(ex)}`);
        }
    });

}
