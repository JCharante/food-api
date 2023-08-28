module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        "no-extra-semi": "off", // have to disable the base rule if using the TS rule variant
        "@typescript-eslint/no-extra-semi": "error",
        '@typescript-eslint/no-empty-function': [
            "error",
            {
                "allow": ["constructors"]
            }
        ],
    },
};