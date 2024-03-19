type TrueType = string | number | boolean | undefined | null;
/** Function to filter + join strings into single className */
function cx(...args: TrueType[]): string {
  return args.filter((v) => v).join(" ");
}

// WARN: uncomment it if somehow function cx isn't globally visible despite on import into main.ts(x)
// declare global {
//   interface Window {
//     cx: typeof cx;
//   }
// }

window.cx = cx;
