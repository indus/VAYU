var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var VAYU;
(function (VAYU) {
    "use strict";
    var RCTX = (function (_super) {
        __extends(RCTX, _super);
        function RCTX() {
            _super.apply(this, arguments);
        }
        RCTX.prototype.update = function () { };
        RCTX.methods = {
            update: RCTX.prototype.update
        };
        RCTX.events = {
            "hook:created": function () {
                VAYU.unveil(this, "created");
                var self = this;
                self._uid = self.$root._uid++;
            },
            "hook:ready": function () {
                VAYU.unveil(this, "ready");
                var self = this;
                this.$root.$watch("view.update", function (update) {
                    if (!update)
                        return;
                    self.update();
                }, { deep: true });
            }
        };
        return RCTX;
    })(Vue);
    VAYU.RCTX = RCTX;
    TSC2COMP(RCTX, VAYU);
    var RCTX;
    (function (RCTX) {
        (function (TYPE) {
            TYPE[TYPE["SVG"] = 0] = "SVG";
            TYPE[TYPE["CANVAS"] = 1] = "CANVAS";
            /** not in use*/
            TYPE[TYPE["WEBGL"] = 2] = "WEBGL";
        })(RCTX.TYPE || (RCTX.TYPE = {}));
        var TYPE = RCTX.TYPE;
        var STYLEMAP = {
            "stroke": "strokeStyle",
            "stroke-width": "lineWidth",
            "fill": "fillStyle"
        };
        var SVG = (function (_super) {
            __extends(SVG, _super);
            function SVG() {
                _super.apply(this, arguments);
            }
            SVG.template = '<svg version="1.1" class="rctx" v-attr="width:$root.view.w,height:$root.view.h"><g v-repeat="layers" v-component="{{component||\'vayu-\'+(type==\'Feature\'?geometry.type:type)}}" track-by="_uid"></g></svg>';
            SVG.replace = true;
            return SVG;
        })(RCTX);
        RCTX.SVG = SVG;
        VAYU.component("vayu-rctx-" + TYPE[TYPE.SVG], TSC2COMP(SVG, VAYU));
        var CANVAS = (function (_super) {
            __extends(CANVAS, _super);
            function CANVAS() {
                _super.apply(this, arguments);
            }
            CANVAS.prototype.update = function () {
                var self = this;
                if (!self.$root)
                    return;
                self.$el.width = self.$root.view.w;
                self.$el.height = self.$root.view.h;
                var layers = self.$children, ctx = self.$ctx;
                for (var _i = 0; _i < layers.length; _i++) {
                    var layer = layers[_i];
                    if (layer.hide) {
                        continue;
                    }
                    ctx.save();
                    var style_;
                    for (var style in layer.style)
                        (style_ = STYLEMAP[style] || style) in ctx && (ctx[style_] = layer.style[style]);
                    layer.render(ctx, self.$root.view);
                    self.$ctx.restore();
                }
            };
            CANVAS.template = '<canvas class="rctx"><layer v-repeat="layers" v-component="{{component||(\'vayu-\' + type)}}" track-by="_uid"></layer></canvas>';
            CANVAS.replace = true;
            CANVAS.methods = {
                update: CANVAS.prototype.update
            };
            CANVAS.events = {
                "hook:ready": function () {
                    var self = this;
                    self.$ctx = self.$el.getContext("2d");
                }
            };
            return CANVAS;
        })(RCTX);
        RCTX.CANVAS = CANVAS;
        VAYU.component("vayu-rctx-" + TYPE[TYPE.CANVAS], TSC2COMP(CANVAS, VAYU));
    })(RCTX = VAYU.RCTX || (VAYU.RCTX = {}));
})(VAYU || (VAYU = {}));
