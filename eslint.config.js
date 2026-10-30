import js from '@eslint/js';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		ignores: ['**/dist/**'],
	},
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
			},
		},
		rules: {
			'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
		},
	},
	{
		// Node land: build scripts and config files
		files: ['scripts/**', '*.config.js', 'eslint.config.js'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
];
