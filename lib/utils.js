// file utils.js

exports.trim = function (str) {
    return str.replace(/^\s+/, "").replace(/\s+$/, "");
}

exports.proc_counter_ctor = function (num_items, fun_cb) {
    var that = {};
    var _count = 0, _failed_items = 0, _ok_items = 0;

    that.item_done_ok = function () {
        _count += 1;
        _ok_items += 1;
        if (_count >= num_items) {
            fun_cb(_failed_items, _ok_items);
        }
    }

    that.item_done_failed = function () {
        _count += 1;
        _failed_items += 1;
        if (_count >= num_items) {
            fun_cb(_failed_items, _ok_items);
        }
    }

    return that;
}

exports.proc_single_ctor = function (fun_cb) {
    return m_exports.proc_counter_ctor(1, fun_cb);
}