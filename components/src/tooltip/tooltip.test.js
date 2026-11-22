// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { initElement } from '../../../engine/src/registry.js';
import './tooltip.js';

afterEach(() => {
	document.body.replaceChildren();
});

const mountWrapper = () => {
	const root = document.createElement('div');
	root.setAttribute('data-component', 'tooltip');

	const trigger = document.createElement('button');
	trigger.setAttribute('data-trigger', '');
	trigger.textContent = 'Save';

	const target = document.createElement('div');
	target.setAttribute('data-target', '');
	target.textContent = 'Saves your work';

	root.append(trigger, target);
	document.body.appendChild(root);
	initElement(root);
	return { root, trigger, target };
};

describe('tooltip ARIA', () => {
	it('gives authored [data-target] markup role="tooltip"', () => {
		const { trigger, target } = mountWrapper();
		expect(target.getAttribute('role')).toBe('tooltip');
		expect(target.id).toBeTruthy();
		expect(trigger.getAttribute('aria-describedby')).toBe(target.id);
	});

	it('preserves an authored role', () => {
		const root = document.createElement('div');
		root.setAttribute('data-component', 'tooltip');
		const trigger = document.createElement('button');
		trigger.setAttribute('data-trigger', '');
		const target = document.createElement('div');
		target.setAttribute('data-target', '');
		target.setAttribute('role', 'note');
		root.append(trigger, target);
		document.body.appendChild(root);
		initElement(root);

		expect(target.getAttribute('role')).toBe('note');
	});

	it('is dismissible with Escape (WCAG 1.4.13)', () => {
		const { trigger, target } = mountWrapper();

		trigger.dispatchEvent(new Event('mouseenter'));
		expect(target.hasAttribute('data-open')).toBe(true);

		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
		);
		expect(target.hasAttribute('data-open')).toBe(false);
	});

	it('ignores Escape when closed', () => {
		const { target } = mountWrapper();
		document.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
		);
		expect(target.hasAttribute('data-open')).toBe(false);
	});
});
