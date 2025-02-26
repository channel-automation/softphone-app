const _aMap1 = new Map(); //To hold btn html info before ajax call
const _aMap2 = new Map(); //To hold btn html info during ajax call
const _aMap3 = new Map(); //To hold btn html info in redirect
let _toSend = false;

function startAjaxSpinner(btn) {
    if (_toSend) return false;
    _toSend = true;
    let key = Date.now();
    __spinInvoke(key, btn, _aMap1);
    setTimeout(function () {
        _toSend = false;
        __spinRevoke(key, _aMap1);
    }, 500);
}

$(this).ajaxSend(function (e, x, o) {
    for (let [k, v] of _aMap1) {
        _toSend = false;
        _aMap2.set(o.url, v);
        _aMap1.delete(k);
    }
});

$(this).ajaxComplete(function (e, x, o) {
    __spinRevoke(o.url, _aMap2);
});

function startRedirectSpinner(btn) {
    let key = Date.now();
    __spinInvoke(key, btn, _aMap3);
    setTimeout(function () {
        __spinRevoke(key, _aMap3);
    }, 2500);
}

function __spinInvoke(key, btn, _Map) {
    _Map.set(key, { btn: btn, htm: $(btn).html(), onc: $(btn).attr("onclick") });
    if (btn.nodeName === "BUTTON") $(btn).prop("disabled", true);
    $(btn).attr("onclick", null);
    $(btn).find(".material-icons").first().remove();
    $(btn).find(".mdc-button__icon").first().remove();
    $(btn).prepend("<i class='mdi mdi-loading mdi-spin mr-2'></i>");
}

function __spinRevoke(key, _Map) {
    for (let [k, v] of _Map) {
        if (k == key) {
            if (v.btn.nodeName === "BUTTON") $(v.btn).prop("disabled", false);
            $(v.btn).html(v.htm);
            $(v.btn).attr("onclick", v.onc);
            $(v.btn).find(".mdi-loading").remove();
            $(v.btn).find(".mdi-spin").remove();
            _Map.delete(k);
        }
    }
}