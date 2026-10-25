// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { reflect } from '@justbarely/engine';

// Deterministic rAF: capture the callback so tests can flush synchronously.
let raf;
const stubRaf = () => {
	raf = null;
	vi.stubGlobal('requestAnimationFrame', (cb) => {
		raf = cb;
		return 1;
	});
};

afterEach(() => vi.unstubAllGlobals());

describe('reflect', () => {
	const makeEl = () => document.createElement('div');

	it('writes a rounded number to a CSS var', () => {
		stubRaf();
		const el = makeEl();
		reflect(el, 'progress', 0.423156);
		raf();
		expect(el.style.getPropertyValue('--progress')).toBe('0.423');
	});

	it('rounds to the requested precision', () => {
		stubRaf();
		const el = makeEl();
		reflect(el, 'x', 0.123456, 2);
		raf();
		expect(el.style.getPropertyValue('--x')).toBe('0.12');
	});

	it('passes strings through unchanged', () => {
		stubRaf();
		const el = makeEl();
		reflect(el, 'offset', '12px');
		raf();
		expect(el.style.getPropertyValue('--offset')).toBe('12px');
	});

	it('coalesces: the last write to a prop in one frame wins', () => {
		stubRaf();
		const el = makeEl();
		reflect(el, 'progress', 0.111111, 2);
		reflect(el, 'progress', 0.999999, 2);
		raf();
		expect(el.style.getPropertyValue('--progress')).toBe('1');
	});

	it('writes multiple props in one frame', () => {
		stubRaf();
		const el = makeEl();
		reflect(el, 'a', 1);
		reflect(el, 'b', 2);
		raf();
		expect(el.style.getPropertyValue('--a')).toBe('1');
		expect(el.style.getPropertyValue('--b')).toBe('2');
	});
});
