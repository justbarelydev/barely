// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { Registry, initElement } from '../../../engine/src/registry.js';
import { attachAttrMO } from '../../../engine/src/mutation.js';
import './tabs.js';

afterEach(() => {
	document.body.replaceChildren();
});

const mountTabs = ({ vertical = false, active = 't1' } = {}) => {
	const root = document.createElement('div');
	root.setAttribute('data-component', 'tabs');
	root.setAttribute('data-active', active);
	if (vertical) root.setAttribute('data-mode', 'vertical');
	root.innerHTML = `
		<div data-triggers>
			<button data-trigger="t1">One</button>
			<button data-trigger="t2">Two</button>
			<button data-trigger="t3">Three</button>
		</div>
		<div>
			<div data-target="t1">Panel one</div>
			<div data-target="t2">Panel two</div>
			<div data-target="t3">Panel three</div>
		</div>`;
	document.body.appendChild(root);
	initElement(root);
	// initElement only runs the lifecycle; the mount path attaches the MO.
	attachAttrMO(root, Registry.get('tabs'));

	return {
		root,
		triggers: [...root.querySelectorAll('[data-trigger]')],
		panels: [...root.querySelectorAll('[data-target]')],
	};
};

const tell = (el, key, init = {}) =>
	el.dispatchEvent(
		new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			cancelable: true,
			...init,
		}),
	);

// Attribute writes are observed by the MO in a microtask
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('tabs keyboard navigation', () => {
	it('keeps one tab stop and marks the active tab selected', () => {
		const { triggers, panels } = mountTabs();

		expect(triggers.map((el) => el.getAttribute('tabindex'))).toEqual([
			'0',
			'-1',
			'-1',
		]);
		expect(triggers[0].getAttribute('aria-selected')).toBe('true');
		expect(triggers[1].getAttribute('aria-selected')).toBe('false');
		expect(panels[0].hasAttribute('data-active')).toBe(true);
	});

	it('moves focus and activates with ArrowRight', async () => {
		const { root, triggers, panels } = mountTabs();

		triggers[0].focus();
		tell(triggers[0], 'ArrowRight');
		await tick();

		expect(document.activeElement).toBe(triggers[1]);
		expect(root.getAttribute('data-active')).toBe('t2');
		expect(triggers[1].getAttribute('aria-selected')).toBe('true');
		expect(triggers[1].getAttribute('tabindex')).toBe('0');
		expect(triggers[0].getAttribute('tabindex')).toBe('-1');
		expect(panels[1].hasAttribute('data-active')).toBe(true);
		expect(panels[0].hasAttribute('data-active')).toBe(false);
	});

	it('wraps backward and jumps with Home and End', async () => {
		const { root, triggers } = mountTabs();

		triggers[0].focus();
		tell(triggers[0], 'ArrowLeft');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t3');

		tell(triggers[2], 'Home');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t1');

		tell(triggers[0], 'End');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t3');
		expect(document.activeElement).toBe(triggers[2]);
	});

	it('uses Up/Down when the tablist is vertical', async () => {
		const { root, triggers } = mountTabs({ vertical: true });

		expect(
			root.firstElementChild.getAttribute('aria-orientation'),
		).toBe('vertical');

		triggers[0].focus();
		tell(triggers[0], 'ArrowDown');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t2');

		tell(triggers[1], 'ArrowRight');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t2');
	});

	it('activates the focused tab on Enter and Space', async () => {
		const { root, triggers } = mountTabs();

		triggers[1].focus();
		tell(triggers[1], 'Enter');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t2');

		triggers[2].focus();
		tell(triggers[2], ' ');
		await tick();
		expect(root.getAttribute('data-active')).toBe('t3');
	});

	it('ignores arrow keys pressed with a modifier', async () => {
		const { root, triggers } = mountTabs();

		triggers[0].focus();
		tell(triggers[0], 'ArrowRight', { ctrlKey: true });
		await tick();

		expect(root.getAttribute('data-active')).toBe('t1');
		expect(document.activeElement).toBe(triggers[0]);
	});
});
