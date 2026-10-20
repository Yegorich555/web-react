/** Plugin inlines emitted js & css files into *.html and removes them from output, so the build result is a single html-file */
module.exports = class InlineAssetsPlugin {
  apply(compiler) {
    const { name } = this.constructor;
    const { Compilation, sources } = compiler.webpack;

    compiler.hooks.thisCompilation.tap(name, (compilation) => {
      compilation.hooks.processAssets.tap(
        // stage after minification & devtool so files are already in final state
        // and after html-entry injects tags (it's OPTIMIZE_HASH + 1: see webpack/lib/html/HtmlModulesPlugin.js)
        { name, stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH + 10 },
        (assets) => {
          const { publicPath } = compilation.outputOptions;
          const inlined = new Set();
          /** Returns content of emitted file by url or null if it's not emitted by webpack (external url etc.) */
          const read = (url) => {
            const file = url.startsWith(publicPath) ? url.substring(publicPath.length) : url;
            const asset = compilation.getAsset(file);
            if (!asset) {
              return null;
            }
            inlined.add(file);
            return asset.source.source().toString();
          };

          Object.keys(assets)
            .filter((f) => f.endsWith(".html"))
            .forEach((f) => {
              let html = assets[f].source().toString();
              html = html.replace(/<script\b([^>]*?)\s+src=["']?([^"'\s>]+)["']?([^>]*)><\/script>/g, (m, before, src, after) => {
                const js = read(src);
                if (js == null) {
                  return m;
                }
                const attrs = `${before}${after}`.replace(/\s+(defer|async)(=("[^"]*"|'[^']*'|[^\s>]*))?/g, ""); // they don't work for inline scripts
                const safeJs = js.replace(/<\/(script)/gi, "<\\/$1").replace(/<!--/g, "<\\!--"); // otherwise browser closes tag earlier
                return `<script${attrs}>${safeJs}</script>`;
              });
              html = html.replace(/<link\b[^>]*\brel=["']?stylesheet["']?[^>]*>/g, (m) => {
                const href = /\bhref=["']?([^"'\s>]+)/.exec(m)?.[1];
                const css = href && read(href);
                return css == null ? m : `<style>${css.replace(/<\/(style)/gi, "<\\/$1")}</style>`;
              });
              compilation.updateAsset(f, new sources.RawSource(html));
            });

          inlined.forEach((f) => compilation.deleteAsset(f));
        },
      );
    });
  }
};
