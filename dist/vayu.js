///#source 1 1 /src/ACTION.js
/**
 * ACTION v0.1.0
 * (c) 2015 Stefan Keim (aka indus)
 * powered by DLR-DFD
 */
'use strict';
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
if (typeof CustomEvent !== "function") {
    (function () {
        function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var ev = document.createEvent("CustomEvent");
            ev.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return ev;
        }
        CustomEvent.prototype = Event.prototype;
        window["CustomEvent"] = CustomEvent;
    })();
}
/**
 * **ACTION [v0.1.0]**
 * is an abstraction layer to unify *mouse*, *wheel*, *touch* and *pointer* events and simulate *inertia* (designd - not only - but especially for map interaction).
 * Provide a callback or listen to a CustomEvent named ```'action'``` on ``` window ``` to get ActionEvents.
 */
var Action = (function () {
    /** @param callback if no callback is provided a CustomEvent with IActionEventDetails is dispatched on ```window``` instead */
    function Action(target, callback, options) {
        var _this = this;
        this._inertia = true;
        this._ev = {};
        this._cache = {};
        this._queue = [];
        this._cb = callback || function (detail) {
            target.dispatchEvent(new window["CustomEvent"]("action", { detail: detail }));
        };
        options = options || {};
        for (var key in Action._defaults) {
            options[key] = (key in options) ? options[key] : Action._defaults[key];
        }
        this._inertia = options.inertia;
        /* MOUSE */
        if ((options.onmouse && Action.SPRT_MOUSE) || (options.onmouse === 1)) {
            new Action.Input.Mouse(target, this._callback.bind(this));
        }
        /* WHEEL (direct implementation; no inertia) */
        if ((options.onwheel && Action.SPRT_MOUSE) || (options.onwheel === 1)) {
            Action.Input.addListeners(target, "mousewheel DOMMouseScroll", function (ev) {
                var p;
                var $ = {
                    s: Math.pow(1.2, Math.max(-1, Math.min(1, (ev.wheelDelta || -ev.detail)))),
                    isMulti: false
                };
                $.isFirst = $.isLast = $.isWheel = true;
                $.x = $.y = $.r = 0;
                $.pageX = ev.pageX;
                $.pageY = ev.pageY;
                $.clientX = ev.clientX;
                $.clientY = ev.clientY;
                _this._cb($);
            });
        }
        /* TOUCH */
        if ((options.ontouch && Action.SPRT_TOUCH) || (options.ontouch === 1)) {
            new Action.Input.Touch(target, this._callback.bind(this));
        }
        /* POINT */
        if ((options.onpoint && Action.SPRT_POINT) || (options.onpoint === 1)) {
            new Action.Input.Point(target, this._callback.bind(this));
        }
    }
    Action.prototype._callback = function (type, points) {
        var c = this._cache;
        // prepare event details
        var $ = {
            x: 0,
            y: 0,
            r: 0,
            s: 1,
            pageX: null,
            pageY: null,
            clientX: null,
            clientY: null,
            isFirst: type === Action.EVTYPE.START,
            isLast: type === Action.EVTYPE.END,
            isMulti: points.length > 1,
            points: points,
            timestamp: Date.now()
        };
        // calc XY if points available (otherwise use last)
        if (points.length) {
            c.pX = points[0].pageX;
            c.pY = points[0].pageY;
            c.cX = points[0].clientX;
            c.cY = points[0].clientY;
            if ($.isMulti) {
                var dx = c.pX - points[1].clientX, dy = c.pY - points[1].clientY, d, r;
                c.pX = (c.pX + points[1].pageX) / 2;
                c.pY = (c.pY + points[1].pageY) / 2;
                c.cX = (c.cX + points[1].clientX) / 2;
                c.cY = (c.cY + points[1].clientY) / 2;
                d = Math.sqrt(Math.pow(Math.abs(dx), 2) + Math.pow(Math.abs(dy), 2));
                r = -Math.atan2(dx, dy);
            }
        }
        $.pageX = c.pX;
        $.pageY = c.pY;
        $.clientX = c.cX;
        $.clientY = c.cY;
        // calc params on intermediate events
        if (!$.isFirst && !$.isLast) {
            $.x = c.cX - c.x;
            $.y = c.cY - c.y;
            $.s = d / c.d || 1;
            $.r = r - c.r || 0;
        }
        // cache values
        c.x = c.cX;
        c.y = c.cY;
        c.d = d;
        c.r = r;
        // fire event;
        this._cb($);
        /* INERTIA */
        if (this._inertia) {
            var q = this._queue, iFn = this._inertiaFn;
            // apply
            if ($.isLast) {
                var now = performance.now();
                // exit if to few events || to frequent last-event || or translate-only inertia
                if (q.length < 3 || (iFn.active && (now - iFn.active) < 20) || (points.length && (this._inertia < 0)))
                    return;
                // calc velocities
                var t = Date.now();
                for (var i = q.length - 1, dT; i > 1; i--) {
                    dT = Math.max(t - q[i].timestamp, 1);
                    c.vx = (c.vx + q[i].x / dT) / 2;
                    c.vy = (c.vy + q[i].y / dT) / 2;
                    if (q[i].isMulti) {
                        c.vs = (c.vs + (q[i].s - 1) / dT) / 2;
                        c.vr = (c.vr + q[i].r / dT) / 2;
                    }
                }
                c.vs = Math.max(-1e-3, Math.min(1e-3, c.vs));
                c.vr = Math.max(-3e-3, Math.min(3e-3, c.vr));
                q.length = 0;
                // start inertia
                if (!iFn.active) {
                    iFn.active = now;
                    $.isLast = !($.isFirst = $.isInertia = true);
                    $.isMulti = !!points.length;
                    delete $.points;
                    delete $.timestamp;
                    this._ev = $;
                    this._inertiaFn(0, now);
                    $.isFirst = false;
                }
            }
            else {
                $.isFirst && (iFn.active = q.length = c.vx = c.vy = c.vs = c.vr = 0);
                (q.unshift($) > 6) && (q.length = 6);
            }
        }
    };
    Action.prototype._inertiaFn = function (t, pnow) {
        var _this = this;
        var ev = this._ev, c = this._cache, iFn = this._inertiaFn;
        // intermediate event
        if (iFn.active &&
            Math.abs(c.vx) > 1.5e-2 ||
            Math.abs(c.vy) > 1.5e-2 ||
            Math.abs(c.vr) > 3e-4 ||
            Math.abs(c.vs) > 1e-4) {
            ev.x = t * c.vx;
            ev.y = t * c.vy;
            ev.r = t * c.vr;
            ev.s = t * c.vs + 1;
            c.vx *= .94;
            c.vy *= .94;
            c.vr *= .9;
            c.vs *= .9;
            requestAnimationFrame(function (p) { return _this._inertiaFn(p - pnow, p); });
        }
        else {
            ev.isLast = !!iFn.active;
            iFn.active = ev.x = ev.y = ev.r = 0;
            ev.s = 1;
        }
        // fire event
        this._cb(ev);
    };
    /** are MouseEvents supported */
    Action.SPRT_MOUSE = !(/mobile|ip(ad|hone|od)|android/i.test(navigator.userAgent));
    /** are TouchEvents supported */
    Action.SPRT_TOUCH = ("ontouchstart" in window);
    /** are PointerEvents supported */
    Action.SPRT_POINT = ("MSPointerEvent" in window);
    Action._defaults = {
        /** use mouse input: *true* */
        onmouse: true,
        /** use wheel input: *true* */
        onwheel: true,
        /** use touch input: *true* */
        ontouch: true,
        /** use pointer input: *true* */
        onpoint: true,
        /** fire inertia events: *true* */
        inertia: true
    };
    return Action;
})();
var Action;
(function (Action) {
    // Definition of Event-Types
    (function (EVTYPE) {
        EVTYPE[EVTYPE["START"] = 1] = "START";
        EVTYPE[EVTYPE["MOVE"] = 2] = "MOVE";
        EVTYPE[EVTYPE["END"] = 4] = "END";
        /** not in use */
        EVTYPE[EVTYPE["CANCEL"] = 8] = "CANCEL";
    })(Action.EVTYPE || (Action.EVTYPE = {}));
    var EVTYPE = Action.EVTYPE;
    ;
    var Input = (function () {
        function Input(tgt, cb, static_) {
            var _this = this;
            this.$ = [];
            this._cb = cb;
            this.listener = function (ev) {
                _this.handler(ev);
            };
            var win = tgt.ownerDocument.defaultView || tgt.ownerDocument.parentWindow;
            // start on target
            Input.addListeners(tgt, static_.evTGT, this.listener, false);
            // move & end on global view
            Input.addListeners(win, static_.evWIN, this.listener, false);
        }
        Input.addListeners = function (target, types, listener, useCapture) {
            types.split(" ").forEach(function (type) {
                target.addEventListener(type, listener, useCapture);
            });
        };
        // TODO use 'removeListers' to clean up
        Input.removeListeners = function (target, types, listener, useCapture) {
            types.split(" ").forEach(function (type) {
                target.removeEventLister(type, listener, useCapture);
            });
        };
        Input.prototype.handler = function (ev) { };
        // copy params of ev to $
        Input.prototype.setPoint = function (i, ev) {
            if (ev) {
                this.$.splice(i, 1, {
                    pageX: ev.pageX,
                    pageY: ev.pageY,
                    clientX: ev.clientX,
                    clientY: ev.clientY
                });
            }
            else {
                this.$.splice(i, 1);
            }
        };
        return Input;
    })();
    Action.Input = Input;
    var Input;
    (function (Input) {
        var Mouse = (function (_super) {
            __extends(Mouse, _super);
            function Mouse(el, cb) {
                _super.call(this, el, cb, Mouse);
                this.offset = 80; // initial pointer-offset
            }
            Mouse.prototype.handler = function (ev, type) {
                type = type || Mouse.evMAP[ev.type];
                var $ = this.$;
                if (!$.length && (type !== EVTYPE.START)) {
                    return;
                }
                /* MOUSE MOVE */
                if (type & EVTYPE.MOVE) {
                    if ($.length && $.length === ((ev.shiftKey) ? 2 : this._which)) {
                        if ($.length === 1) {
                            this.setPoint(0, ev);
                        }
                        else {
                            var offset = this.offset, cntr = this._ev, deltaX = cntr.clientX - ev.clientX + offset, deltaY = cntr.clientY - ev.clientY - offset;
                            if (!deltaX && !deltaY) {
                                deltaX = deltaY = 1;
                            }
                            $.splice(0, 1, {
                                pageX: cntr.pageX + deltaX,
                                pageY: cntr.pageY + deltaY,
                                clientX: cntr.clientX + deltaX,
                                clientY: cntr.clientY + deltaY
                            });
                            $.splice(1, 1, {
                                pageX: cntr.pageX - deltaX,
                                pageY: cntr.pageY - deltaY,
                                clientX: cntr.clientX - deltaX,
                                clientY: cntr.clientY - deltaY
                            });
                        }
                        this._cb((type & EVTYPE.START) ? EVTYPE.START : EVTYPE.MOVE, $);
                    }
                    else if ($.length) {
                        if (1 === ($.length = ((ev.shiftKey) ? 2 : this._which))) {
                            this.setPoint(0, ev);
                            this.setPoint(1, null);
                            this._cb(EVTYPE.END, $);
                        }
                        else {
                            this._ev = ev;
                            this.handler(ev, type + EVTYPE.START);
                        }
                    }
                }
                else if (type === EVTYPE.END) {
                    $.length = 0;
                    this._cb(type, $);
                }
                else if (type === EVTYPE.START) {
                    this._which = ev.which;
                    if (1 === ($.length = (this._which < 3) ? ev.shiftKey ? 2 : this._which : 0)) {
                        this.setPoint(1, null);
                    }
                    else {
                        this._ev = ev;
                    }
                    this.handler(ev, type + EVTYPE.MOVE);
                }
            };
            Mouse.evMAP = {
                mousedown: EVTYPE.START,
                mousemove: EVTYPE.MOVE,
                mouseup: EVTYPE.END
            };
            Mouse.evTGT = "mousedown";
            Mouse.evWIN = "mousemove mouseup";
            return Mouse;
        })(Input);
        Input.Mouse = Mouse;
        var Touch = (function (_super) {
            __extends(Touch, _super);
            function Touch(el, cb) {
                _super.call(this, el, cb, Touch);
            }
            Touch.prototype.handler = function (ev, type) {
                ev.preventDefault();
                type = type || Touch.evMAP[ev.type];
                var $ = this.$;
                if ($.length = Math.min(ev.touches.length, 2)) {
                    this.setPoint(0, ev.touches[0]);
                    this.setPoint(1, ev.touches[1]);
                }
                this._cb(type, $);
            };
            Touch.evMAP = {
                touchstart: EVTYPE.START,
                touchmove: EVTYPE.MOVE,
                touchend: EVTYPE.END,
                touchcancel: EVTYPE.CANCEL
            };
            Touch.evTGT = "touchstart";
            Touch.evWIN = "touchmove touchend touchcancel";
            return Touch;
        })(Input);
        Input.Touch = Touch;
        var Point = (function (_super) {
            __extends(Point, _super);
            function Point(el, cb) {
                _super.call(this, el, cb, Point);
                this._pid = []; // pointerIds
            }
            Point.prototype.handler = function (ev, type) {
                if (ev.pointerType === "mouse") {
                    return;
                }
                ;
                ev.preventDefault();
                type = type || Point.evMAP[ev.type];
                var $ = this.$, pid = this._pid, id = pid.indexOf(ev.pointerId);
                /* POINTER MOVE */
                if (type & EVTYPE.MOVE) {
                    if (id > -1) {
                        this.setPoint(id, ev);
                        this._cb((type & EVTYPE.START) ? EVTYPE.START : EVTYPE.MOVE, $);
                    }
                }
                else if (type === EVTYPE.END) {
                    if (id > -1) {
                        this.setPoint(id, null);
                        pid.splice(id, 1);
                        this._cb(type, $);
                    }
                }
                else if (type === EVTYPE.START) {
                    if (pid.length < 2) {
                        this.setPoint(1, (pid.push(ev.pointerId) === 1) ? null : ev);
                        this.handler(ev, type + EVTYPE.MOVE);
                    }
                }
            };
            Point.evMAP = {
                pointerdown: EVTYPE.START,
                pointermove: EVTYPE.MOVE,
                pointerup: EVTYPE.END,
                pointercancel: EVTYPE.CANCEL,
                pointerout: EVTYPE.CANCEL,
                MSPointerDown: EVTYPE.START,
                MSPointerMove: EVTYPE.MOVE,
                MSPointerUp: EVTYPE.END,
                MSPointerCancel: EVTYPE.CANCEL
            };
            Point.evTGT = (window.navigator.msPointerEnabled) ? "MSPointerDown" : "pointerdown";
            Point.evWIN = (window.navigator.msPointerEnabled) ? "MSPointerMove MSPointerUp MSPointerCancel" : "pointermove pointerup pointercancel";
            return Point;
        })(Input);
        Input.Point = Point;
    })(Input = Action.Input || (Action.Input = {}));
})(Action || (Action = {}));

///#source 1 1 /src/VAYU.js
/// <reference path="../org/vue.d.ts" />
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
Math.R2D = 180 / Math.PI;
Math.D2R = Math.PI / 180;
Math.PIx2 = Math.PI * 2;
Math.PI_2 = Math.PI / 2;
/** ES6 VueComponent decorator */
function DVue(sup, opt) {
    var sup = sup || Vue;
    return function (voptclass) {
        return sup
            .extend(Object
            .keys(voptclass)
            .reduceRight(function (opt, key) {
            sup.hasOwnProperty(key) || (opt[key] = voptclass[key]);
            return opt;
        }, opt || { name: voptclass.name }));
    };
}
;
/**
 * **VAYU** [0.3.0] - the main class
 * */
var VAYU = (function (_super) {
    __extends(VAYU, _super);
    function VAYU() {
        _super.apply(this, arguments);
    }
    /** stops event propagation */
    VAYU.prototype.stopEvent = function (ev) { ev.stopPropagation(); return ev; };
    /** updates the view */
    VAYU.prototype.update = function () { this.view.update = !(this.view.update = false); };
    /** recenters the view */
    VAYU.prototype._onResize = function (evt) {
        var v = this.view, cr = this.$el.getBoundingClientRect();
        v.cx = (v.w = cr.width) / 2;
        v.cy = (v.h = cr.height) / 2;
        if (isNaN(v.cntrC[0] + v.cntrC[1])) {
            return;
        }
        v.cntrL = v.g2l([v.cx, v.cy]);
        this.center = v.cntrC;
    };
    VAYU.temp = function (id) { return (document["currentScript"] || document.body).ownerDocument.getElementById("vayu_" + id); };
    VAYU.template = VAYU.temp("VAYU");
    VAYU.replace = true;
    VAYU.data = function () {
        return {
            class_action: false,
            class_inertia: false,
            view: new VAYU.View,
            layers: []
        };
    };
    VAYU.methods = {
        stopEvent: VAYU.prototype.stopEvent,
        update: VAYU.prototype.update,
        _onResize: VAYU.prototype._onResize
    };
    VAYU.filters = {
        /** render context filter */
        rctx: function (layers) {
            if (!layers.length)
                return [];
            var layers_ = [], comps = window["VAYU"].options.components, layergroup;
            for (var i = 0, rctx; i < layers.length; i++) {
                rctx = layers[i].rctx || VAYU.RCTX.TYPE[comps['vayu-' + layers[i].type].options.rctx];
                if (!rctx)
                    return;
                var _uid = layers[i]._uid;
                if (!_uid) {
                    Object.defineProperty(layers[i], '_uid', { value: _uid = this.$root._uid++ });
                }
                if (layergroup && layergroup._rctx == rctx) {
                    layergroup.layers.push(layers[i]);
                    layergroup._uid += "_" + _uid;
                }
                else {
                    layers_.push(layergroup = { layers: [layers[i]], _rctx: rctx, _uid: _uid });
                }
            }
            return layers_;
        }
    };
    // getters and setter of transformation
    VAYU.computed = {
        center: {
            get: function () { return this.view.cntrC; },
            set: function (val) {
                var v = this.view;
                val = v.c2l(val, v.dim);
                v.transform(v.projX(v.cntrL, v.m) - v.projX(val, v.m), v.projY(v.cntrL, v.m) - v.projY(val, v.m));
            }
        },
        zoom: {
            get: function () { return this.view.z; },
            set: function (val) {
                var v = this.view;
                v.transform(0, 0, Math.pow(2, val - v.z));
            }
        },
        rotation: {
            get: function () { return this.view.r * Math.R2D; },
            set: function (val) {
                var v = this.view;
                v.transform(0, 0, 1, val * Math.D2R - v.r);
            }
        }
    };
    // LIFECYCLE
    VAYU.created = function () {
        VAYU.unveil(this, "created");
        var self = this;
        self._uid = 0;
    };
    VAYU.ready = function () {
        var _this = this;
        VAYU.unveil(this, "ready");
        var self = this, v = self.view;
        // build layers lazy
        this.layers = this.$options.layers;
        // init request queue
        (self.reqQueue = []).max = 9;
        // init resize handler
        Vue.util.on(window, "resize", self._onResize);
        self._onResize();
        this.$watch("layers", this.$root.update, { deep: true });
        // init action handler (Action unifies various user inputs for map transform)
        var action = new Action(self.$el, function (d) {
            // apply action event to map transform;
            self.view.transform(d.x, d.y, d.s, d.r, d.clientX, d.clientY);
            if (d.isFirst || d.isLast) {
                _this.class_action = d.isFirst && !d.isWheel;
                _this.class_inertia = d.isFirst && d.isInertia;
            }
        });
        // init the map transform
        var o = self.$options, center = v.c2l(o.center || [0, 0]), scale = Math.pow(2, o.zoom || 0), rotation = (o.rotation || 0) * Math.D2R;
        // apply the initial map transform
        v.transform(v.cx - v.projX(center, v.m), v.cy - v.projY(center, v.m), scale, rotation);
    };
    VAYU = __decorate([
        DVue()
    ], VAYU);
    return VAYU;
})(Vue);
var VAYU;
(function (VAYU) {
    VAYU.version = "0.3.0";
    console.log("%c VAYU [" + VAYU.version + "] ", "color:#42b983;background-color:#333;font-weight:bold;font-size:20px;");
    VAYU.config = {
        debug: true,
        verbose: true,
    };
    VAYU.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i - 0] = arguments[_i];
        }
        VAYU.config.debug && console.log.apply(console, msg);
    };
    VAYU.unveil = function (comp, hook, desc) {
        VAYU.config.verbose && console.log("[" + ((desc || '') + comp.constructor.name) + (comp.id ? (" '" + comp.id + "' ") : " ") + hook + "]", comp);
    };
    var View = (function () {
        function View(crs, dim) {
            if (crs === void 0) { crs = new CRS.EPSG3857; }
            if (dim === void 0) { dim = 256; }
            this.m = new Float64Array([1, 0, 0, 0, 1]); // transform matrix (a = d = m[0], c = -(b = [1]), e = [2], f = [3], d=[4])
            this.ṁ = new Float64Array(4); // inverse transform matrix
            this.m_ = new Float64Array(5); // temp
            this.ṁ_ = new Float64Array(4); // temp
            //ṃ: Float64Array = new Float64Array([1, 0, 0, 0]); // delta transform matrix
            //ṃ_: Float64Array = new Float64Array(4); // temp
            this.s = 1; // scale as float
            this.z = 0; // zoomlevel as float
            this.r = 0; // rotation in radians
            this.w = 0; // screen width
            this.h = 0; // screen height
            this.cx = 0; // screen center x
            this.cy = 0; // screen center y
            this.cntrL = [NaN, NaN]; // local center; l = local (1024 square with center[0, 0])
            this.cntrG = [NaN, NaN]; // global center; g = global(screen)
            this.cntrC = [NaN, NaN]; // coordinate center; c = coordinate(web - mercator[longitude, latitude])
            this.tranMX = null; // transform-string 'matrix'/'transform' 
            //tranMX_: string = null; // transform-string delta 'matrix'/'transform' 
            this.tranUX = null; // transform-string 'inverse matrix'/'untransform' 
            this.tranUS = null; // transform-string 'unscale'
            this.tranUR = null; // transform-string 'unrotate'
            this.restrictZ = [0, 18]; // restrict z-level
            this.restrictCntr = true; // restrict center (true = keep map on screen, "strict"= keep screen-center on map )
            this.update = true;
            this.crs = crs;
            this.dim = dim;
            this.dimc = dim / 2;
        }
        View.prototype.transform = function (x, y, scale, rotation, pivotX, pivotY, trial) {
            var v = this, m = v.m, ṁ = v.ṁ, m_ = v.m_, ṁ_ = v.ṁ_, 
            //ṃ = v.ṃ,
            //ṃ_ = v.ṃ_,
            complex = scale && (scale !== 1 || rotation), cntrL, cntrG;
            //ṃ = v.ṃ // temporary matrix; not in use
            m_[0] = m[0], m_[1] = m[1], m_[2] = m[2], m_[3] = m[3];
            //ṃ_[0] = ṃ[0], ṃ_[1] = ṃ[1], ṃ_[2] = ṃ[2], ṃ_[3] = ṃ[3];
            if (complex) {
                // use defaults for optional params
                pivotX = pivotX || v.cx;
                pivotY = pivotY || v.cy;
                rotation = rotation || 0;
                // declare vars and calc transform
                var d, s, z, r, px = x - pivotX, py = y - pivotY, cos = Math.cos(rotation) * scale, sin = Math.sin(rotation) * scale;
                m_[0] = cos * m[0] - sin * m[1];
                m_[1] = sin * m[0] + cos * m[1];
                m_[2] = cos * m[2] - sin * m[3] + (pivotX + cos * px - sin * py);
                m_[3] = sin * m[2] + cos * m[3] + (pivotY + sin * px + cos * py);
                //ṃ_[0] = cos * ṃ[0] - sin * ṃ[1];
                //ṃ_[1] = sin * ṃ[0] + cos * ṃ[1];
                //ṃ_[2] = cos * ṃ[2] - sin * ṃ[3] + (pivotX + cos * px - sin * py);
                //ṃ_[3] = sin * ṃ[2] + cos * ṃ[3] + (pivotY + sin * px + cos * py);
                // calculate determinant
                m_[4] = m_[0] * m_[0] + m_[1] * m_[1];
                // calc parameters
                s = Math.sqrt(m_[4]);
                z = Math.log(s) / Math.LN2;
                r = Math.atan2(m_[1], m_[0]);
                // restrict z
                if (v.restrictZ[0] > z || v.restrictZ[1] < z) {
                    return !trial && v.transform(x, y, 1, rotation, pivotX, pivotY, true);
                }
            }
            else {
                // apply translation
                m_[2] += x;
                m_[3] += y;
            }
            // calc and set inverse
            ṁ_[0] = m_[0] / m_[4];
            ṁ_[1] = m_[1] / -m_[4];
            ṁ_[2] = (-m_[1] * m_[3] - m_[0] * m_[2]) / m_[4];
            ṁ_[3] = (m_[1] * m_[2] - m_[0] * m_[3]) / m_[4];
            cntrL = v.proj([v.cx, v.cy], ṁ_);
            cntrG = v.proj([v.dimc, v.dimc], m_);
            // calc and restrict local center and global center
            if ((v.restrictCntr && !v.contains(cntrL, v.dim, v.dim)) &&
                ((v.restrictCntr === "strict") || !v.contains(cntrG, v.w, v.h))) {
                // bounce back
                x = (cntrG[0] < v.cx) ? 1 : -1;
                y = (cntrG[1] < v.cy) ? 1 : -1;
                // [TODO] stop flicker 
                return !trial && v.transform(x, y, scale, rotation, 0, 0, true);
            }
            // set (inverse-)transform
            m[0] = m_[0];
            m[1] = m_[1];
            m[2] = m_[2];
            m[3] = m_[3];
            m[4] = m_[4];
            ṁ[0] = ṁ_[0];
            ṁ[1] = ṁ_[1];
            ṁ[2] = ṁ_[2];
            ṁ[3] = ṁ_[3];
            //ṃ[0] = ṃ_[0]; ṃ[1] = ṃ_[1]; ṃ[2] = ṃ_[2]; ṃ[3] = ṃ_[3];
            // set centers
            v.cntrL = cntrL;
            v.cntrG = cntrG;
            v.cntrC = v.l2c(cntrL);
            if (complex) {
                v.s = s;
                v.z = z;
                v.r = r;
            }
            v.update && (v.update = Vue.nextTick(this.apply, this));
        };
        View.prototype.apply = function () {
            var v = this, m = v.m, ṁ = v.ṁ; //, ṃ = v.ṃ;
            Vue.config.async = false;
            v.update = true;
            v.tranMX = "matrix(" + m[0] + "," + m[1] + "," + -m[1] + "," + m[0] + "," + m[2] + "," + m[3] + ")";
            //v.tranMX_ = "matrix(" + ṃ[0] + "," + ṃ[1] + "," + -ṃ[1] + "," + ṃ[0] + "," + ṃ[2] + "," + ṃ[3] + ")";
            v.tranUX = "matrix(" + ṁ[0] + "," + ṁ[1] + "," + -ṁ[1] + "," + ṁ[0] + ",0,0)";
            v.tranUS = "scale(" + 1 / v.s + ")";
            v.tranUR = "rotate(" + -v.r / Math.D2R + ")";
            Vue.config.async = true;
        };
        // check if point is in rect (with threshold)
        View.prototype.contains = function (pnt, w, h, thld) {
            var x_, y_;
            thld = thld || 0;
            return (pnt[0] > -thld) && (pnt[0] < (w + thld))
                && (pnt[1] > -thld) && (pnt[1] < (h + thld));
        };
        /* PROJECTIONS */
        // project a point 
        View.prototype.proj = function (p, m) { return [this.projX(p, m), this.projY(p, m)]; };
        View.prototype.projX = function (p, m) { return m[0] * p[0] - m[1] * p[1] + m[2]; };
        View.prototype.projY = function (p, m) { return m[1] * p[0] + m[0] * p[1] + m[3]; };
        View.prototype.l2g = function (p) { return this.proj(p, this.m); };
        View.prototype.g2l = function (p) { return this.proj(p, this.ṁ); };
        View.prototype.c2l = function (coo) {
            return this.crs.transform(this.crs.project(coo), this.dim);
        };
        View.prototype.l2c = function (pnt) {
            return this.crs.unproject(this.crs.untransform(pnt, this.dim));
        };
        View.prototype.c2g = function (coo) {
            return this.l2g(this.c2l(coo));
        };
        View.prototype.g2c = function (pnt) {
            return this.l2c(this.g2l(pnt));
        };
        return View;
    })();
    VAYU.View = View;
    var CRS;
    (function (CRS) {
        var ACRS = (function () {
            function ACRS() {
            }
            ACRS.prototype.transform = function (pnt, scale) {
                scale = scale || 1;
                return [scale * (this._a * pnt[0] + this._b), scale * (this._c * pnt[1] + this._d)];
            };
            ACRS.prototype.untransform = function (pnt, scale) {
                scale = scale || 1;
                return [(pnt[0] / scale - this._b) / this._a, (pnt[1] / scale - this._d) / this._c];
            };
            ACRS.prototype.project = function (coo) { return [this.lng2x(coo[0]), this.lat2y(coo[1])]; };
            ACRS.prototype.unproject = function (pnt) { return [this.x2lng(pnt[0]), this.y2lat(pnt[1])]; };
            ACRS.prototype.lng2x = function (lng) { return lng; };
            ACRS.prototype.lat2y = function (lat) { return lat; };
            ACRS.prototype.x2lng = function (x) { return x; };
            ACRS.prototype.y2lat = function (y) { return y; };
            return ACRS;
        })();
        CRS.ACRS = ACRS;
        var EPSG4326 = (function (_super) {
            __extends(EPSG4326, _super);
            function EPSG4326() {
                _super.apply(this, arguments);
                this.code = 'EPSG:4326';
                this._a = 1 / 180;
                this._b = 1;
                this._c = -1 / 180;
                this._d = .5;
                this._bounds = [-180, -90, 180, 90];
            }
            return EPSG4326;
        })(ACRS);
        CRS.EPSG4326 = EPSG4326;
        var EPSG3395 = (function (_super) {
            __extends(EPSG3395, _super);
            function EPSG3395() {
                _super.apply(this, arguments);
                this.code = 'EPSG:3395';
                this._a = 2.49532023e-8;
                this._b = .5;
                this._c = -2.49532023e-8;
                this._d = .5;
                this.__R = 6378137;
                this.__e = (function (tmp) { return Math.sqrt(1 - tmp * tmp); })(6356752.314245179 / this.__R);
            }
            EPSG3395.prototype.lng2x = function (lng) {
                return this.__R * lng * Math.D2R;
            };
            EPSG3395.prototype.lat2y = function (lat) {
                var y = lat * Math.D2R, con = this.__e * Math.sin(y);
                return -this.__R * Math.log(Math.max(Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), this.__e / 2), 1E-10));
            };
            EPSG3395.prototype.x2lng = function (x) {
                return x * Math.R2D / this.__R;
            };
            EPSG3395.prototype.y2lat = function (y) {
                var ts = Math.exp(-y / this.__R), phi = Math.PI_2 - 2 * Math.atan(ts);
                for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
                    con = this.__e * Math.sin(phi);
                    con = Math.pow((1 - con) / (1 + con), this.__e / 2);
                    dphi = Math.PI_2 - 2 * Math.atan(ts * con) - phi;
                    phi += dphi;
                }
                return phi * Math.R2D;
            };
            return EPSG3395;
        })(ACRS);
        CRS.EPSG3395 = EPSG3395;
        var EPSG3857 = (function (_super) {
            __extends(EPSG3857, _super);
            function EPSG3857() {
                _super.apply(this, arguments);
                this.code = 'EPSG:3857';
                this._a = 2.49532023e-8;
                this._b = .5;
                this._c = -2.49532023e-8;
                this._d = .5;
                this.__R = 6378137;
            }
            EPSG3857.prototype.lng2x = function (lng) {
                return this.__R * lng * Math.D2R;
            };
            EPSG3857.prototype.lat2y = function (lat) {
                var sin = Math.min(Math.max(Math.sin(lat * Math.D2R), 1E-15 - 1), 1 - 1E-15);
                return this.__R * Math.log((1 + sin) / (1 - sin)) / 2;
            };
            EPSG3857.prototype.x2lng = function (x) {
                return x * Math.R2D / this.__R;
            };
            EPSG3857.prototype.y2lat = function (y) {
                return (2 * Math.atan(Math.exp(y / this.__R)) - Math.PI_2) * Math.R2D;
            };
            return EPSG3857;
        })(ACRS);
        CRS.EPSG3857 = EPSG3857;
    })(CRS = VAYU.CRS || (VAYU.CRS = {}));
})(VAYU || (VAYU = {}));
;

///#source 1 1 /src/RCTX.js
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

///#source 1 1 /src/LAYR.js
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
        LAYR = __decorate([
            DVue()
        ], LAYR);
        return LAYR;
    })(Vue);
    VAYU.LAYR = LAYR;
})(VAYU || (VAYU = {}));

///#source 1 1 /src/LAYR.TILE.js
/// <reference path="vayu.ts" />
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
    var LAYR;
    (function (LAYR) {
        var TILE = (function (_super) {
            __extends(TILE, _super);
            function TILE() {
                _super.apply(this, arguments);
            }
            TILE.prototype.render = function (ctx, v) {
                var vdim = v.dim, tdim = vdim * v.s * 1.004, m0 = v.m[0] * vdim, m1 = v.m[1] * vdim, m2 = v.m[2], m3 = v.m[3], th = (Math.abs(Math.cos(v.r)) + Math.abs(Math.sin(v.r))) * tdim / 2, url = this.url, cache = this._cache, reqQueue = this.$root.reqQueue, z = 0, x = 0, y = 0, dir = true, min = Math.max(0, Math.min(18, Math.round(v.z))), bbox = this._tbox ? this._tbox[Math.round(v.z)] : null;
                if (typeof url !== "function")
                    return;
                var x_, y_, cid, img, src;
                loop: do {
                    if (dir = (dir // test first hit
                        && -th < (x_ = m0 * (x + .5) - m1 * (y + .5) + m2) // proj x & test gt threshold
                        && -th < (y_ = m1 * (x + .5) + m0 * (y + .5) + m3) // proj y & test gt threshold
                        && th > (x_ - v.w) // test x lt width + threshold
                        && th > (y_ - v.h) // test y lt height + threshold
                    )) {
                        if (z === min && (!bbox || x >= bbox[0] && y <= bbox[1] && x <= bbox[2] && y >= bbox[3])) {
                            // [TODO] add for loop for multiple urls in one layer
                            ctx.translate(x_, y_);
                            ctx.rotate(v.r);
                            if ((img = cache[(cid = z + "." + x + "." + y)]) && img.complete && img.width && img.height) {
                                ctx.drawImage(img, -tdim / 2, -tdim / 2, tdim, tdim);
                                if (!cache[cid = (z - 1 + "." + (x >> 1) + "." + (y >> 1))] && (reqQueue.length < (reqQueue.max / 2)) && (src = url(z, x, y))) {
                                    img = new Image();
                                    img.src = src;
                                    img["preload"] = true;
                                    img.onload = img.onerror = this._onTile;
                                    reqQueue.push(cache[cid] = img);
                                }
                            }
                            else {
                                // request tile
                                if ((img === undefined) && (reqQueue.length < reqQueue.max) && (src = url(z, x, y))) {
                                    img = new Image();
                                    img.src = src;
                                    img.onload = img.onerror = this._onTile;
                                    reqQueue.push(cache[cid] = img);
                                }
                                // draw first available parent tile
                                var _z = z, _x = x, _y = y, __f = 1, __x = 0, __y = 0, _dim;
                                while (_z > 0) {
                                    __x += (_x & 1) * __f;
                                    __y += (_y & 1) * __f;
                                    __f *= 2;
                                    img = cache[(--_z + "." + (_x >>= 1) + "." + (_y >>= 1))];
                                    if (img && img.complete && img.width && img.height && (_dim = v.dim / __f) && !(_z = 0)) {
                                        ctx.drawImage(img, __x * _dim, __y * _dim, _dim, _dim, -tdim / 2, -tdim / 2, tdim, tdim);
                                    }
                                }
                            }
                            ctx.rotate(-v.r);
                            ctx.translate(-x_, -y_);
                        }
                    }
                    // traverse quadtree
                    if (dir && z < min) {
                        z++;
                        x <<= 1;
                        y <<= 1;
                        th /= 2;
                        vdim /= 2;
                        tdim /= 2;
                        m0 = v.m[0] * vdim;
                        m1 = v.m[1] * vdim;
                    }
                    else if (x & 1 && y & 1) {
                        z--;
                        x >>= 1;
                        y >>= 1;
                        th *= 2;
                        vdim *= 2;
                        tdim *= 2;
                        m0 = v.m[0] * vdim;
                        m1 = v.m[1] * vdim;
                        dir = false;
                    }
                    else {
                        x & 1 && ++y && x-- || x++;
                        dir = true;
                    } // increment inside quad in Z-order
                } while (z);
            };
            TILE.prototype._onTile = function (ev) {
                if (this.$root && ev) {
                    var img = ev.target || event.srcElement;
                    var i = this.$root.reqQueue.indexOf(img);
                    if (i > -1) {
                        this.$root.reqQueue.splice(i, 1);
                    }
                    !img["preload"] && Vue.nextTick(this.$root.update);
                }
            };
            TILE.prototype._onUrl = function (url) {
                if (!url)
                    return;
                this._cache = {};
                if (typeof url === "function") {
                    this.url = url;
                }
                else if (typeof url === 'string' || url instanceof String) {
                    this.url = new Function("z", "x", "y", "return '" +
                        url.replace(/{([^}]+)}/g, function (exp, val) {
                            var sub;
                            if (val === "x" || val === "y" || val === "z")
                                return "'+" + val + "+'";
                            else if ((sub = val.split("|")).length > 1)
                                return "'+['" + sub.join("','") + "'][(x+y)%" + sub.length + "]+'";
                            else if (val === "bbox")
                                return "'+ (d=(20037508.3428 / Math.pow(2, z)*2)) * (x-=(z=(Math.pow(2, z)/2)))  + ',' + (y=z-y-1) * d + ',' + (x+1) * d + ',' + (y+1) * d +'";
                        })
                        + "'");
                }
            };
            /** sets tbox from the given bbox */
            TILE.prototype._onBBox = function (bbox) {
                if (!(this._tbox = bbox ? {} : null))
                    return;
                var bbox_ = [(bbox[0] + 180) / 360,
                    (1 - Math.log(Math.tan(bbox[1] * Math.D2R) + 1 / Math.cos(bbox[1] * Math.D2R)) / Math.PI) / 2,
                    (bbox[2] + 180) / 360,
                    (1 - Math.log(Math.tan(bbox[3] * Math.D2R) + 1 / Math.cos(bbox[3] * Math.D2R)) / Math.PI) / 2];
                for (var i = 0, z = 0; i <= 18; i++, z = (1 << i)) {
                    this._tbox[i] = [Math.floor(bbox_[0] * z), Math.floor(bbox_[1] * z), Math.floor(bbox_[2] * z), Math.floor(bbox_[3] * z)];
                }
            };
            TILE.rctx = VAYU.RCTX.TYPE.CANVAS;
            TILE.methods = {
                render: TILE.prototype.render,
                _onTile: TILE.prototype._onTile,
                _onUrl: TILE.prototype._onUrl,
                _onBBox: TILE.prototype._onBBox
            };
            TILE.events = {
                "hook:created": function () {
                    var self = this;
                    self.url || self.$add('url');
                    self.$watch('url', self._onUrl, { immediate: true });
                    self.bbox && self.$watch('bbox', self._bbox2tbox, { immediate: true });
                    //self.src && self.$watch('src', self._src2url, { immediate: true });
                },
                "hook:beforeDestroy": function () {
                    this.$parent.update();
                }
            };
            TILE = __decorate([
                DVue(VAYU.LAYR)
            ], TILE);
            return TILE;
        })(VAYU.LAYR);
        LAYR.TILE = TILE;
        VAYU.component("vayu-TILE", TILE);
    })(LAYR = VAYU.LAYR || (VAYU.LAYR = {}));
})(VAYU || (VAYU = {}));

