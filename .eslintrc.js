module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2020,
		sourceType: 'module'
	},
	plugins: [
		'@typescript-eslint'
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended'
	],
	rules: {
		'@typescript-eslint/no-unused-vars': 'error',
		'@typescript-eslint/explicit-function-return-type': 'warn',
		'no-console': 'off'
	},
	ignorePatterns: ['out', 'dist', '**/*.d.ts']
};