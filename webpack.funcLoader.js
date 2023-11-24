/* eslint-disable no-param-reassign */
// https://webpack.js.org/contribute/writing-a-loader/

/** Loader that can replace some content */
module.exports = function WebpackFuncLoader(source = "stringContext") {
  // replace nameof(...) with ...
  source = source.replace(/nameof\(([^)]+)\)/g, "$1"); // tied with helpers/nameof.ts
  // replace __ln(...) with ...
  source = source.replace(/__ln\(([^)]+)\)/g, "$1"); // tied with helpers/lang.ts
  return source;
};
