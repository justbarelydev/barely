// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { initElement } from '../../../engine/src/registry.js';
import './dropdown.js';

afterEach(() => {
	document.body.replaceChildren();
});

const mountDropdown = () => {
	const root = document.createElement('div');
	root.setAttribute('data-component', 'dropdown');
	root.innerHTML = `
		<button data-trigger>Open</button>
		<div data-target>
			<button data-value="a">Apple</button>
			<button data-value="b">Banana</button>
			<button data-value="c">Cherry</button>
		</div>`;
	document.body.appendChild(root);
	initElement(root);

	return {
		root,
		trigger: root.querySelector('[data-trigger]'),
		menu: root.querySelector('[data-target]'),
		items: [...root.querySelectorAll('[data-value]')],
	};
};

const open = (root, trigger, menu) => {
	trigger.click();
	expect(menu.hasAttribute('data-open')).toBe(true);
	expect(trigger.getAttribute('aria-expanded')).toBe('true');
};

// Force the menu to flip above the trigger: near the viewport bottom, taller
// than the space below it. happy-dom does no layout, so the rects are stubbed.
const flipUpward = (trigger, menu) => {
	const h = window.innerHeight;
	trigger.getBoundingClientRect = () => ({
		top: h - 40,
		left: 0,
		right: 100,
		bottom: h - 20,
		width: 100,
		height: 20,
	});
	menu.getBoundingClientRect = () => ({
		top: 0,
		left: 0,
		right: 200,
		bottom: 400,
		width: 200,
		height: 400,
	});
};

const tell = (el, key) =>
	el.dispatchEvent(
		new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
		}),
	);

describe('dropdown keyboard navigation', () => {
	it('opens on the trigger and focuses the first item', () => {
		const { root, trigger, menu, items } = mountDropdown();
		open(root, trigger, menu);

		expect(menu.getAttribute('role')).toBe('menu');
		expect(menu.getAttribute('aria-hidden')).toBe('false');
		items.forEach((item) =>
			expect(item.getAttribute('role')).toBe('menuitem'),
		);
		expect(document.activeElement).toBe(items[0]);
		expect(items.map((el) => el.getAttribute('tabindex'))).toEqual([
			'0',
			'-1',
			'-1',
		]);
	});

	it('moves focus without selecting on arrows', () => {
		const { root, trigger, menu, items } = mountDropdown();
		const selected = [];
		root.addEventListener('barely:dropdownselect', (e) =>
			selected.push(e.detail.value),
		);
		open(root, trigger, menu);

		items[0].focus();
		tell(items[0], 'ArrowDown');

		expect(document.activeElement).toBe(items[1]);
		expect(items[1].getAttribute('tabindex')).toBe('0');
		expect(items[0].getAttribute('tabindex')).toBe('-1');
		expect(selected).toEqual([]);
		expect(menu.hasAttribute('data-open')).toBe(true);
	});

	it('wraps with arrows and jumps with Home and End', () => {
		const { root, trigger, menu, items } = mountDropdown();
		open(root, trigger, menu);

		items[0].focus();
		tell(items[0], 'ArrowUp');
		expect(document.activeElement).toBe(items[2]);

		tell(items[2], 'Home');
		expect(document.activeElement).toBe(items[0]);

		tell(items[0], 'End');
		expect(document.activeElement).toBe(items[2]);
	});

	it('selects on Enter, closes, and restores focus', () => {
		const { root, trigger, menu, items } = mountDropdown();
		const selected = [];
		root.addEventListener('barely:dropdownselect', (e) =>
			selected.push(e.detail.value),
		);
		open(root, trigger, menu);

		items[1].focus();
		tell(items[1], 'Enter');

		expect(selected).toEqual(['b']);
		expect(menu.hasAttribute('data-open')).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).toBe(trigger);
	});

	it('closes on Escape and restores focus', () => {
		const { root, trigger, menu, items } = mountDropdown();
		open(root, trigger, menu);

		items[0].focus();
		tell(items[0], 'Escape');

		expect(menu.hasAttribute('data-open')).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});

	it('matches the first letter with typeahead, without selecting', () => {
		const { root, trigger, menu, items } = mountDropdown();
		const selected = [];
		root.addEventListener('barely:dropdownselect', (e) =>
			selected.push(e.detail.value),
		);
		open(root, trigger, menu);

		items[0].focus();
		tell(items[0], 'c');

		expect(document.activeElement).toBe(items[2]);
		expect(selected).toEqual([]);
	});

	it('closes on a click outside the dropdown', () => {
		const { root, trigger, menu } = mountDropdown();
		open(root, trigger, menu);

		document.body.click();

		expect(menu.hasAttribute('data-open')).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
	});

	it('focuses the last item when the menu opens upward', () => {
		const { root, trigger, menu, items } = mountDropdown();
		flipUpward(trigger, menu);
		open(root, trigger, menu);

		expect(menu.getAttribute('data-placement')).toBe('top');
		expect(document.activeElement).toBe(items[2]);
	});

	it('keeps an explicit data-focus over the flip', () => {
		const { root, trigger, menu, items } = mountDropdown();
		root.dataset.focus = 'b';
		flipUpward(trigger, menu);
		open(root, trigger, menu);

		expect(menu.getAttribute('data-placement')).toBe('top');
		expect(document.activeElement).toBe(items[1]);
	});

	it('focuses the last item with data-focus="last"', () => {
		const { root, trigger, menu, items } = mountDropdown();
		root.dataset.focus = 'last';
		open(root, trigger, menu);

		expect(document.activeElement).toBe(items[2]);
	});
});
