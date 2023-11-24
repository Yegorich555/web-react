/* eslint-disable no-param-reassign */
// https://webpack.js.org/contribute/writing-a-loader/

/** Loader that can replace some content */
module.exports = function WebpackFuncLoader(source = "stringContext") {
  // replace global nameof(...) with ...
  source = source.replace(/nameof\(([^)]+)\)/g, "$1");
  return source;
};
