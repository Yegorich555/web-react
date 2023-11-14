/*
tslint won't be supported: https://github.com/palantir/tslint/issues/4534
you should use typescript-eslint/eslint-plugin: https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin
but you can't do it with {parser: 'babel-eslint'}: https://github.com/typescript-eslint/typescript-eslint#what-about-babel-and-babel-eslint
*/
/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    "eslint:recommended",
    "airbnb",
    "prettier",
    "plugin:@typescript-eslint/recommended",
    "plugin:css-modules/recommended", // shows unused classes: https://www.npmjs.com/package/eslint-plugin-css-modules
  ],
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  globals: {
    DEV: true,
  },
  plugins: ["json", "prettier", "import", "@typescript-eslint", "unused-imports", "css-modules"],
  rules: {
    "css-modules/no-unused-class": "warn",
    "css-modules/no-undef-class": "error",
    // TS
    "@typescript-eslint/no-explicit-any": [
      "error",
      {
        fixToUnknown: true,
        ignoreRestArgs: false,
      },
    ],
    "@typescript-eslint/no-shadow": ["error"],
    "@typescript-eslint/no-use-before-define": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    // React
    "react/jsx-filename-extension": ["error", { extensions: [".tsx"] }],
    "react/destructuring-assignment": "off",
    // "react/jsx-max-props-per-line": [1, { maximum: 1 }], //it doesn't work with prettier, you can remove prettier from rules: 'prettier/prettier'...
    // "react/jsx-first-prop-new-line": [1, "multiline"], //it doesn't work with prettier, you can remove prettier from rules: 'prettier/prettier'...
    "react/prop-types": "off",
    "react/require-default-props": "off", // it's wrong for TS like { initValue?: string; }
    "react/prefer-stateless-function": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-props-no-spreading": "off",
    "react/jsx-curly-newline": "off", // it conflicts with prettier
    "react/jsx-wrap-multilines": ["error", { arrow: true, return: true, declaration: true }],
    "react/function-component-definition": [2, { namedComponents: "function-declaration" }],
    // Other
    "prettier/prettier": ["error"],
    "no-shadow": "off",
    "no-use-before-define": "off",
    "require-await": "error",
    "spaced-comment": ["error", "always"],
    "unused-imports/no-unused-imports": "error",
    "no-underscore-dangle": "off",
    "no-unused-expressions": ["error", { allowShortCircuit: true }],
    "no-console": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-alert": process.env.NODE_ENV === "production" ? "error" : "off",
    "no-plusplus": "off",
    "class-methods-use-this": "off",
    "max-len": [
      "warn",
      {
        code: 140,
        tabWidth: 2,
        comments: 1000,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        js: "never",
        jsx: "never",
        ts: "never",
        tsx: "never",
      },
    ],
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`
        project: ["./tsconfig.json"],
      },
    },
  },
};
