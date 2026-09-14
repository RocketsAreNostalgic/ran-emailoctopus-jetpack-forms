import ranWordPress from '@rocketsarenostalgic/quality-config/eslint/wordpress';

export default [
	...ranWordPress,
	{
		rules: {
			'@wordpress/no-unsafe-wp-apis': 'off',
		},
	},
];
