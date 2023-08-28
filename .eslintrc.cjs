module.exports = {
    extends: ['eslint-config-standard-with-typescript'],
    parserOptions: {
        project: './tsconfig.json'
    },
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/indent': ['error', 4],
        'indent': ['error', 4]
    }
}