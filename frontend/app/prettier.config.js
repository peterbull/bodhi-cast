import { es2022 } from 'globals';

/** @type {import('prettier').Config} */
export default {
  plugins: ["prettier-plugin-tailwindcss", "prettier-plugin-organize-imports"],
  tabWidth: 2,
  printWidth: 80,
  trailingComma: es2022,
  singleQuote: false,
  semi: true
};
