import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import * as ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
const config = defineConfig([
  globalIgnores([
    '**/dist',
    '**/node_modules',
    '**/vendored',
    'packages/api/src/client',
  ]),
  {
    name: 'js',
    extends: [js.configs.recommended],
    rules: {
      'prefer-const': 'warn',
      eqeqeq: [
        'error',
        'always',
        {
          null: 'ignore',
        },
      ],
    },
  },
  {
    name: 'typescript-eslint',
    extends: [
      ts.configs.recommendedTypeChecked,
      ts.configs.stylisticTypeChecked,
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        {
          allowInterfaces: 'with-single-extends',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
        }
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: {
            boolean: true,
          },
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  prettier,
]);

export default config;
