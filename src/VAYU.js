/// <reference path="../org/vue.d.ts" />
/// <reference path="action.ts" />
/// <reference path="rctx.ts" />
/// <reference path="layr.ts" />
/// <reference path="layr.tile.ts" />
/// <reference path="layr.geojson.ts" />
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
function TSC2COMP(tsc, nsp, opt) {
    var ppc = Object.getPrototypeOf(tsc.prototype).constructor;
    var opt = Object
        .keys(tsc)
        .reduceRight(function (opt, key) {
        ppc.hasOwnProperty(key) || (opt[key] = tsc[key]);
        return opt;
    }, opt || { name: tsc.name });
    var vc = ppc.extend(opt);
    nsp && (nsp[opt.name] = vc);
    return vc;
}
function DVue(sup, opt) { return TSC2COMP; }
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
    //static temp = (id: string): HTMLElement => (document["currentScript"] || document.body).ownerDocument.getElementById("vayu_" + id);
    VAYU.template = '<div class="vayu"v-class="action:class_action,inertia:class_inertia"><svg style="display:none"><defs><circle id="point"r="5"/></defs></svg><div v-repeat="layers|rctx"v-component="{{\'vayu-rctx-\'+_rctx}}"track-by="_uid"></div><content/></div>'; //VAYU.temp("VAYU");
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
                if (_uid === undefined) {
                    Object.defineProperty(layers[i], '_uid', { value: _uid = ++this.$root._uid });
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
        self.$watch("layers", this.$root.update, { deep: true });
        // init action handler (Action unifies various user inputs for map transform)
        self.action = new Action(self.$el, function (d) {
            // apply action event to map transform;
            self.view.transform(d.x, d.y, d.s, d.r, d.clientX, d.clientY);
            if (d.isFirst || d.isLast) {
                _this.class_action = d.isFirst && !d.isWheel;
                _this.class_inertia = d.isFirst && d.isInertia;
            }
        });
        /*self.action.idle = -1;
        setTimeout(function () {
    
          self.action.idle = false;
    
        }, 1500)*/
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
        verbose: true || { ready: true },
    };
    VAYU.log = function () {
        var msg = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            msg[_i - 0] = arguments[_i];
        }
        VAYU.config.debug && console.log.apply(console, msg);
    };
    VAYU.unveil = function (comp, hook, desc) {
        ((VAYU.config.verbose === true) ||
            (VAYU.config.verbose && VAYU.config.verbose[hook]))
            && console.log("[" + ((desc || '') + comp.constructor.name) + (comp.id ? (" '" + comp.id + "' ") : " ") + hook + "]", comp);
    };
    var View = (function () {
        function View(crs, dim) {
            if (crs === void 0) { crs = new CRS.EPSG3857; }
            if (dim === void 0) { dim = 256; }
            this.m = new Array(1, 0, 0, 0, 1); //: Float64Array = new Float64Array([1, 0, 0, 0, 1]); // transform matrix (a = d = m[0], c = -(b = [1]), e = [2], f = [3], d=[4])
            this.ṁ = new Array(4); //: Float64Array = new Float64Array(4); // inverse transform matrix
            this.m_ = new Array(5); //: Float64Array = new Float64Array(5); // temp
            this.ṁ_ = new Array(4); //: Float64Array = new Float64Array(4); // temp
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
                v.th = (Math.abs(Math.cos(v.r)) + Math.abs(Math.sin(v.r))) * (v.dim * v.s) / 2;
            }
            v.update && (v.update = Vue.nextTick(this.apply, this));
        };
        View.prototype.apply = function () {
            var v = this, m = v.m, ṁ = v.ṁ; //, ṃ = v.ṃ;
            //Vue.config.async = false;
            v.update = true;
            v.tranMX = "matrix(" + m[0] + "," + m[1] + "," + -m[1] + "," + m[0] + "," + m[2] + "," + m[3] + ")";
            //v.tranMX_ = "matrix(" + ṃ[0] + "," + ṃ[1] + "," + -ṃ[1] + "," + ṃ[0] + "," + ṃ[2] + "," + ṃ[3] + ")";
            v.tranUX = "matrix(" + ṁ[0] + "," + ṁ[1] + "," + -ṁ[1] + "," + ṁ[0] + ",0,0)";
            v.tranUS = "scale(" + 1 / v.s + ")";
            v.tranUR = "rotate(" + -v.r / Math.D2R + ")";
            //Vue.config.async = true;
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
