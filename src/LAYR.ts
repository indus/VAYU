module VAYU{
  "use strict"

  @DVue()
  export class LAYR extends Vue {

    public _uid: number;

    public $root: VAYU;
    public $parent: VAYU.RCTX;

    public hide: boolean;
    public style: any;

    public render(ctx?, view?) { }

    private static methods = {
      render: LAYR.prototype.render
    }

    protected static events = {
      "hook:created": function () {
        VAYU.unveil(this, "created");
        var self: LAYR = this;
        self._uid = self.$root._uid++;
      },
      "hook:ready": function () {
        VAYU.unveil(this, "ready");
      }
    }
  }

}