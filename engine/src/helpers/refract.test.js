// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { Barely, refract, unitize } from '@justbarely/engine';
import { Registry, initElement } from '../registry.js';
import { attachAttrMO } from '../mutation.js';

const makeEl = (name) => {
	const el = document.createElement('div');
	el.setAttribute('data-component', name);
	return el;
};

describe('refract (imperative)', () => {
	it('mirrors an attr to a CSS var, raw', async () => {
		Barely.register('refract-raw').onMount((root) => {
			refract(root, 'data-offset-x');
		});
		const el = makeEl('refract-raw');
		initElement(el);
		attachAttrMO(el, Registry.get('refract-raw'));
		el.setAttribute('data-offset-x', '12');
		await new Promise((r) => setTimeout(r, 0));
		expect(el.style.getPropertyValue('--offset-x')).toBe('12');
	});

	it('applies a transform', async () => {
		Barely.register('refract-tx').onMount((root) => {
			refract(root, 'data-offset-y', unitize('px'));
		});
		const el = makeEl('refract-tx');
		initElement(el);
		attachAttrMO(el, Registry.get('refract-tx'));
		el.setAttribute('data-offset-y', '8');
		await new Promise((r) => setTimeout(r, 0));
		expect(el.style.getPropertyValue('--offset-y')).toBe('8px');
	});

	it('applies an existing attr immediately on mount', () => {
		Barely.register('refract-mount').onMount((root) => {
			refract(root, 'data-offset-x');
		});
		const el = makeEl('refract-mount');
		el.setAttribute('data-offset-x', '12');
		initElement(el);
		expect(el.style.getPropertyValue('--offset-x')).toBe('12');
	});
});
