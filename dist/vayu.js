///#source 1 1 /src/ACTION.js
/**
 * ACTION v0.1.0
 * (c) 2015 Stefan Keim (aka indus)
 * powered by DLR-DFD
 */
'use strict';
var __extends = this.__extends || function (d, b) {
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
            Action.AInput.addListeners(target, "mousewheel DOMMouseScroll", function (ev) {
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
                if (q.length < 3 || (iFn.active && (now - iFn.active) < 20) || (points.length && (this._inertia < 0))) {
                    iFn.active = now;
                    return;
                }
                // calc velocities
                var t = Date.now();
                for (var i = q.length - 1, dT; i > 1; i--) {
                    dT = Math.max(t - q[i].timestamp, 1);
                    c.vx = (c.vx + q[i].x / dT) / 2;
                    c.vy = (c.vy + q[i].y / dT) / 2;
                    if (points.length) {
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
        var ev = this._ev, c = this._cache;
        // intermediate event
        if (this._inertiaFn.active &&
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
            this._inertiaFn.active = 0;
            ev.isLast = true;
            ev.x = ev.y = ev.r = 0;
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
    var AInput = (function () {
        function AInput(tgt, cb, static_) {
            var _this = this;
            this.$ = [];
            this._cb = cb;
            this.listener = function (ev) {
                _this.handler(ev);
            };
            var win = tgt.ownerDocument.defaultView || tgt.ownerDocument.parentWindow;
            // start on target
            AInput.addListeners(tgt, static_.evTGT, this.listener, false);
            // move & end on global view
            AInput.addListeners(win, static_.evWIN, this.listener, false);
        }
        AInput.addListeners = function (target, types, listener, useCapture) {
            types.split(" ").forEach(function (type) {
                target.addEventListener(type, listener, useCapture);
            });
        };
        // TODO use 'removeListers' to clean up
        AInput.removeListeners = function (target, types, listener, useCapture) {
            types.split(" ").forEach(function (type) {
                target.removeEventLister(type, listener, useCapture);
            });
        };
        AInput.prototype.handler = function (ev) { };
        // copy params of ev to $
        AInput.prototype.setPoint = function (i, ev) {
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
        return AInput;
    })();
    Action.AInput = AInput;
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
        })(AInput);
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
        })(AInput);
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
        })(AInput);
        Input.Point = Point;
    })(Input = Action.Input || (Action.Input = {}));
})(Action || (Action = {}));
//# sourceMappingURL=ACTION.js.map
///#source 1 1 /src/VAYU.js
/**
 * VAYU v0.3.0
 * (c) 2015 Stefan Keim (aka indus)
 * powered by DLR-DFD
 */
/// <reference path="../org/vue.d.ts" />
/// <reference path="action.ts" />
'use strict';
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var VAYU = (function (_super) {
    __extends(VAYU, _super);
    function VAYU() {
        _super.apply(this, arguments);
    }
    return VAYU;
})(Vue);
var VAYU;
(function (VAYU) {
    VAYU.version = "0.3.0";
    console.log("%c VAYU [" + VAYU.version + "] ", "color:#42b983;background-color:#333;font-weight:bold;font-size:20px;");
})(VAYU || (VAYU = {}));
Math.R2D = 180 / Math.PI;
Math.D2R = Math.PI / 180;
Math.PIx2 = Math.PI * 2;
Math.PI_2 = Math.PI / 2;
//# sourceMappingURL=VAYU.js.map
