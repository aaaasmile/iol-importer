


var log_ctor = function (name_type) {
    var that = {};
    var _name_type = name_type;

    var log = function () {
        if (typeof (console) !== "undefined") {
            return {
                debug: function (msg) {
                    console.log("[DBG]" + msg);
                },
                warn: function (msg) {
                    console.log("[WRN]" + msg);
                },
                error: function (msg) {
                    console.log("[ERR]" + msg);
                },
                info: function (msg) {
                    console.log("[INFO]" + msg);
                },
                change_nametype: function (newname) {
                    _name_type = newname;
                }
            };
        }
        return {
            debug: function (msg) {
            },
            warn: function (msg) {
            },
            error: function (msg) {
            },
            info: function (msg) {
            },
            change_nametype: function (newname) {
            }
        }
    } ();

    that.debug = function (msg) {
        log.debug("[" + _name_type + "]" + msg);
    }

    that.warn = function (msg) {
        log.warn("[" + _name_type + "]" + msg);
    }

    that.error = function (msg) {
        log.error("[" + _name_type + "]" + msg);
    }

    that.info = function (msg) {
        log.info("[" + _name_type + "]" + msg);
    }

    that.change_nametype = function (newname) {
        log.change_nametype(newname);
    }

    return that;
}

if (typeof (Error) === "undefined") {
    Error = function (msg) {
        log_ctor("ERROR_stub").error(msg);
        throw (msg);
    };
}