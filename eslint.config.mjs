import js from '@eslint/js';
import query from '@tanstack/eslint-plugin-query';
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals'
import * as ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
const config = defineConfig([
  globalIgnores([
    '**/.react-router',
    '**/dist',
    '**/node_modules',
    '**/vendored',
    'packages/api/src/client',
  ]),
  {
    name: 'js',
    extends: [js.configs.recommended],
    rules: {
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
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
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        }
      ],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignorePrimitives: true,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allow: [
            { from: 'lib', name: 'URL' },
            {
              from: 'package',
              package: 'multiformats',
              name: 'CID',
            },
          ],
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
  {
    files: ['packages/*/tests/**/*.ts'],
    rules: {
      // `expect.*(): any` is prevalent here.
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['packages/web/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      query.configs['flat/recommended-strict'],
    ],
    rules: {
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            { from: 'lib', name: 'Response' },
          ],
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        {
          // React Router handles these exports to work with Fast Refresh.
          // https://github.com/remix-run/react-router/discussions/10856#discussioncomment-12642926
          allowExportNames: [
            'loader',
            'clientLoader',
            'action',
            'clientAction',
            'ErrorBoundary',
            'HydrateFallback',
            'headers',
            'handle',
            'links',
            'meta',
            'shouldRevalidate',
          ],
        },
      ],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  prettier,
]);

export default config;
