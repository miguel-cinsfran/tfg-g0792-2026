import sveltePlugin from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';
import js from '@eslint/js';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	{
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	...sveltePlugin.configs['flat/recommended'],
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: {
			globals: { ...globals.browser },
			parserOptions: {
				parser: ts.parser
			}
		}
	},
	{
		ignores: ['.svelte-kit/', 'build/', 'android/']
	}
);
