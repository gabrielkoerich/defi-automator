module.exports = {
  root: true,

  extends: ['airbnb-base', 'eslint-config-prettier'],

  env: {
    browser: true,
    node: true,
    es6: true,
    mocha: true,
  },

  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
  },

  plugins: ['import', 'unused-imports'],

  overrides: [
    // Match .ts Files
    {
      files: ['./tests/**/*.ts', './app/**/*.ts'],
      plugins: ['@typescript-eslint'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-unused-vars': 0,
      },
    },
  ],

  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
    'no-unused-vars': 0,
    'new-cap': 0,
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': 0,
    'class-methods-use-this': 0,
    'no-console': 0,
    'no-await-in-loop': 0,
    'no-plusplus': 0,
    'no-underscore-dangle': 0,
    'no-restricted-syntax': 0,
    'no-use-before-define': 0,
    'consistent-return': 0,
    'no-param-reassign': 0,
    'import/no-extraneous-dependencies': 0,
    'import/prefer-default-export': 0,
  },

  settings: {
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.json'],
      },
      node: {
        extensions: ['.js', '.ts', '.tsx'],
      },
    },
  },
};
