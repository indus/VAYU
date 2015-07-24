

module VAYU {
  "use strict"


  export class RCTX extends Vue {

    public _uid: number;

    public $root: VAYU;
    public $parent: VAYU;
    public $children: VAYU.LAYR[];

    public update() { }

    protected static methods: any = {
      update: RCTX.prototype.update
    }

    protected static events: any = {
      "hook:created": function () {
        VAYU.unveil(this, "created");
        var self: RCTX = this;
        self._uid = self.$root._uid++;

      },
      "hook:ready": function () {
        VAYU.unveil(this, "ready");
        var self: RCTX = this;

        this.$root.$watch("view.update", function (update) {
          if (!update) return;
          self.update();
        }, { deep: true })
      }
    }
  }

  TSC2COMP(RCTX, VAYU);

  export module RCTX {

    export enum TYPE {
      SVG,
      CANVAS,
      /** not in use*/
      WEBGL
    }

    var STYLEMAP = {
      "stroke": "strokeStyle",
      "stroke-width": "lineWidth",
      "fill": "fillStyle"
    }

    export class SVG extends RCTX {
      protected static template = '<svg version="1.1" class="rctx" v-attr="width:$root.view.w,height:$root.view.h"><g v-repeat="layers" v-component="{{component||\'vayu-\'+(type==\'Feature\'?geometry.type:type)}}" track-by="_uid"></g></svg>';
      protected static replace = true;
    }

    VAYU.component("vayu-rctx-" + TYPE[TYPE.SVG], TSC2COMP(SVG, VAYU));

    export class CANVAS extends RCTX {
      protected static template = '<canvas class="rctx"><layer v-repeat="layers" v-component="{{component||(\'vayu-\' + type)}}" track-by="_uid"></layer></canvas>';
      protected static replace = true;

      public $el: HTMLCanvasElement;
      public $ctx: CanvasRenderingContext2D;

      public update() {
        var self: CANVAS = this;
        if (!self.$root) return;
        self.$el.width = self.$root.view.w;
        self.$el.height = self.$root.view.h;

        var layers = self.$children, ctx = self.$ctx;

        for (var layer of layers) {
          if (layer.hide) { continue; }
          ctx.save();

          var style_;
          for (var style in layer.style)
            (style_ = STYLEMAP[style] || style) in ctx && (ctx[style_] = layer.style[style])

          layer.render(ctx, self.$root.view);
          self.$ctx.restore();
        }
      }

      protected static methods = {
        update: CANVAS.prototype.update
      }

      protected static events = {
        "hook:ready": function () {
          var self: CANVAS = this;
          self.$ctx = self.$el.getContext("2d");
        }
      }
    }

    VAYU.component("vayu-rctx-" + TYPE[TYPE.CANVAS], TSC2COMP(CANVAS, VAYU));
  }
}