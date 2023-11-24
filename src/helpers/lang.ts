/* eslint-disable @typescript-eslint/no-namespace */
// import "web-ui-pack/baseElement"; // required to re-use __wupln

/*
  This function required for the future if need to make several languages support
  There are 2 ways to implement it:
  1. Runtime: Leave as is for runtime + window.__ln must return new content according to UI language
  2. Static builds: replace during the building => re-use :root...webpack.funcLoader.js for this
    2.1. For static build need to setup WUPControl-labels where it missed. Otherwise it parsed from `name` in run-time
  *. IDEA: auto translate via webpack.funcLoader.js and parse children: "text content"
*/

declare global {
  type LangFuncResult = never; // this forbids using ordinary strings for control.name
  interface LangFunc {
    (text: string): LangFuncResult;
  }
  /** Translate function used to replace content according to defined language
   * @param text Text that must be translated
   * @returns the same string by default */
  const __ln: LangFunc; // todo replace with __wupln after web-ui-pack update
  interface Window {
    __ln: LangFunc;
  }
}
// window.__ln = (s) => s; //WARN: uncomment to re-use in runtime + remove some logic in :root/webpack.funcLoader.js
export {};
