// Public presets keep the standalone project installable outside the company registry.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.next/**',
      '.next-dev/**',
      'next-env.d.ts',
      'data/**',
      '.agents/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'AwaitExpression',
          message: 'Use Promise chains for explicit async boundaries.',
        },
        {
          selector: "CallExpression[callee.name='clsx'] ConditionalExpression",
          message: 'Use && or object condition classes.',
        },
      ],
    },
  },
  {
    files: ['src/features/studio/**/*.{ts,tsx}'],
    ignores: [
      'src/features/studio/common/**',
      'src/features/studio/studio-provider.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['antd', 'antd/*'],
              message:
                'Import product UI controls from studio/common; keep antd implementation inside that boundary.',
            },
          ],
        },
      ],
    },
  },
);
