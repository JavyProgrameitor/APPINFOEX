import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Ignorados
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },

  // Desactiva reglas de estilo en conflicto, delega el formato en Prettier
  ...compat.extends("prettier"),

  // Reglas de estilo que SÍ queremos que ESLint haga cumplir (además de Prettier)
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // SIN punto y coma (TS): usa la regla del plugin y apaga la base
      "semi": "off",
      "@typescript-eslint/semi": ["error", "never"],

      // SIEMPRE comillas simples (evita doblarlas cuando haga falta)
      "quotes": "off",
      "@typescript-eslint/quotes": ["error", "single", { "avoidEscape": true }],

      // Errores de import/order o similares los puedes añadir si los necesitas
      // "import/order": ["error", { "alphabetize": { "order": "asc", "caseInsensitive": true } }]
    },
  },
];


export default eslintConfig;
