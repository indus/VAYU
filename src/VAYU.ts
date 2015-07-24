/// <reference path="../org/vue.d.ts" />
/// <reference path="action.ts" />
/// <reference path="rctx.ts" />
/// <reference path="layr.ts" />
/// <reference path="layr.tile.ts" />
/// <reference path="layr.geojson.ts" />

/** 
 * VAYU v0.3.0
 * (c) 2015 Stefan Keim (aka indus)
 * powered by DLR-DFD 
 */

/**
 * extension of JavaScripts ```Math``` with additional constants
 */
interface Math {
  /** radians to degrees: 57.29577951308232 ```180 / Math.PI``` */
  R2D: number;
  /** degrees to radians: 0.017453292519943295 ```Math.PI / 180``` */
  D2R: number;
  /**  two times Pi: 6.283185307179586 ```Math.PI * 2``` */
  PIx2: number;
  /** half Pi: 1.5707963267948966 ```Math.PI / 2``` */
  PI_2: number;
}
Math.R2D = 180 / Math.PI;
Math.D2R = Math.PI / 180;
Math.PIx2 = Math.PI * 2;
Math.PI_2 = Math.PI / 2;



//Monkey patch IE for support for Function.name
if (Function.prototype["name"] === undefined && Object.defineProperty !== undefined) {
  Object.defineProperty(Function.prototype, 'name', {
    get: function () {
      var funcNameRegex = /function\s([^(]{1,})\(/;
      var results = (funcNameRegex).exec((this).toString());
      return (results && results.length > 1) ? results[1].trim() : "";
    },
    set: function (value) { }
  });
}


/* ES6 VueComponent decorator */
function TSC2COMP(tsc, nsp?, opt?) {
  var ppc = Object.getPrototypeOf(tsc.prototype).constructor;
  var opt = Object
    .keys(tsc)
    .reduceRight(function (opt, key) {
      ppc.hasOwnProperty(key) || (opt[key] = tsc[key]);
      return opt;
    }, opt || { name: tsc.name })
  var vc = ppc.extend(opt);
  nsp && (nsp[opt.name] = vc);
  return vc;
}

function DVue(sup?: any, opt?: any): any { return TSC2COMP };

/**
 * **VAYU** [0.3.0] - the main class
 * */
@DVue()
class VAYU extends Vue {
  //static temp = (id: string): HTMLElement => (document["currentScript"] || document.body).ownerDocument.getElementById("vayu_" + id);
  static template = '<div class="vayu"v-class="action:class_action,inertia:class_inertia"><svg style="display:none"><defs><circle id="point"r="5"/></defs></svg><div v-repeat="layers|rctx"v-component="{{\'vayu-rctx-\'+_rctx}}"track-by="_uid"></div><content/></div>'; //VAYU.temp("VAYU");
  static replace: boolean = true;

  public _uid: number;
  public action: Action;

  /** array of pending images with an additional property ```max``` to limit the number of concurrent requests */
  public reqQueue: (any[]| any);
  /** defines the visible section of the map */
  public view: VAYU.View;
  /** array of all kind of layers, the index of an item defines its z-index in the stack */
  public layers: VAYU.LAYR[];

  /** getter/setter center (lat,lng)  */
  public center: [number, number];
  /** getter/setter zoom */
  public zoom: number;
  /** getter/setter center */
  public rotation: number;

  private static data = function () {
    return {
      class_action: false,
      class_inertia: false,
      view: new VAYU.View,
      layers: []
    };
  }

  /** stops event propagation */
  public stopEvent(ev) { ev.stopPropagation(); return ev }

  /** updates the view */
  public update() { this.view.update = !(this.view.update = false); }

  /** recenters the view */
  public _onResize(evt?: Event) {
    var v = this.view, cr: ClientRect = this.$el.getBoundingClientRect();
    v.cx = (v.w = cr.width) / 2;
    v.cy = (v.h = cr.height) / 2;

    if (isNaN(v.cntrC[0] + v.cntrC[1])) { return; }
    v.cntrL = v.g2l([v.cx, v.cy]);
    this.center = v.cntrC;
  }

  private static methods = {
    stopEvent: VAYU.prototype.stopEvent,
    update: VAYU.prototype.update,
    _onResize: VAYU.prototype._onResize
  }

  private static filters = {
    /** render context filter */
    rctx: function (layers: [any]) {
      if (!layers.length) return [];
      var layers_ = [], comps = window["VAYU"].options.components, layergroup;
      for (var i = 0, rctx; i < layers.length; i++) {
        rctx = layers[i].rctx || VAYU.RCTX.TYPE[comps['vayu-' + layers[i].type].options.rctx];
        if (!rctx) return;

        var _uid = layers[i]._uid;
        if (_uid === undefined) {
          Object.defineProperty(layers[i], '_uid',
            { value: _uid = ++this.$root._uid });
        }
        if (layergroup && layergroup._rctx == rctx) {
          layergroup.layers.push(layers[i]);
          layergroup._uid += "_" + _uid;
        } else {
          layers_.push(layergroup = { layers: [layers[i]], _rctx: rctx, _uid: _uid })
        }
      }
      return layers_;
    }
  }

  // getters and setter of transformation

  private static computed = {
    center: { // center as web-mercator
      get: function () { return this.view.cntrC; },
      set: function (val: [number, number]) {
        var v = this.view;
        val = v.c2l(val, v.dim);
        v.transform(v.projX(v.cntrL, v.m) - v.projX(val, v.m), v.projY(v.cntrL, v.m) - v.projY(val, v.m));
      }
    },
    zoom: { // zoomlevel as float
      get: function () { return this.view.z; },
      set: function (val: number) {
        var v = this.view;
        v.transform(0, 0, Math.pow(2, val - v.z));
      }
    },
    rotation: { // rotation in degrees
      get: function () { return this.view.r * Math.R2D; },
      set: function (val: number) {
        var v = this.view;
        v.transform(0, 0, 1, val * Math.D2R - v.r);
      }
    }
  }

  
  // LIFECYCLE

  protected static created = function () {
    VAYU.unveil(this, "created");
    var self: VAYU = this;
    self._uid = 0;
  }

  protected static ready = function () {
    VAYU.unveil(this, "ready");
    var self: VAYU = this, v: any = self.view;

    // build layers lazy
    this.layers = this.$options.layers;

    // init request queue
    (<any>(self.reqQueue = [])).max = 9;

    // init resize handler
    Vue.util.on(window, "resize", self._onResize);
    self._onResize();


    self.$watch("layers", this.$root.update, { deep: true })

    // init action handler (Action unifies various user inputs for map transform)
    self.action = new Action(self.$el, (d: IActionEventDetails) => {
      // apply action event to map transform;
      self.view.transform(d.x, d.y, d.s, d.r, d.clientX, d.clientY);

      if (d.isFirst || d.isLast) {
        this.class_action = d.isFirst && !d.isWheel;
        this.class_inertia = d.isFirst && d.isInertia;
      }

    });

    /*self.action.idle = -1;
    setTimeout(function () {

      self.action.idle = false;

    }, 1500)*/

    // init the map transform
    var o = self.$options,
      center = v.c2l(o.center || [0, 0]),
      scale = Math.pow(2, o.zoom || 0),
      rotation = (o.rotation || 0) * Math.D2R;

    // apply the initial map transform
    v.transform(v.cx - v.projX(center, v.m), v.cy - v.projY(center, v.m), scale, rotation);
  }
}

module VAYU {

  export const version: string = "0.3.0";
  console.log("%c VAYU [" + version + "] ", "color:#42b983;background-color:#333;font-weight:bold;font-size:20px;");

  export var config = {
    debug: true,
    verbose: true || { ready: true },
  };

  export var log = function (...msg) {
    VAYU.config.debug && console.log.apply(console, msg);
  }

  export var unveil = function (comp, hook?, desc?) {
    ((VAYU.config.verbose === true) ||
      (VAYU.config.verbose && VAYU.config.verbose[hook]))
    && console.log("[" + ((desc || '') + comp.constructor.name) + (comp.id ? (" '" + comp.id + "' ") : " ") + hook + "]", comp);
  }

  export class View {
    m = new Array(1, 0, 0, 0, 1);//: Float64Array = new Float64Array([1, 0, 0, 0, 1]); // transform matrix (a = d = m[0], c = -(b = [1]), e = [2], f = [3], d=[4])
    ṁ = new Array(4);//: Float64Array = new Float64Array(4); // inverse transform matrix
    m_ = new Array(5);//: Float64Array = new Float64Array(5); // temp
    ṁ_ = new Array(4);//: Float64Array = new Float64Array(4); // temp
    //ṃ: Float64Array = new Float64Array([1, 0, 0, 0]); // delta transform matrix
    //ṃ_: Float64Array = new Float64Array(4); // temp
    s: number = 1; // scale as float
    z: number = 0; // zoomlevel as float
    r: number = 0; // rotation in radians
    w: number = 0; // screen width
    h: number = 0; // screen height
    cx: number = 0; // screen center x
    cy: number = 0; // screen center y
    cntrL: [number, number] = [NaN, NaN]; // local center; l = local (1024 square with center[0, 0])
    cntrG: [number, number] = [NaN, NaN]; // global center; g = global(screen)
    cntrC: [number, number] = [NaN, NaN]; // coordinate center; c = coordinate(web - mercator[longitude, latitude])
    tranMX: string = null; // transform-string 'matrix'/'transform' 
    //tranMX_: string = null; // transform-string delta 'matrix'/'transform' 
    tranUX: string = null; // transform-string 'inverse matrix'/'untransform' 
    tranUS: string = null; // transform-string 'unscale'
    tranUR: string = null; // transform-string 'unrotate'
    restrictZ: [number, number] = [0, 18]; // restrict z-level
    restrictCntr: any = true;  // restrict center (true = keep map on screen, "strict"= keep screen-center on map )
    dim: number;
    dimc: number;
    th: number;
    crs: CRS.ACRS;
    update: boolean = true;

    constructor(crs: CRS.ACRS = new CRS.EPSG3857, dim: number = 256) {
      this.crs = crs;
      this.dim = dim;
      this.dimc = dim / 2;
    }

    public transform(x: number, y: number, scale?: number, rotation?: number, pivotX?: number, pivotY?: number, trial?: boolean) {

      var v = this,
        m = v.m,
        ṁ = v.ṁ,
        m_ = v.m_,
        ṁ_ = v.ṁ_,
        //ṃ = v.ṃ,
        //ṃ_ = v.ṃ_,
        complex = scale && (scale !== 1 || rotation),
        cntrL, cntrG;
      //ṃ = v.ṃ // temporary matrix; not in use

      m_[0] = m[0], m_[1] = m[1], m_[2] = m[2], m_[3] = m[3];
      //ṃ_[0] = ṃ[0], ṃ_[1] = ṃ[1], ṃ_[2] = ṃ[2], ṃ_[3] = ṃ[3];

      if (complex) {
        // use defaults for optional params
        pivotX = pivotX || v.cx;
        pivotY = pivotY || v.cy;
        rotation = rotation || 0;

        // declare vars and calc transform
        var d, s, z, r, px = x - pivotX, py = y - pivotY,
          cos = Math.cos(rotation) * scale,
          sin = Math.sin(rotation) * scale;

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

      } else {
        // apply translation
        m_[2] += x;
        m_[3] += y;

        //ṃ_[2] += x;
        //ṃ_[3] += y;
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
      m[0] = m_[0]; m[1] = m_[1]; m[2] = m_[2]; m[3] = m_[3]; m[4] = m_[4];
      ṁ[0] = ṁ_[0]; ṁ[1] = ṁ_[1]; ṁ[2] = ṁ_[2]; ṁ[3] = ṁ_[3];
      //ṃ[0] = ṃ_[0]; ṃ[1] = ṃ_[1]; ṃ[2] = ṃ_[2]; ṃ[3] = ṃ_[3];


      // set centers
      v.cntrL = cntrL;
      v.cntrG = cntrG;
      v.cntrC = v.l2c(cntrL);

      if (complex) {
        v.s = s;
        v.z = z;
        v.r = r;
        v.th = (Math.abs(Math.cos(v.r)) + Math.abs(Math.sin(v.r))) * (v.dim * v.s) / 2;
      }

      v.update && (v.update = Vue.nextTick(this.apply, this));
    }

    public apply() {
      var v = this, m = v.m, ṁ = v.ṁ; //, ṃ = v.ṃ;

      //Vue.config.async = false;
      v.update = true;
      v.tranMX = "matrix(" + m[0] + "," + m[1] + "," + -m[1] + "," + m[0] + "," + m[2] + "," + m[3] + ")";
      //v.tranMX_ = "matrix(" + ṃ[0] + "," + ṃ[1] + "," + -ṃ[1] + "," + ṃ[0] + "," + ṃ[2] + "," + ṃ[3] + ")";
      v.tranUX = "matrix(" + ṁ[0] + "," + ṁ[1] + "," + -ṁ[1] + "," + ṁ[0] + ",0,0)";
      v.tranUS = "scale(" + 1 / v.s + ")";
      v.tranUR = "rotate(" + -v.r / Math.D2R + ")";
      //Vue.config.async = true;
    }

    // check if point is in rect (with threshold)
    public contains(pnt: number[], w: number, h: number, thld?: number) {
      var x_, y_; thld = thld || 0;
      return (pnt[0] > - thld) && (pnt[0] < (w + thld))
        && (pnt[1] > - thld) && (pnt[1] < (h + thld));
    }

    /* PROJECTIONS */

    // project a point 
    public proj(p: [number, number], m: (Float64Array|number[])): [number, number] { return [this.projX(p, m), this.projY(p, m)]; }
    public projX(p: [number, number], m: (Float64Array|number[])): number { return m[0] * p[0] - m[1] * p[1] + m[2]; }
    public projY(p: [number, number], m: (Float64Array|number[])): number { return m[1] * p[0] + m[0] * p[1] + m[3]; }

    public l2g(p: [number, number]): [number, number] { return this.proj(p, this.m); }

    public g2l(p: [number, number]): [number, number] { return this.proj(p, this.ṁ); }

    public c2l(coo: [number, number]): [number, number] {
      return this.crs.transform(this.crs.project(coo), this.dim);
    }

    public l2c(pnt: [number, number]): [number, number] {
      return this.crs.unproject(this.crs.untransform(pnt, this.dim));
    }

    public c2g(coo: [number, number]): [number, number] {
      return this.l2g(this.c2l(coo));
    }

    public g2c(pnt: [number, number]): [number, number] {
      return this.l2c(this.g2l(pnt));
    }
  }

  export module CRS {
    export class ACRS {
      public code: string;
      protected _a: number;
      protected _b: number;
      protected _c: number;
      protected _d: number;
      protected _bounds: number[];

      public transform(pnt: [number, number], scale?: number): [number, number] {
        scale = scale || 1;
        return [scale * (this._a * pnt[0] + this._b), scale * (this._c * pnt[1] + this._d)];
      }
      public untransform(pnt: [number, number], scale?: number): [number, number] {
        scale = scale || 1;
        return [(pnt[0] / scale - this._b) / this._a, (pnt[1] / scale - this._d) / this._c];
      }

      public project(coo: [number, number]): [number, number] { return [this.lng2x(coo[0]), this.lat2y(coo[1])]; }
      public unproject(pnt: [number, number]): [number, number] { return [this.x2lng(pnt[0]), this.y2lat(pnt[1])]; }
      public lng2x(lng: number): number { return lng; }
      public lat2y(lat: number): number { return lat; }
      public x2lng(x: number): number { return x; }
      public y2lat(y: number): number { return y; }
    }

    export class EPSG4326 extends ACRS {
      public code: string = 'EPSG:4326';
      protected _a: number = 1 / 180;
      protected _b: number = 1;
      protected _c: number = -1 / 180
      protected _d: number = .5;

      protected _bounds = [-180, -90, 180, 90];
    }

    export class EPSG3395 extends ACRS {
      public code: string = 'EPSG:3395';
      protected _a: number = 2.49532023e-8;
      protected _b: number = .5;
      protected _c: number = -2.49532023e-8;
      protected _d: number = .5;

      protected __R = 6378137;
      protected __e = ((tmp) => Math.sqrt(1 - tmp * tmp))(6356752.314245179 / this.__R);

      lng2x(lng: number) {
        return this.__R * lng * Math.D2R;
      }
      lat2y(lat: number): number {
        var y = lat * Math.D2R, con = this.__e * Math.sin(y);
        return -this.__R * Math.log(Math.max(Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), this.__e / 2), 1E-10));
      }
      x2lng(x: number): number {
        return x * Math.R2D / this.__R;
      }
      y2lat(y: number): number {
        var ts = Math.exp(-y / this.__R), phi = Math.PI_2 - 2 * Math.atan(ts);
        for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
          con = this.__e * Math.sin(phi);
          con = Math.pow((1 - con) / (1 + con), this.__e / 2);
          dphi = Math.PI_2 - 2 * Math.atan(ts * con) - phi;
          phi += dphi;
        }
        return phi * Math.R2D;
      }
    }

    export class EPSG3857 extends ACRS {
      public code: string = 'EPSG:3857';
      protected _a: number = 2.49532023e-8;
      protected _b: number = .5;
      protected _c: number = -2.49532023e-8;
      protected _d: number = .5;

      protected __R = 6378137;
      lng2x(lng: number): number {
        return this.__R * lng * Math.D2R;
      }
      lat2y(lat: number): number {
        var sin = Math.min(Math.max(Math.sin(lat * Math.D2R), 1E-15 - 1), 1 - 1E-15);
        return this.__R * Math.log((1 + sin) / (1 - sin)) / 2;
      }
      x2lng(x: number): number {
        return x * Math.R2D / this.__R;
      }
      y2lat(y: number): number {
        return (2 * Math.atan(Math.exp(y / this.__R)) - Math.PI_2) * Math.R2D;
      }
    }
  }
};

