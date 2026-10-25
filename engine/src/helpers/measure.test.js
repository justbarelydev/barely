// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { measure } from '@justbarely/engine';

describe('measure', () => {
	it('writes the size var and returns a re-measure function', () => {
		const el = document.createElement('div');
		el.appendChild(document.createElement('div'));
		const rerun = measure(el, 'height', 'div');
		// happy-dom has no layout, so the px value is 0, but the var must exist
		expect(el.style.getPropertyValue('--height')).not.toBe('');
		expect(typeof rerun).toBe('function');
	});

	it('re-measures via the returned function', () => {
		const el = document.createElement('div');
		el.appendChild(document.createElement('div'));
		const rerun = measure(el, 'height', 'div');
		expect(() => rerun()).not.toThrow();
	});
});
