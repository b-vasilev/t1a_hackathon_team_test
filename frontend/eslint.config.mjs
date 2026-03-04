import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      "@next/next/no-page-custom-font": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^[A-Z]" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-var": "error",
      "prefer-const": "error",
      "no-duplicate-imports": "error",
      eqeqeq: ["error", "always"],
      "no-implicit-coercion": "error",
      curly: ["error", "all"],
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "no-else-return": "error",
      "no-shadow": "error",
      "no-throw-literal": "error",
      "prefer-template": "error",
      "no-param-reassign": "error",
    },
  },
  {
    ignores: [".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
