// import "web-ui-pack/baseElement"; // required to re-use __wupln

/*
  This function required for the future if need to make several languages support
  There are 2 ways to implement it:
  1. Leave as is for runtime + window.__ln must return new content according to UI language
  2. Replace during the building: re-use :root...webpack.funcLoader.js for this
*/
declare global {
  interface LangFunc {
    (text: string): string;
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
