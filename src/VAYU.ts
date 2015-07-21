/** 
 * VAYU v0.3.0
 * (c) 2015 Stefan Keim (aka indus)
 * powered by DLR-DFD 
 */

/// <reference path="../org/vue.d.ts" />
/// <reference path="action.ts" />

'use strict'

class VAYU extends Vue {

}

module VAYU {

  export var version: string = "0.3.0";
  console.log("%c VAYU [" + version + "] ", "color:#42b983;background-color:#333;font-weight:bold;font-size:20px;");

}

/**
 * extension of JavaScripts ```Math``` with additional constants
 */
interface Math {
  /** degrees to radians: 57.29577951308232 ```180 / Math.PI``` */
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