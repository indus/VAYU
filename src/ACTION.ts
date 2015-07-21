'use strict'

if (typeof CustomEvent !== "function") {
  (function () {
    function CustomEvent(event: string, params: any) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var ev = document.createEvent("CustomEvent");
      (<any>ev).initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return ev;
    }
    CustomEvent.prototype = Event.prototype;
    window["CustomEvent"] = CustomEvent;
  })();
}

interface IActionOptions {
  /** use mouse input (DEFAULT:true; -1:force) */
  onmouse?: boolean | number;
  /** use wheel input (DEFAULT:true; 1:force) */
  onwheel?: boolean | number;
  /** use touch input (DEFAULT:true; 1:force) */
  ontouch?: boolean | number;
  /** use pointer input (DEFAULT:true; 1:force) */
  onpoint?: boolean | number;
  /** fire inertia events (DEFAULT:true; 1:translation-only) */
  inertia?: boolean | number;
}

interface IActionEventDetails {
  /** delta movement in x direction [px] */
  x: number;
  /** delta movement in y direction [px] */
  y: number;
  /** detla rotation [°] */
  r: number;
  /** detla scale */
  s: number;
  /** pageX like in a MouseEvent */
  pageX: number;
  /** pageY like in a MouseEvent */
  pageY: number;
  /** clientX like in a MouseEvent */
  clientX: number;
  /** clientY like in a MouseEvent */
  clientY: number;
  /** is the first event (e.g. mousedown) */
  isFirst: boolean;
  /** is the first event (e.g. mouseup) */
  isLast: boolean;
  /** has multiple points (e.g. zoom gesture with two fingers) */
  isMulti: boolean;
  /** is part of the inertia effect */
  isInertia?: boolean;
  /** is the result of a mouse-wheel event */
  isWheel?: boolean;
  /** array of points */
  points: [any];
  /** timestamp of the event */
  timestamp: number;
}

class Action {
  
  /** are MouseEvents supported */
  private static SPRT_MOUSE: boolean = !(/mobile|ip(ad|hone|od)|android/i.test(navigator.userAgent));
  /** are TouchEvents supported */
  private static SPRT_TOUCH: boolean = ("ontouchstart" in window);
  /** are PointerEvents supported */
  private static SPRT_POINT: boolean = ("MSPointerEvent" in window);

  private static _defaults: IActionOptions = {
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

  private _inertia: boolean | number = true;
  private _cb: any;
  private _ev: any = {};
  private _cache: any = {};
  private _queue: any = [];

  /** @param callback if no callback is provided a CustomEvent with IActionEventDetails is dispatched on ```window``` instead */
  constructor(target: HTMLElement, callback?: (detail: IActionEventDetails) => any, options?: IActionOptions) {

    this._cb = callback || function (detail: IActionEventDetails) {
      target.dispatchEvent(new window["CustomEvent"]("action", { detail: detail }))
    };

    options = options || {};
    for (var key in Action._defaults) { options[key] = (key in options) ? options[key] : Action._defaults[key] }
    this._inertia = options.inertia;

    /* MOUSE */
    if ((options.onmouse && Action.SPRT_MOUSE) || (options.onmouse === 1)) {
      new Action.Input.Mouse(target, this._callback.bind(this));
    }

    /* WHEEL (direct implementation; no inertia) */
    if ((options.onwheel && Action.SPRT_MOUSE) || (options.onwheel === 1)) {
      Action.AInput.addListeners(target, "mousewheel DOMMouseScroll", (ev: MouseWheelEvent) => {
        var p;
        var $: any = {
          s: Math.pow(1.2, Math.max(-1, Math.min(1, (ev.wheelDelta || -ev.detail)))),
          isMulti: false
        };
        $.isFirst = $.isLast = $.isWheel = true;
        $.x = $.y = $.r = 0;
        $.pageX = ev.pageX;
        $.pageY = ev.pageY;
        $.clientX = ev.clientX;
        $.clientY = ev.clientY;
        this._cb($);
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

  private _callback(type: number, points: any) {
    var c = this._cache;

    // prepare event details
    var $: IActionEventDetails = {
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
    c.x = c.cX; c.y = c.cY; c.d = d; c.r = r;

    // fire event;
    this._cb($);

    /* INERTIA */
    if (this._inertia) {
      var q = this._queue, iFn: any = this._inertiaFn;

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

        // collect events
      } else {
        $.isFirst && (iFn.active = q.length = c.vx = c.vy = c.vs = c.vr = 0);
        (q.unshift($) > 6) && (q.length = 6);
      }
    }
  }

  private _inertiaFn(t: number, pnow: number) {
    var ev = this._ev, c = this._cache;

    // intermediate event
    if ((<any>this._inertiaFn).active &&
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

      requestAnimationFrame((p: number) => this._inertiaFn(p - pnow, p));

      // last event
    } else {
      (<any>this._inertiaFn).active = 0;
      ev.isLast = true;
      ev.x = ev.y = ev.r = 0;
      ev.s = 1;
    }

    // fire event
    this._cb(ev);
  }
}


module Action {

  // Definition of Event-Types
  export enum EVTYPE {
    START = 1,
    MOVE = 2,
    END = 4,
    CANCEL = 8  /* not in use */
  };

  export class AInput {
    protected static evMap: any;
    protected static evTGT: string;
    protected static evWIN: string;

    static addListeners(target: any, types: string, listener: (ev: Event) => any, useCapture?: boolean) {
      types.split(" ").forEach(function (type: string) {
        target.addEventListener(type, listener, useCapture);
      });
    }

    // TODO use 'removeListers' to clean up
    static removeListeners(target: any, types: string, listener: (ev: Event) => any, useCapture?: boolean) {
      types.split(" ").forEach(function (type: string) {
        target.removeEventLister(type, listener, useCapture);
      });
    }

    protected $ = [];
    protected _cb: any;
    protected listener: any;
    protected handler(ev: any) { }

    constructor(tgt: any, cb: any, static_: any) {
      this._cb = cb;
      this.listener = (ev: Event) => {
        this.handler(ev);
      };

      var win = tgt.ownerDocument.defaultView || tgt.ownerDocument.parentWindow;

      // start on target
      AInput.addListeners(tgt, static_.evTGT, this.listener, false);

      // move & end on global view
      AInput.addListeners(win, static_.evWIN, this.listener, false);
    }

    // copy params of ev to $
    protected setPoint(i: number, ev: any) {
      if (ev) {
        this.$.splice(i, 1, {
          pageX: ev.pageX,
          pageY: ev.pageY,
          clientX: ev.clientX,
          clientY: ev.clientY
        });
      } else {
        this.$.splice(i, 1);
      }
    }
  }

  export module Input {

    export class Mouse extends AInput {
      private static evMAP = {
        mousedown: EVTYPE.START,
        mousemove: EVTYPE.MOVE,
        mouseup: EVTYPE.END
      }
      protected static evTGT: string = "mousedown";
      protected static evWIN: string = "mousemove mouseup";

      constructor(el: any, cb: any) {
        super(el, cb, Mouse);
      }

      private _ev: any;  // ev on enter multi
      private _which: number; // captured mouse button for move
      private offset: number = 80; // initial pointer-offset

      public handler(ev: any, type?: any) {
        type = type || Mouse.evMAP[ev.type];
        var $ = this.$;

        if (!$.length && (type !== EVTYPE.START)) { return; }

        /* MOUSE MOVE */
        if (type & EVTYPE.MOVE) {
          if ($.length && $.length === ((ev.shiftKey) ? 2 : this._which)) {
            if ($.length === 1) { // single
              this.setPoint(0, ev);
            } else {  // multi
              var offset = this.offset,
                cntr = this._ev,
                deltaX = cntr.clientX - ev.clientX + offset,
                deltaY = cntr.clientY - ev.clientY - offset;

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

          } else if ($.length) {
            if (1 === ($.length = ((ev.shiftKey) ? 2 : this._which))) { // enter single
              this.setPoint(0, ev);
              this.setPoint(1, null);
              this._cb(EVTYPE.END, $);
            } else { // enter multi
              this._ev = ev;
              this.handler(ev, type + EVTYPE.START);
            }
          }

          /* MOUSE END */
        } else if (type === EVTYPE.END) {
          $.length = 0;
          this._cb(type, $);

          /* MOUSE START */
        } else if (type === EVTYPE.START) {
          this._which = ev.which;
          if (1 === ($.length = (this._which < 3) ? ev.shiftKey ? 2 : this._which : 0)) {
            this.setPoint(1, null);
          } else {
            this._ev = ev;
          }
          this.handler(ev, type + EVTYPE.MOVE);
        }
      }
    }

    export class Touch extends AInput {
      private static evMAP = {
        touchstart: EVTYPE.START,
        touchmove: EVTYPE.MOVE,
        touchend: EVTYPE.END,
        touchcancel: EVTYPE.CANCEL
      }
      protected static evTGT: string = "touchstart";
      protected static evWIN: string = "touchmove touchend touchcancel";

      constructor(el: any, cb: any) {
        super(el, cb, Touch);
      }

      public handler(ev: any, type?: any) {
        ev.preventDefault();
        type = type || Touch.evMAP[ev.type];
        var $ = this.$;

        if ($.length = Math.min(ev.touches.length, 2)) {
          this.setPoint(0, ev.touches[0]);
          this.setPoint(1, ev.touches[1]);
        }

        this._cb(type, $);
      }
    }

    export class Point extends AInput {
      private static evMAP = {
        pointerdown: EVTYPE.START,
        pointermove: EVTYPE.MOVE,
        pointerup: EVTYPE.END,
        pointercancel: EVTYPE.CANCEL,
        pointerout: EVTYPE.CANCEL,
        MSPointerDown: EVTYPE.START,
        MSPointerMove: EVTYPE.MOVE,
        MSPointerUp: EVTYPE.END,
        MSPointerCancel: EVTYPE.CANCEL
      }
      protected static evTGT: string = (window.navigator.msPointerEnabled) ? "MSPointerDown" : "pointerdown";
      protected static evWIN: string = (window.navigator.msPointerEnabled) ? "MSPointerMove MSPointerUp MSPointerCancel" : "pointermove pointerup pointercancel";

      constructor(el: any, cb: any) {
        super(el, cb, Point);
      }

      private _pid: any = []; // pointerIds

      public handler(ev: any, type?: any) {
        if (ev.pointerType === "mouse") { return; };
        ev.preventDefault();

        type = type || Point.evMAP[ev.type];
        var $ = this.$,
          pid = this._pid,
          id = pid.indexOf(ev.pointerId);

        /* POINTER MOVE */
        if (type & EVTYPE.MOVE) {
          if (id > -1) {
            this.setPoint(id, ev);
            this._cb((type & EVTYPE.START) ? EVTYPE.START : EVTYPE.MOVE, $);
          }

          /* POINTER END */
        } else if (type === EVTYPE.END) {
          if (id > -1) {
            this.setPoint(id, null);
            pid.splice(id, 1);
            this._cb(type, $);
          }

          /* POINTER START */
        } else if (type === EVTYPE.START) {
          if (pid.length < 2) {
            this.setPoint(1, (pid.push(ev.pointerId) === 1) ? null : ev);
            this.handler(ev, type + EVTYPE.MOVE);
          }
        }
      }
    }
  }
}