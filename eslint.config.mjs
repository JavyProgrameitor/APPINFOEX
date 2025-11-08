// eslint.config.mjs
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import unusedImports from 'eslint-plugin-unused-imports'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['node_modules', 'dist', '.next', 'build'] },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        // Si necesitas reglas type-aware:
        // project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'unused-imports': unusedImports,
      prettier,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Estilo: comillas simples + sin ;
      'prettier/prettier': ['error', { singleQuote: true, semi: false }],

      // Base JS recomendada
      ...js.configs.recommended.rules,

      // React 17+ (JSX automático): sin importar React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Evita 'React is not defined'
      'no-undef': 'off',

      // Permitir catch {} vacíos (tu patrón)
      'no-empty': ['warn', { allowEmptyCatch: true }],

      // Limpiar imports no usados
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
)
