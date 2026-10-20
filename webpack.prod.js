/* eslint-disable @typescript-eslint/no-require-imports */
const { merge } = require("webpack-merge");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const common = require("./webpack.common");

module.exports = (env, argv) => {
  const commonConfig = common(env, argv);

  /** @type {import('webpack').Configuration} */
  const extendedConfig = {
    mode: "production",
    // CLI-flag has priority over this value: 'npm run build-prod -- --devtool inline-source-map' (see 'build-prod-withMap' in package.json)
    // WARN: use only inline-* source maps otherwise *.map files are generated beside single schoolMathTest.html
    devtool: false, // option controls how source maps are generated (affects on build speed dramatically): https://v4.webpack.js.org/configuration/devtool/
    performance: {
      maxEntrypointSize: 1000000, // in bytes (e.g. 1Mb)
      maxAssetSize: 1000000,
      assetFilter: function assetFilter(assetFilename) {
        return !/\.map$/.test(assetFilename); // ignore these files from performance-hints
      },
    },
    optimization: {
      minimizeOptions: {
        html: { collapseWhitespace: "smart" }, // options for webpack default html-minimizer: https://webpack.js.org/configuration/optimization/#optimizationminimizeoptions
      },
      minimizer: [
        new TerserPlugin({
          // default webpack plugin for js-optimization which should be configured: https://v4.webpack.js.org/configuration/optimization/#optimizationminimizer
          // speediest alternative of UglifyJS (it improves minifying js files)
          test: /\.m?js(\?.*)?$/i,
          // exclude: /\.m?js(\?.*)?$/i, // uncomment if we don't need uglifying (for debug purpose)
          extractComments: false, // disable extracting comments to a different file
          terserOptions: {
            toplevel: true, // https://github.com/terser/terser#minify-options
            output: {
              comments: false, // remove comments from files
            },
            mangle: {
              safari10: true, // for preventing Safari 10/11 bugs in loop scoping and await
            },
            compress: { pure_funcs: ["console.info", "console.debug", "console.warn"] }, // remove this functions when their return values are not used
          },
        }),
        new CssMinimizerPlugin({}), // it minifies css and optimize it with cssnano: https://cssnano.co/guides/optimisations
        "...", // webpack default minimizers: it minifies html (js-files are skipped since already minified by TerserPlugin above)
      ],
    },
  };

  return merge(commonConfig, extendedConfig);
};
