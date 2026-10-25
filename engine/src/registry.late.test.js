// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { register, markInitialized } from './registry.js';

describe('late registration (after init)', () => {
	it('inits existing markup when registered after the engine is running', async () => {
		markInitialized();
		document.body.innerHTML = '<div data-component="late"></div>';

		const mount = vi.fn();
		register('late').onMount(mount);

		// The scan is deferred a microtask so hooks land first.
		await new Promise((r) => setTimeout(r, 0));

		expect(mount).toHaveBeenCalledTimes(1);
		expect(
			document
				.querySelector('[data-component="late"]')
				.hasAttribute('data-ready'),
		).toBe(true);
	});
});
