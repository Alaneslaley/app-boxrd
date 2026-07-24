const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  ...expoConfig,
  {
    ignores: ['dist/**', 'android/**', 'ios/**', 'src/generated/api/**'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/features/**/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/api/*', '@/features/*/application/*', '@/features/*/model/*'],
              message: 'Consume la API pública de la feature mediante su index.ts.',
            },
            {
              group: ['@/generated/api', '@/generated/api/*'],
              message: 'Las rutas y la UI no deben consumir DTO generados.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Las rutas y componentes visuales no ejecutan HTTP.',
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}', 'src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '@/features/**'],
              message: 'Core y shared no dependen de features.',
            },
          ],
        },
      ],
    },
  },
]);
