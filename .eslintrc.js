module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        node: true,
        es2021: true,
    },
    settings: {
        react: {
            version: 'detect', // Automatically detects React version
        },
    },
    plugins: ['@typescript-eslint', 'eslint-plugin-import', 'prettier'], // ✅ No 'react' here
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
        'plugin:prettier/recommended',
    ],
    rules: {
        // 🚫 Disallow 'any'
        '@typescript-eslint/no-explicit-any': 'warn',

        // ✅ Enforce consistent return types
        '@typescript-eslint/explicit-function-return-type': 'warn',

        // ✅ Disallow unused variables
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

        // ✅ Prefer interface over type
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

        // ✅ Import order & formatting
        'import/order': [
            'warn',
            {
                groups: [['builtin', 'external'], ['internal'], ['parent', 'sibling', 'index']],
                'newlines-between': 'always',
            },
        ],

        // ✅ Prettier formatting
        'prettier/prettier': ['error'],
    },
};
