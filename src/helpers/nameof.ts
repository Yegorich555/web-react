type NameofFunc = <T>(propName: Extract<keyof T, string>) => string;

declare global {
  // interface NameofResult {}
  /** Single way in TS tie Interface with string as prop-key
   * @example
   * ```
   * nameof<IUser>("firstName")
   * ``` */
  const nameof: NameofFunc;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window {
    nameof: NameofFunc;
  }
}

window.nameof = (v) => v;
export {};
