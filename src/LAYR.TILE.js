var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
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
                var vdim = v.dim, tdim = vdim * v.s, m0 = v.m[0] * vdim, m1 = v.m[1] * vdim, m2 = v.m[2], m3 = v.m[3], th = v.th, url = this.url, cache = this._cache, reqQueue = this.$root.reqQueue, dir = true, z = Math.round(v.z + this.zoff), min = Math.max(0, Math.min(19, z)), bbox = this._tbox ? this._tbox[z] : null, z = 0, x = 0, y = 0;
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
                                if ((reqQueue.length < (reqQueue.max / 2))) {
                                    // parent
                                    if (!cache[cid = (z - 1 + "." + (x >> 1) + "." + (y >> 1))] && (src = url(z - 1, x >> 1, y >> 1))) {
                                        img = new Image();
                                        img.src = src;
                                        img["preload"] = true;
                                        img.onload = img.onerror = this._onTile;
                                        reqQueue.push(cache[cid] = img);
                                    }
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
                    self.bbox && self.$watch('bbox', self._onBBox, { immediate: true });
                    //self.src && self.$watch('src', self._src2url, { immediate: true });
                },
                "hook:beforeDestroy": function () {
                    this.$parent.update();
                }
            };
            return TILE;
        })(VAYU.LAYR);
        LAYR.TILE = TILE;
        VAYU.component("vayu-TILE", TSC2COMP(TILE, LAYR));
    })(LAYR = VAYU.LAYR || (VAYU.LAYR = {}));
})(VAYU || (VAYU = {}));
