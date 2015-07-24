
module VAYU.LAYR.GEOJSON {
  "use strict"

  export class Feature extends LAYR {
    coordinates: any;

    geometry:any
    class: (string | any);

    protected static replace = true;
    protected static rctx = RCTX.TYPE.SVG;

    static events: any = {
      "hook:beforeDestroy": function () {
        Vue.nextTick(this.$root.update, this.$root);
      }
    }

    public render(ctx, view) {
      var coo = this.coordinates || this.geometry.coordinates,
        type = (this.geometry) ? this.geometry.type : this.type;

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
        case "LineString": this.coo2LineCTX(coo, ctx); break;
        case "MultiLineString": for (var co of coo) this.coo2LineCTX(co, ctx); break;
        case "Polygon": this.coo2PolyCTX(coo, ctx); break;
        case "MultiPolygon": for (var co of coo) this.coo2PolyCTX(co, ctx); break;
      }
      this.style && this.style.fill && ctx.fill();
      ctx.stroke();
    }

    coo2LineCTX(coo, ctx) {
      ctx.moveTo.apply(ctx, this.$root.view.c2g(coo[0]));
      for (var co of coo) ctx.lineTo.apply(ctx, this.$root.view.c2g(co));
    }

    coo2PolyCTX(coo, ctx) {
      for (var co of coo) this.coo2LineCTX(co, ctx);
    }

    static methods: any = {
      render: Feature.prototype.render,
      coo2LineCTX: Feature.prototype.coo2LineCTX,
      coo2PolyCTX: Feature.prototype.coo2PolyCTX
    }

  }

  VAYU.component("vayu-Feature", TSC2COMP(Feature, GEOJSON));

  export class FeatureCollection extends GEOJSON.Feature {
    protected static template = '<g v-class= "class,type" v-style="style" v-attr="id:id" v-show="!hide"><g v-repeat="features" v-component="{{component||(\'vayu-\'+geometry.type)}}"/></g>' //VAYU.temp("FeatureCollection");
  }

  VAYU.component("vayu-FeatureCollection", TSC2COMP(FeatureCollection, GEOJSON));

  export class Point extends GEOJSON.Feature {
    coordinates: any;
    $value: any;
    symbol: string;

    geometry: {
      type: string;
      coordinates: [number, number];
    }

    protected static template = '<use v-attr="\'xlink:href\':symbol||$parent.symbol||\'#point\',transform:transform" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"/></use>'; //VAYU.temp("Point");

    get_x() { this.$root.view.update; return this.$root.view.c2g(this.coordinates || this.geometry.coordinates)[0]; }
    get_y() { this.$root.view.update; return this.$root.view.c2g(this.coordinates || this.geometry.coordinates)[1]; }
    get_transform() {
      if (!this.$root.view.update) return;
      return "translate(" + this.$root.view.c2g(this.$value || this.coordinates || this.geometry.coordinates) + ")";
    }

    protected static computed = {
      x: Point.prototype.get_x,
      y: Point.prototype.get_y,
      transform: Point.prototype.get_transform
    }
  }
  VAYU.component("vayu-Point", TSC2COMP(Point, GEOJSON));

  export class MultiPoint extends Feature {
    geometry: {
      type: string;
      coordinates: [[number, number]]
    }

    protected static template = '<g v-attr="id:id" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"><g v-repeat="geometry.coordinates" v-component="vayu-MultiPointPart"/></g>'; //VAYU.temp("MultiPoint");
  }

  VAYU.component("vayu-MultiPoint", TSC2COMP(MultiPoint, GEOJSON));
  VAYU.component("vayu-MultiPointPart", TSC2COMP(Point, null, { name: "MultiPointPart", template: '<use v-attr="\'xlink:href\':$parent.symbol||\'#point\',transform:transform"/>' }));


  export class Path extends GEOJSON.Feature {
    coordinates: any
    geometry: {
      type: string;
      coordinates: [[number, number]]|[[[number, number]]]|[[[[number, number]]]];
    }

    protected static template = '<path v-attr="id:id,d:d" v-class="class,type,geometry && geometry.type" v-style="style" v-show="!hide"/>';//VAYU.temp("Path")point

    static events: any = {
      "hook:ready": function () {
        switch ((this.geometry) ? this.geometry.type : this.type) {
          case "MultiLineString":
          case "MultiPolygon":
            var coo = this.coordinates || this.geometry.coordinates
            for (var i = 0, l = coo.length; i < l; i++) {
              // TODO adjust clockwise maybe not working propably
              for (var j = 0, m = coo[i].length, s = 0, k; j < m, k = (j + 1) % m; j++)
                s += (coo[i][j][0] - coo[i][k][0]) * (coo[i][j][1] - coo[i][k][1]);
              if (!!(i % 2) !== (s > 0)) { coo[i] = coo[i].reverse(); };
            }


            break;
        }
      }
    }

    coo2LineD(coo) {
      var d = "M" + this.$root.view.c2g(coo[0]);
      for (var co of coo) d += "L" + this.$root.view.c2g(co);
      return d;
      //return "M" + coo.map(this.$root.view.c2g, this.$root.view).join('L');
    }

    coo2PolyD(coo) {
      var d = "";
      for (var co of coo) d += this.coo2LineD(co) + "Z";
      return d;
      //return coo.map(this.coo2LineD, this).join('Z');
    }

    d() {
      console.log("d");
      if (!this.$root.view.update) return;
      var coo = this.coordinates || this.geometry.coordinates,
        type = (this.geometry) ? this.geometry.type : this.type, d = "";
      switch ((this.geometry) ? this.geometry.type : this.type) {
        case "LineString": d = this.coo2LineD(coo); break;
        case "Polygon": d = this.coo2PolyD(coo); break;
        case "MultiLineString": for (var co of coo) d += this.coo2LineD(co); break;
        case "MultiPolygon": for (var co of coo) d += this.coo2PolyD(co); break;
      }
      return d || "M0,0";
    }


    protected static computed = {
      d: Path.prototype.d
    }

    static methods = {
      coo2LineD: Path.prototype.coo2LineD,
      coo2PolyD: Path.prototype.coo2PolyD
    }
  }

  VAYU.component("vayu-LineString", TSC2COMP(Path, GEOJSON, { name: "LineString" }));
  VAYU.component("vayu-MultiLineString", TSC2COMP(Path, GEOJSON, { name: "MultiLineString" }));
  VAYU.component("vayu-Polygon", TSC2COMP(Path, GEOJSON, { name: "Polygon" }));
  VAYU.component("vayu-MultiPolygon", TSC2COMP(Path, GEOJSON, { name: "MultiPolygon" }));


  export class GeometryCollection extends GEOJSON.Feature {
    geometry: {
      type: string;
      geometries: any;
    }

    protected static template = '<g v-attr="id:id" v-class="class,type,geometry.type" v-style="style" v-show="!hide"><g v-class="class,type" v-repeat="geometry.geometries" v-component="{{\'vayu-\'+type}}"/></g>'; //VAYU.temp("GeometryCollection");
  }

  VAYU.component("vayu-GeometryCollection", TSC2COMP(GeometryCollection, GEOJSON));
}






