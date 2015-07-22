var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") return Reflect.decorate(decorators, target, key, desc);
    switch (arguments.length) {
        case 2: return decorators.reduceRight(function(o, d) { return (d && d(o)) || o; }, target);
        case 3: return decorators.reduceRight(function(o, d) { return (d && d(target, key)), void 0; }, void 0);
        case 4: return decorators.reduceRight(function(o, d) { return (d && d(target, key, o)) || o; }, desc);
    }
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
        RCTX = __decorate([
            DVue()
        ], RCTX);
        return RCTX;
    })(Vue);
    VAYU.RCTX = RCTX;
    var RCTX;
    (function (RCTX) {
        (function (TYPE) {
            TYPE[TYPE["SVG"] = 0] = "SVG";
            TYPE[TYPE["CANVAS"] = 1] = "CANVAS";
            TYPE[TYPE["WEBGL"] = 2] = "WEBGL";
        })(RCTX.TYPE || (RCTX.TYPE = {}));
        var TYPE = RCTX.TYPE;
        var SVG = (function (_super) {
            __extends(SVG, _super);
            function SVG() {
                _super.apply(this, arguments);
            }
            SVG.template = '<svg version="1.1" class="rctx" v-attr="width:$root.view.w,height:$root.view.h"><g v-repeat="layers" v-component="{{component||\'vayu-\'+(type==\'Feature\'?geometry.type:type)}}" track-by="_uid"></g></svg>';
            SVG.replace = true;
            SVG = __decorate([
                DVue(RCTX)
            ], SVG);
            return SVG;
        })(RCTX);
        RCTX.SVG = SVG;
        VAYU.component("vayu-rctx-" + TYPE[TYPE.SVG], SVG);
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
                var layers = self.$children;
                for (var i = 0, l = layers.length; i < l; i++) {
                    if (layers[i].hide) {
                        continue;
                    }
                    self.$ctx.save();
                    layers[i].render(self.$ctx, self.$root.view);
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
            CANVAS = __decorate([
                DVue(RCTX)
            ], CANVAS);
            return CANVAS;
        })(RCTX);
        RCTX.CANVAS = CANVAS;
        VAYU.component("vayu-rctx-" + TYPE[TYPE.CANVAS], CANVAS);
    })(RCTX = VAYU.RCTX || (VAYU.RCTX = {}));
})(VAYU || (VAYU = {}));
