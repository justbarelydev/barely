// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	children,
	child,
	closestComponent,
	findComponents,
	showElement,
	hideElement,
} from '@justbarely/engine';

describe('children', () => {
	it('scopes to the component root, excluding nested components', () => {
		document.body.innerHTML = `
			<div id="outer" data-component="tabs">
				<div data-trigger>outer</div>
				<div data-component="accordion"><div data-trigger>inner</div></div>
			</div>`;
		const outer = document.querySelector('#outer');
		const triggers = children(outer, '[data-trigger]');
		expect(triggers).toHaveLength(1);
		expect(triggers[0].textContent).toBe('outer');
	});

	it('child returns the first scoped match', () => {
		document.body.innerHTML = `
			<div id="outer" data-component="tabs">
				<div data-trigger>outer</div>
				<div data-component="accordion"><div data-trigger>inner</div></div>
			</div>`;
		const trigger = child(
			document.querySelector('#outer'),
			'[data-trigger]',
		);
		expect(trigger.textContent).toBe('outer');
	});
});

describe('component lookup', () => {
	it('closestComponent walks up to the nearest component', () => {
		document.body.innerHTML =
			'<div data-component="accordion"><div id="leaf"></div></div>';
		const root = closestComponent(document.querySelector('#leaf'));
		expect(root.getAttribute('data-component')).toBe('accordion');
	});

	it('findComponents filters by name', () => {
		document.body.innerHTML = `
			<div id="root">
				<div data-component="accordion"></div>
				<div data-component="tabs"></div>
			</div>`;
		const all = findComponents(document.querySelector('#root'));
		const accords = findComponents(
			document.querySelector('#root'),
			'accordion',
		);
		expect(all).toHaveLength(2);
		expect(accords).toHaveLength(1);
	});
});

describe('showElement / hideElement', () => {
	it('toggles the hidden attribute', () => {
		const el = document.createElement('div');
		hideElement(el);
		expect(el.hasAttribute('hidden')).toBe(true);
		showElement(el);
		expect(el.hasAttribute('hidden')).toBe(false);
	});
});
