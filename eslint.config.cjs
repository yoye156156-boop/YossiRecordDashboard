const js = require("@eslint/js");
const globals = require("globals");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const reactRefresh = require("eslint-plugin-react-refresh");

module.exports = [
  // התעלמות מתיקיות build ותלויות
  {
    ignores: [
      "node_modules/**",
      "dashboard/node_modules/**",
      "dashboard/dist/**",
      "**/*.min.js",
    ],
  },

  // שרת (CommonJS)
  {
    files: ["server.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-useless-escape": "off",
    },
  },

  // קבצי קונפיג Node בצד ה־frontend (vite.config וכו')
  {
    files: ["dashboard/vite.config.{js,ts,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },

  // קליינט (Vite + React) – הפעלת JSX
  {
    files: ["dashboard/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
    settings: { react: { version: "detect" } },
  },
];

// 🧪 הגדרת סביבת בדיקות (Node / Jest)
module.exports.push({
  files: ['**/*.test.js', '**/*.test.jsx'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    globals: {
      ...require('globals').node,
      ...require('globals').jest,
    },
  },
  rules: {
    'no-undef': 'off',
  },
});
