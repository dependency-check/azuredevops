module.exports = {
    "root": true,
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": ['./build/scripts/tsconfig.json', './Tasks/tsconfig.json', './Tasks/*/tsconfig.json'],
    },
    "env": {
        "node": true,
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "plugins": [
        "@typescript-eslint", "no-null"
    ],
    "rules": {
        '@typescript-eslint/await-thenable': 'error', 
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        "@typescript-eslint/no-unused-vars": "off",
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-empty-function': 'off'
    }
};
