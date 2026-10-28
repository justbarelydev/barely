// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { initMutation } from './mutation.js';

describe('initMutation ad-hoc data-refract', () => {
	it('refracts a dynamically added non-component on insert', async () => {
		initMutation(new Map());

		const el = document.createElement('div');
		el.setAttribute('data-refract', 'data-offset-x');
		el.setAttribute('data-offset-x', '12');
		document.body.appendChild(el);

		await new Promise((r) => setTimeout(r, 0));

		expect(el.style.getPropertyValue('--offset-x')).toBe('12');
		expect(el.hasAttribute('data-ready')).toBe(true);
	});
});
