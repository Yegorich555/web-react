# Web React Template

**Webpack** version: 5+
**React** version: 18+
**NodeJS** version: 18+

High scalable solution for Frontend development based on [webpack-must-have](https://github.com/Yegorich555/webpack-must-have) template

## How to run project

1. Open project in VSCode (for example)
2. Run command `npm i` in terminal (console) for installing all required packages (Node.js is required: <https://nodejs.org/en/>)
3. For building project you can use the following commands:
   - `npm run build-prod` - building production version (minimized and optimized). The project will be builded into `build` folder. You can change destination in `webpack.common.js (line 19)`
   - `npm run build-dev` - building development version
   - `npm run serve` - building development hot-reloaded version with webpack-dev-server

## Recommended VSCode extensions

- CSS Modules: <https://marketplace.visualstudio.com/items?itemName=clinyong.vscode-css-modules>
- CSS Modules Syntax Highlighter: <https://marketplace.visualstudio.com/items?itemName=andrewleedham.vscode-css-modules>
- ESlint: <https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint>
- StyleLint: <https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint>
- SCSS intellisense: <https://marketplace.visualstudio.com/items?itemName=mrmlnc.vscode-scss>
- Path autocomplete: <https://marketplace.visualstudio.com/items?itemName=ionutvmi.path-autocomplete>
- Prettier - Code formatter: <https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode>
- Import Cost: <https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost>
- Markdownlint: <https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint>
- EditConfig for VS Code: <https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig>
- Spell Checker: <https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker>
- TodoTree: <https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree>

## Features

- **Lint**. Integrated the most popular linters: ESlint, StyleLint
- **BrowserList**. All required browsers are pointed in **.browserslistrc**, so project will be compiled according to required browsers (babel, postcss, styleLint uses this file)
- **BrowserList. StyleLint**. Integrated [no-unsupported-browser-features](https://www.npmjs.com/package/stylelint-no-unsupported-browser-features), so during the css,scss-coding styleLint will show on-css rule that unsupported (according to .browserslistrc)
- **MockServer**. For mocking api responses integrated [webpack-mock-server](https://www.npmjs.com/package/webpack-mock-server) that supports JS,TS and hot-replacement:
- **Styles**. Integrated [CSS-Modules](https://github.com/css-modules/css-modules) and [postcss-autoprefixer](https://www.npmjs.com/package/autoprefixer), [postcss-normalize](https://www.npmjs.com/package/postcss-normalize), [CssMinimizerPlugin](https://www.npmjs.com/package/css-minimizer-webpack-plugin) (uses [css-nano](https://cssnano.co/) for production build)
- Perfect forms with [web-ui-pack](https://www.npmjs.com/package/web-ui-pack)
- Global **nameof** function + webpack loader to strict tie controls with Interfaces (TS lacks nameof by default)
- Global helper **cx** to allow use React.className with arrays
- Prepared for using with multiple languages: see [./helpers/lang.ts]([./helpers/lang.ts) section

## Troubleshooting

- Impossible to install anything with `npm i`
  > check if your NodeJS version matches with pointed in **package.json: engines.node** section (use [NVM](https://github.com/coreybutler/nvm-windows/releases) to easy manage NodeJS versions)
- Impossible to run scripts from package.json
  > try to change backslashes (npm-cli issue that flows between versions time to time)
  > from `.\\node_modules\\.bin\\webpack serve --open --config webpack.devServer.js"`
  > to `./node_modules/.bin/webpack serve --open --config webpack.devServer.js"`
