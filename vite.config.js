import { defineConfig } from 'vite';

export default defineConfig({
	resolve: {
		alias: {
			'@justbarely/engine': '/engine/src/index.js',
			'@justbarely/components': '/components/src/index.js',
			'@justbarely/core': '/core/src/index.js',
			'@justbarely/data': '/data/src/index.js',
			'@justbarely/styles': '/styles/src/index.js',
			'@justbarely/ui': '/ui/src/index.js',
		},
	},
});
