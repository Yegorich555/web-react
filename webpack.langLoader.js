/* eslint-disable no-param-reassign */
// https://webpack.js.org/contribute/writing-a-loader/

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function replaceFunction(str = "", funcName = "", callback = (...args) => "") {
  let i = 0;
  while (i > -1) {
    i = str.indexOf(`${funcName}(`, i);
    if (i !== -1) {
      let n = i + funcName.length + 1;
      const start = n;
      let cnt = 1;
      while (++n > -1) {
        const char = str[n];
        if (char === "(") {
          ++cnt;
        } else if (char === ")") {
          --cnt;
          if (cnt === 0) {
            const replaceStr = callback.apply(this, str.substring(start, n).split(","));
            const prevLen = str.length;
            str = `${str.substring(0, i)}${replaceStr}${str.substring(n + 1)}`;
            i = n + 1 - (prevLen - str.length);
            break;
          }
        }
      }
    }
  }
  return str;
}

/** Loader that can replace some content */
module.exports = function WebpackLangLoader(source = "stringContext") {
  // https://stackoverflow.com/questions/18906514/regex-for-matching-functions-and-capturing-their-arguments
  // replace __wupln($1,$2) with $1
  // source = source.replace(/__wupln\(([^,\n\r]+).*\)/g, "$1");
  source = replaceFunction(source, "__wupln", (...args) => args[0]); // tied with helpers/lang.ts + web-ui-pack
  return source;
};
