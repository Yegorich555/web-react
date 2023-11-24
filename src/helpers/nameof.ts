type NameofFunc = <T>(propName: Extract<keyof T, string>) => NameofResult;

declare global {
  type NameofResult = symbol; // this forbids using ordinary strings for control.name
  /** This is single way in TS tie Interface with string as prop-key
   * @example
   * ```
   * nameof<IUser>("firstName")
   * ``` */
  const nameof: NameofFunc;
  interface Window {
    nameof: NameofFunc;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// window.nameof = (v) => v as any; - not required in runtime because replaced WebpackFuncLoader
export {};
