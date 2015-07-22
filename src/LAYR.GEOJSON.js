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
        var GEOJSON;
        (function (GEOJSON) {
            "use strict";
            var Feature = (function (_super) {
                __extends(Feature, _super);
                function Feature() {
                    _super.apply(this, arguments);
                }
                Feature.replace = true;
                Feature.rctx = VAYU.RCTX.TYPE.SVG;
                Feature.events = {
                    "hook:created": function () {
                        VAYU.unveil(this, "created");
                    },
                    "hook:beforeDestroy": function () {
                        Vue.nextTick(this.$root.update, this.$root);
                    },
                    "hook:ready": function () {
                        VAYU.unveil(this, "ready");
                    }
                };
                Feature.computed = {
                    show: function () {
                        return !this.hide;
                    }
                };
                Feature.methods = {
                    coo2LineCTX: function (coo, ctx) {
                        ctx.moveTo.apply(ctx, this.$root.view.c2g(coo[0]));
                        for (var i = 1, l = coo.length; i < l; i++)
                            ctx.lineTo.apply(ctx, this.$root.view.c2g(coo[i]));
                    },
                    coo2PolyCTX: function (coo, ctx) {
                        for (var i = 0, l = coo.length; i < l; i++)
                            this.coo2LineCTX(coo[i], ctx);
                    },
                    render: function (ctx, view) {
                        for (var key in this.style) {
                            if (key in ctx) {
                                ctx[key] = this.style[key];
                            }
                            ;
                        }
                        ctx.beginPath();
                        var coo = this.$data.coordinates || this.$data.geometry.coordinates, type = (this.$data.geometry) ? this.$data.geometry.type : this.$data.type;
                        //console.log(coo);
                        switch (type) {
                            case "LineString":
                                this.coo2LineCTX(coo, ctx);
                                break;
                            case "Polygon":
                                this.coo2PolyCTX(coo, ctx);
                                break;
                            case "MultiLineString":
                                for (var i = 0, l = coo.length; i < l; i++) {
                                    this.coo2LineCTX(coo[i], ctx);
                                }
                                break;
                            case "MultiPolygon":
                                for (var i = 0, l = coo.length; i < l; i++) {
                                    this.coo2PolyCTX(coo[i], ctx);
                                }
                                break;
                        }
                        ctx.stroke();
                        //ctx.fill();
                    }
                };
                Feature = __decorate([
                    DVue(VAYU.LAYR)
                ], Feature);
                return Feature;
            })(VAYU.LAYR);
            GEOJSON.Feature = Feature;
            VAYU.component("vayu-Feature", Feature);
            var FeatureCollection = (function (_super) {
                __extends(FeatureCollection, _super);
                function FeatureCollection() {
                    _super.apply(this, arguments);
                }
                FeatureCollection.template = '<g v-class= "class,type" v-style="style" v-attr="id:id" v-show="show"><g v-repeat="features" v-component="{{component||(\'vayu-\'+geometry.type)}}"/></g>'; //VAYU.temp("FeatureCollection");
                return FeatureCollection;
            })(Feature);
            GEOJSON.FeatureCollection = FeatureCollection;
            VAYU.component("vayu-FeatureCollection", Vue.extend(FeatureCollection));
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
                Point.template = '<use v-attr="\'xlink:href\':symbol||$parent.symbol||\'#marker\',transform:transform" v-class="class,type,geometry.type" v-style="style" v-show="show"/></use>'; //VAYU.temp("Point");
                Point.computed = Vue.util.extend({
                    x: Point.prototype.get_x,
                    y: Point.prototype.get_y,
                    transform: Point.prototype.get_transform
                }, Feature.computed);
                Point = __decorate([
                    DVue(Feature)
                ], Point);
                return Point;
            })(Feature);
            GEOJSON.Point = Point;
            VAYU.component("vayu-Point", Point);
            var MultiPoint = (function (_super) {
                __extends(MultiPoint, _super);
                function MultiPoint() {
                    _super.apply(this, arguments);
                }
                MultiPoint.template = '<g v-attr="id:id" v-class="class,type,geometry.type" v-style="style" v-show="show"><g v-repeat="geometry.coordinates" v-component="vayu-MultiPointPart"/></g>'; //VAYU.temp("MultiPoint");
                return MultiPoint;
            })(Feature);
            GEOJSON.MultiPoint = MultiPoint;
            VAYU.component("vayu-MultiPoint", Vue.extend(MultiPoint));
            VAYU.component("vayu-MultiPointPart", Vue.extend(Vue.util.extend(Point, { template: '<use v-attr="\'xlink:href\':$parent.symbol||\'#marker\',transform:transform"/>' })));
            var Path = (function (_super) {
                __extends(Path, _super);
                function Path() {
                    _super.apply(this, arguments);
                }
                Path.prototype.coo2LineD = function (coo) {
                    var d = "M" + this.$root.view.c2g(coo[0]);
                    for (var i = 1, l = coo.length; i < l; i++)
                        d += "L" + this.$root.view.c2g(coo[i]);
                    return d;
                    //return "M" + coo.map(this.$root.view.c2g, this.$root.view).join('L');
                };
                Path.prototype.coo2PolyD = function (coo) {
                    var d = "";
                    for (var i = 0, l = coo.length; i < l; i++)
                        d += this.coo2LineD(coo[i]) + "Z";
                    return d;
                    //return coo.map(this.coo2LineD, this).join('Z');
                };
                Path.prototype.d = function () {
                    if (!this.$root.view.update)
                        return;
                    var coo = this.coordinates || this.geometry.coordinates, d = "";
                    switch ((this.geometry) ? this.geometry.type : this.type) {
                        case "LineString":
                            d = this.coo2LineD(coo);
                            break;
                        case "Polygon":
                            d = this.coo2PolyD(coo);
                            break;
                        case "MultiLineString":
                            for (var i = 0, l = coo.length; i < l; i++) {
                                d += this.coo2LineD(coo[i]);
                            }
                            break;
                        case "MultiPolygon":
                            for (var i = 0, l = coo.length; i < l; i++) {
                                d += this.coo2PolyD(coo[i]);
                            }
                            break;
                    }
                    return d || "M0,0";
                };
                Path.template = '<path v-attr="id:id,d:d" v-class="class,type,geometry.type" v-style="style" v-show="show"/>'; //VAYU.temp("Path")
                Path.ready = function () {
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
                };
                Path.methods = {
                    coo2LineD: Path.prototype.coo2LineD,
                    coo2PolyD: Path.prototype.coo2PolyD
                };
                Path.computed = Vue.util.extend({
                    d: Path.prototype.d
                }, Feature.computed);
                return Path;
            })(Feature);
            GEOJSON.Path = Path;
            VAYU.component("vayu-LineString", Vue.extend(Path));
            VAYU.component("vayu-MultiLineString", Vue.extend(Path));
            VAYU.component("vayu-Polygon", Vue.extend(Path));
            VAYU.component("vayu-MultiPolygon", Vue.extend(Path));
            var GeometryCollection = (function (_super) {
                __extends(GeometryCollection, _super);
                function GeometryCollection() {
                    _super.apply(this, arguments);
                }
                GeometryCollection.template = '<g v-attr="id:id" v-class="class,type,geometry.type" v-style="style" v-show="show"><g v-class="class,type" v-repeat="geometry.geometries" v-component="{{\'vayu-\'+type}}"/></g>'; //VAYU.temp("GeometryCollection");
                return GeometryCollection;
            })(Feature);
            GEOJSON.GeometryCollection = GeometryCollection;
            VAYU.component("vayu-GeometryCollection", Vue.extend(GeometryCollection));
        })(GEOJSON = LAYR.GEOJSON || (LAYR.GEOJSON = {}));
    })(LAYR = VAYU.LAYR || (VAYU.LAYR = {}));
})(VAYU || (VAYU = {}));
