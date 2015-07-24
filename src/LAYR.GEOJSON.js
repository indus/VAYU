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
        var GEOJSON;
        (function (GEOJSON) {
            "use strict";
            var Feature = (function (_super) {
                __extends(Feature, _super);
                function Feature() {
                    _super.apply(this, arguments);
                }
                Feature.prototype.render = function (ctx, view) {
                    var coo = this.coordinates || this.geometry.coordinates, type = (this.geometry) ? this.geometry.type : this.type;
                    ctx.beginPath();
                    switch (type) {
                        case "Point":
                        case "MultiPoint":
                            /*
                            if (!this.img) {
                              var self: Point = <any>this;
                              //console.log(self.symbol || (<any>self).$parent.symbol || '#point');
                              //document.getElement();
                              this.img = new Image();
                              this.img.src = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" height="10" width="10" style="overflow: visible"><circle cx="0" cy="0" r="4" fill="red"/></svg>';
                            } else {
                              //return;
                              if (!this.img.complete) {
                                return;
                              } else if (type == "MultiPoint") {
                                for (var co of coo) {
                                  co = this.$root.view.c2g(co);
                                  ctx.drawImage(this.img, co[0], co[1]);
                                }
                              } else if (type == "Point") {
                                  co = this.$root.view.c2g(coo);
                                  ctx.drawImage(this.img, co[0], co[1]);
                              }
                            }*/
                            break;
                        case "LineString":
                            this.coo2LineCTX(coo, ctx);
                            break;
                        case "MultiLineString":
                            for (var _i = 0; _i < coo.length; _i++) {
                                var co = coo[_i];
                                this.coo2LineCTX(co, ctx);
                            }
                            break;
                        case "Polygon":
                            this.coo2PolyCTX(coo, ctx);
                            break;
                        case "MultiPolygon":
                            for (var _a = 0; _a < coo.length; _a++) {
                                var co = coo[_a];
                                this.coo2PolyCTX(co, ctx);
                            }
                            break;
                    }
                    this.style && this.style.fill && ctx.fill();
                    ctx.stroke();
                };
                Feature.prototype.coo2LineCTX = function (coo, ctx) {
                    ctx.moveTo.apply(ctx, this.$root.view.c2g(coo[0]));
                    for (var _i = 0; _i < coo.length; _i++) {
                        var co = coo[_i];
                        ctx.lineTo.apply(ctx, this.$root.view.c2g(co));
                    }
                };
                Feature.prototype.coo2PolyCTX = function (coo, ctx) {
                    for (var _i = 0; _i < coo.length; _i++) {
                        var co = coo[_i];
                        this.coo2LineCTX(co, ctx);
                    }
                };
                Feature.replace = true;
                Feature.rctx = VAYU.RCTX.TYPE.SVG;
                Feature.events = {
                    "hook:beforeDestroy": function () {
                        Vue.nextTick(this.$root.update, this.$root);
                    }
                };
                Feature.methods = {
                    render: Feature.prototype.render,
                    coo2LineCTX: Feature.prototype.coo2LineCTX,
                    coo2PolyCTX: Feature.prototype.coo2PolyCTX
                };
                return Feature;
            })(LAYR);
            GEOJSON.Feature = Feature;
            VAYU.component("vayu-Feature", TSC2COMP(Feature, GEOJSON));
            var FeatureCollection = (function (_super) {
                __extends(FeatureCollection, _super);
                function FeatureCollection() {
                    _super.apply(this, arguments);
                }
                FeatureCollection.template = '<g v-class= "class,type" v-style="style" v-attr="id:id" v-show="!hide"><g v-repeat="features" v-component="{{component||(\'vayu-\'+geometry.type)}}"/></g>'; //VAYU.temp("FeatureCollection");
                return FeatureCollection;
            })(GEOJSON.Feature);
            GEOJSON.FeatureCollection = FeatureCollection;
            VAYU.component("vayu-FeatureCollection", TSC2COMP(FeatureCollection, GEOJSON));
            var Point = (function (_super) {
                __extends(Point, _super);
                function Point() {
                    _super.apply(this, arguments);
                }
                Point.prototype.get_x = function () { this.$root.view.update; return this.$root.view.c2g(this.coordinates || this.geometry.coordinates)[0]; };
                Point.prototype.get_y = function () { this.$root.view.update; return this.$root.view.c2g(this.coordinates || this.geometry.coordinates)[1]; };
                Point.prototype.get_transform = function () {
                    if (!this.$root.view.update)
                        return;
                    return "translate(" + this.$root.view.c2g(this.$value || this.coordinates || this.geometry.coordinates) + ")";
                };
                Point.template = '<use v-attr="\'xlink:href\':symbol||$parent.symbol||\'#point\',transform:transform" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"/></use>'; //VAYU.temp("Point");
                Point.computed = {
                    x: Point.prototype.get_x,
                    y: Point.prototype.get_y,
                    transform: Point.prototype.get_transform
                };
                return Point;
            })(GEOJSON.Feature);
            GEOJSON.Point = Point;
            VAYU.component("vayu-Point", TSC2COMP(Point, GEOJSON));
            var MultiPoint = (function (_super) {
                __extends(MultiPoint, _super);
                function MultiPoint() {
                    _super.apply(this, arguments);
                }
                MultiPoint.template = '<g v-attr="id:id" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"><g v-repeat="geometry.coordinates" v-component="vayu-MultiPointPart"/></g>'; //VAYU.temp("MultiPoint");
                return MultiPoint;
            })(Feature);
            GEOJSON.MultiPoint = MultiPoint;
            VAYU.component("vayu-MultiPoint", TSC2COMP(MultiPoint, GEOJSON));
            VAYU.component("vayu-MultiPointPart", TSC2COMP(Point, null, { name: "MultiPointPart", template: '<use v-attr="\'xlink:href\':$parent.symbol||\'#point\',transform:transform"/>' }));
            var Path = (function (_super) {
                __extends(Path, _super);
                function Path() {
                    _super.apply(this, arguments);
                }
                Path.prototype.coo2LineD = function (coo) {
                    var d = "M" + this.$root.view.c2g(coo[0]);
                    for (var _i = 0; _i < coo.length; _i++) {
                        var co = coo[_i];
                        d += "L" + this.$root.view.c2g(co);
                    }
                    return d;
                    //return "M" + coo.map(this.$root.view.c2g, this.$root.view).join('L');
                };
                Path.prototype.coo2PolyD = function (coo) {
                    var d = "";
                    for (var _i = 0; _i < coo.length; _i++) {
                        var co = coo[_i];
                        d += this.coo2LineD(co) + "Z";
                    }
                    return d;
                    //return coo.map(this.coo2LineD, this).join('Z');
                };
                Path.prototype.d = function () {
                    console.log("d");
                    if (!this.$root.view.update)
                        return;
                    var coo = this.coordinates || this.geometry.coordinates, type = (this.geometry) ? this.geometry.type : this.type, d = "";
                    switch ((this.geometry) ? this.geometry.type : this.type) {
                        case "LineString":
                            d = this.coo2LineD(coo);
                            break;
                        case "Polygon":
                            d = this.coo2PolyD(coo);
                            break;
                        case "MultiLineString":
                            for (var _i = 0; _i < coo.length; _i++) {
                                var co = coo[_i];
                                d += this.coo2LineD(co);
                            }
                            break;
                        case "MultiPolygon":
                            for (var _a = 0; _a < coo.length; _a++) {
                                var co = coo[_a];
                                d += this.coo2PolyD(co);
                            }
                            break;
                    }
                    return d || "M0,0";
                };
                Path.template = '<path v-attr="id:id,d:d" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"/>'; //VAYU.temp("Path")point
                Path.events = {
                    "hook:ready": function () {
                        switch ((this.geometry) ? this.geometry.type : this.type) {
                            case "MultiLineString":
                            case "MultiPolygon":
                                var coo = this.coordinates || this.geometry.coordinates;
                                for (var i = 0, l = coo.length; i < l; i++) {
                                    // TODO adjust clockwise maybe not working propably
                                    for (var j = 0, m = coo[i].length, s = 0, k; j < m, k = (j + 1) % m; j++)
                                        s += (coo[i][j][0] - coo[i][k][0]) * (coo[i][j][1] - coo[i][k][1]);
                                    if (!!(i % 2) !== (s > 0)) {
                                        coo[i] = coo[i].reverse();
                                    }
                                    ;
                                }
                                break;
                        }
                    }
                };
                Path.computed = {
                    d: Path.prototype.d
                };
                Path.methods = {
                    coo2LineD: Path.prototype.coo2LineD,
                    coo2PolyD: Path.prototype.coo2PolyD
                };
                return Path;
            })(GEOJSON.Feature);
            GEOJSON.Path = Path;
            VAYU.component("vayu-LineString", TSC2COMP(Path, GEOJSON, { name: "LineString" }));
            VAYU.component("vayu-MultiLineString", TSC2COMP(Path, GEOJSON, { name: "MultiLineString" }));
            VAYU.component("vayu-Polygon", TSC2COMP(Path, GEOJSON, { name: "Polygon" }));
            VAYU.component("vayu-MultiPolygon", TSC2COMP(Path, GEOJSON, { name: "MultiPolygon" }));
            var GeometryCollection = (function (_super) {
                __extends(GeometryCollection, _super);
                function GeometryCollection() {
                    _super.apply(this, arguments);
                }
                GeometryCollection.template = '<g v-attr="id:id" v-class="class,type,geometry.type" v-style="style" v-show="!hide"><g v-class="class,type" v-repeat="geometry.geometries" v-component="{{\'vayu-\'+type}}"/></g>'; //VAYU.temp("GeometryCollection");
                return GeometryCollection;
            })(GEOJSON.Feature);
            GEOJSON.GeometryCollection = GeometryCollection;
            VAYU.component("vayu-GeometryCollection", TSC2COMP(GeometryCollection, GEOJSON));
        })(GEOJSON = LAYR.GEOJSON || (LAYR.GEOJSON = {}));
    })(LAYR = VAYU.LAYR || (VAYU.LAYR = {}));
})(VAYU || (VAYU = {}));
