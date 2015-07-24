
module VAYU {
  "use strict"

  export class LAYR extends Vue {

    public _uid: number;

    public $root: VAYU;
    public $parent: VAYU.RCTX;

    public id: string;
    public type: string;
    public component: string;

    public hide: boolean;
    public style: any;

    public render(ctx?, view?) { }

    static methods: any = {
      render: LAYR.prototype.render
    }

    static events: any = {
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

  TSC2COMP(LAYR, VAYU);
}