var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var VAYU;
(function (VAYU) {
    "use strict";
    var LAYR = (function (_super) {
        __extends(LAYR, _super);
        function LAYR() {
            _super.apply(this, arguments);
        }
        LAYR.prototype.render = function (ctx, view) { };
        LAYR.methods = {
            render: LAYR.prototype.render
        };
        LAYR.events = {
            "hook:created": function () {
                VAYU.unveil(this, "created");
                var self = this;
                self._uid = self.$root._uid++;
            },
            "hook:ready": function () {
                VAYU.unveil(this, "ready");
            }
        };
        return LAYR;
    })(Vue);
    VAYU.LAYR = LAYR;
    TSC2COMP(LAYR, VAYU);
})(VAYU || (VAYU = {}));
