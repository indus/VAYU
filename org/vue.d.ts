// 0.12.x

declare class Vue {

  // constructor
  constructor(instanceOpt?);
  // static
  static cid: number;
  static compiler: {
    compile: (el, options, partial, transcluded) => any;
    compileAndLinkRoot: (vm, el, options) => any;
    transclude: (el) => any;
  };
  static component: (id, definition) => any;
  static config: ({
    _assetTypes: string[];
    _delimitersChanged: boolean;
    _propBindingModes: any;
    async: boolean;
    debug: boolean;
    delimiters: string;
    interpolate: boolean;
    prefix: string;
    proto: boolean;
    silent: boolean;
    warnExpressionErrors: boolean;
  }| any);
  static directive: (id, definition) => any;
  static elementDirective: (id, definition) => any;
  static extend: (extendOptions) => any;
  static filter: (id, definition) => any;
  static nextTick: (cb, ctx?) => any;
  static options: {
    components: any;
    directives: {
      "_component": any;
      "_prop": any;
      "attr": any;
      "class": (value) => any;
      "cloak": any;
      "el": any;
      "html": any;
      "if": any;
      "model": any;
      "on": any;
      "ref": any;
      "repeat": any;
      "show": (value) => any;
      "style": any;
      "text": any;
      "transition": any;
    };
    elementDirectives: {
      "content": any
    }
    filters: {
      "capitalize": (value) => any;
      "currency": (value, sign) => any;
      "filterBy": (arr, searchKey, delimiter, dataKey) => any;
      "json": any;
      "key": (handler, key) => any;
      "lowercase": (value) => any;
      "orderBy": (arr, sortKey, reverseKey) => any;
      "pluralize": (value) => any;
      "uppercase": (value) => any;
    };
    transitions: any;
  };
  static parsers: any;
  static transition: (id, definition) => any;
  static use: (plugin) => any;
  static util: {
    Vue: Vue;
    addClass: (el, cls) => any;
    after: (el, target) => any;
    animationEndEvent: string;
    animationProp: string;
    assertAsset: (val, type, id) => any;
    assertProp: (prop, value) => any;
    attr: (node, attr) => any;
    before: (el, target) => any;
    bind: (fn, ctx) => any;
    camelize: (str) => any;
    cancellable: (fn) => any;
    checkComponent: (el, options) => any;
    classify: (str) => any;
    createAnchor: (content, persist) => any;
    debounce: (func, wait) => any;
    define: (obj, key, val, enumerable) => any;
    extend: (to, from) => any;
    extractContent: (el, asFragment) => any;
    hasProto: boolean;
    inBrowser: boolean;
    inDoc: (node) => any;
    indexOf: (arr, obj) => number;
    isAndroid: boolean;
    isArray: (obj) => any;
    isIE9: boolean;
    isObject: (obj) => any;
    isPlainObject: (obj) => any;
    isReserved: (str) => any;
    isTemplate: (el) => any;
    log: (...msg) => any;
    mergeOptions: (parent, child, vm) => any;
    nextTick: (cb, ctx) => any;
    off: (el, event, cb) => any;
    on: (el, event, cb) => any;
    prepend: (el, target) => any;
    remove: (el) => any;
    removeClass: (el, cls) => any;
    replace: (target, el) => any;
    resolveAsset: (options, type, id) => any;
    stripQuotes: (str) => any;
    toArray: (list, start) => any;
    toBoolean: (value) => any;
    toNumber: (value) => any;
    toString: (value) => any;
    transitionEndEvent: string;
    transitionProp: string;
    warn: (msg) => any;
  };

  // public properties
  public $: any;
  public $$: any;
  public $data: any;
  public $el:HTMLElement;
  public $options: any;
  public $parent: Vue;
  public $root: Vue;
  public $children: Vue[];

  // public methods
  public $add: (key, val?) => any;
  public $addChild: (opts, BaseCtor) => any;
  public $after: (target, cb, withTransition) => any;
  public $appendTo: (target, cb, withTransition) => any;
  public $before: (target, cb, withTransition) => any;
  public $broadcast: (event) => any;
  public $compile: (el) => any;
  public $delete: (key) => any;
  public $destroy: (remove, deferCleanup) => any;
  public $dispatch: () => any;
  public $emit: (event) => any;
  public $eval: (text) => any;
  public $get: (exp) => any;
  public $interpolate: (text) => any;
  public $log: (path) => any;
  public $mount: (el) => any;
  public $nextTick: (fn) => any;
  public $off: (event, fn) => any;
  public $on: (event, fn) => any;
  public $once: (event, fn) => any;
  public $prependTo: (target, cb, withTransition) => any;
  public $remove: (cb, withTransition) => any;
  public $set: (exp, val) => any;
  public $watch: (exp: string, cb: (val: any, old?: any) => any, options?: { deep?: boolean, immediate?: boolean }) => any;
}