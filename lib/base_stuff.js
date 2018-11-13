//file: base_stuff.js

// In the 'javascript the good part', superior is defined with a Function.prototype
// and Object.method. This doesn't works with jquery and kendo and should be avoided.
// So I create a function that return an object with the method superior included. 
// Because it is used in many files I have declared it as global.

obj_with_superior_ctor = function () {
    var that = {}

    that.superior = function (name) {
        var that_child = this;
        var method = that_child[name];
        return function () {
            return method.apply(that_child, arguments);
        };
    };

    return that;
}
