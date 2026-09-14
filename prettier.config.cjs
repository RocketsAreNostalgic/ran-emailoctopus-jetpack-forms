'use strict';

const base = require('@rocketsarenostalgic/quality-config/prettier');

module.exports = {
	...base,
	useTabs: true,
	tabWidth: 4,
	printWidth: 80,
	singleQuote: true,
	trailingComma: 'es5',
	bracketSameLine: false,
	bracketSpacing: true,
	semi: true,
	arrowParens: 'always',
	overrides: [
		...(base.overrides || []),
		{
			files: '*.{css,sass,scss}',
			options: {
				singleQuote: false,
			},
		},
	],
};
