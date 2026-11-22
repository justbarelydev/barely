// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	rovingTabindex,
	moveFocus,
	restoreFocus,
	bindKeynav,
	linkAria,
	describeAria,
	linkTriggers,
} from './aria';

const makeItems = (count = 3) =>
	Array.from({ length: count }, (_, i) => {
		const button = document.createElement('button');
		button.textContent = `item-${i}`;
		return button;
	});

const key = (target, name, init = {}) => {
	const event = new KeyboardEvent('keydown', {
		key: name,
		bubbles: true,
		cancelable: true,
		...init,
	});
	target.dispatchEvent(event);
	return event;
};

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('rovingTabindex', () => {
	it('makes only the active item tabbable', () => {
		const items = makeItems();
		rovingTabindex(items, 1);

		expect(items.map((el) => el.getAttribute('tabindex'))).toEqual([
			'-1',
			'0',
			'-1',
		]);
	});

	it('removes everything from the tab order with -1', () => {
		const items = makeItems();
		rovingTabindex(items, -1);

		expect(items.map((el) => el.getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		]);
	});
});

describe('moveFocus', () => {
	it('wraps forward and focuses the next item', () => {
		const items = makeItems();
		const spy = vi.spyOn(items[2], 'focus');
		expect(moveFocus(items, 1, 1)).toBe(2);
		expect(spy).toHaveBeenCalled();
	});

	it('wraps backward across the start', () => {
		const items = makeItems();
		const spy = vi.spyOn(items[2], 'focus');
		expect(moveFocus(items, 0, -1)).toBe(2);
		expect(spy).toHaveBeenCalled();
	});

	it('returns -1 for an empty list', () => {
		expect(moveFocus([], 0, 1)).toBe(-1);
	});
});

describe('restoreFocus', () => {
	it('focuses the saved return target and clears it', () => {
		const owner = document.createElement('div');
		const target = document.createElement('button');
		const spy = vi.spyOn(target, 'focus');
		owner._barelyReturnFocus = target;

		restoreFocus(owner);

		expect(spy).toHaveBeenCalled();
		expect(owner._barelyReturnFocus).toBe(null);
	});

	it('is a no-op without a saved target', () => {
		const owner = document.createElement('div');
		expect(() => restoreFocus(owner)).not.toThrow();
	});
});

describe('bindKeynav', () => {
	it('moves and activates on arrows when activateOnArrow is set', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const state = { index: 0 };
		const activate = vi.fn((i) => (state.index = i));
		bindKeynav(root, {
			items,
			active: () => state.index,
			activate,
			activateOnArrow: true,
		});

		key(items[0], 'ArrowRight');
		expect(state.index).toBe(1);
		expect(activate).toHaveBeenCalledWith(1, items[1]);
		expect(items[1].getAttribute('tabindex')).toBe('0');
		expect(items[0].getAttribute('tabindex')).toBe('-1');

		// Wrap from the end back to the start.
		state.index = 2;
		key(items[2], 'ArrowRight');
		expect(state.index).toBe(0);
		expect(activate).toHaveBeenLastCalledWith(0, items[0]);
	});

	it('moves focus without activating when activateOnArrow is false', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			active: () => 0,
			activate,
			activateOnArrow: false,
		});

		const spy = vi.spyOn(items[1], 'focus');
		key(items[0], 'ArrowRight');
		expect(spy).toHaveBeenCalled();
		expect(activate).not.toHaveBeenCalled();
		expect(items[1].getAttribute('tabindex')).toBe('0');
		expect(items[0].getAttribute('tabindex')).toBe('-1');
	});

	it('uses ArrowUp/ArrowDown in vertical orientation', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const state = { index: 1 };
		const activate = vi.fn((i) => (state.index = i));
		bindKeynav(root, {
			items,
			orientation: 'vertical',
			active: () => state.index,
			activate,
			activateOnArrow: true,
		});

		key(items[1], 'ArrowUp');
		expect(state.index).toBe(0);
		key(items[0], 'ArrowDown');
		expect(state.index).toBe(1);
	});

	it('swaps ArrowLeft/ArrowRight in RTL', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const state = { index: 0 };
		const activate = vi.fn((i) => (state.index = i));
		bindKeynav(root, {
			items,
			rtl: true,
			active: () => state.index,
			activate,
			activateOnArrow: true,
		});

		key(items[0], 'ArrowLeft');
		expect(state.index).toBe(1);

		key(items[1], 'ArrowRight');
		expect(state.index).toBe(0);
	});

	it('jumps with Home and End', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const state = { index: 1 };
		const activate = vi.fn((i) => (state.index = i));
		bindKeynav(root, {
			items,
			active: () => state.index,
			activate,
			activateOnArrow: true,
		});

		key(items[1], 'End');
		expect(state.index).toBe(2);
		key(items[2], 'Home');
		expect(state.index).toBe(0);
	});

	it('activates the current item on Enter and Space', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			active: () => 1,
			activate,
		});

		key(items[1], 'Enter');
		expect(activate).toHaveBeenCalledWith(1, items[1]);
		key(items[1], ' ');
		expect(activate).toHaveBeenCalledTimes(2);
	});

	it('calls onEscape', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const onEscape = vi.fn();
		bindKeynav(root, {
			items,
			active: () => 0,
			activate: vi.fn(),
			onEscape,
		});

		key(items[0], 'Escape');
		expect(onEscape).toHaveBeenCalled();
	});

	it('matches first-letter typeahead', () => {
		const root = document.createElement('div');
		const items = makeItems(3);
		items[0].textContent = 'Apple';
		items[1].textContent = 'Banana';
		items[2].textContent = 'Cherry';
		items.forEach((el) => root.appendChild(el));

		bindKeynav(root, {
			items,
			active: () => 0,
			activate: vi.fn(),
			typeahead: true,
		});

		const spy = vi.spyOn(items[2], 'focus');
		key(items[0], 'c');
		expect(spy).toHaveBeenCalled();
		expect(items[2].getAttribute('tabindex')).toBe('0');
	});

	it('ignores chord keys', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			active: () => 0,
			activate,
			activateOnArrow: true,
		});

		key(items[0], 'ArrowRight', { ctrlKey: true });
		expect(activate).not.toHaveBeenCalled();
	});

	it('only handles keys from delegated targets', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));
		const panel = document.createElement('div');
		root.appendChild(panel);

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			delegate: 'button',
			active: () => 0,
			activate,
			activateOnArrow: true,
		});

		key(panel, 'ArrowRight');
		expect(activate).not.toHaveBeenCalled();
		expect(items[0].getAttribute('tabindex')).toBeNull();

		key(items[0], 'ArrowRight');
		expect(activate).toHaveBeenCalledWith(1, items[1]);
	});

	it('activates the event target over a stale active() index', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			// Selection has not caught up with focus yet.
			active: () => 0,
			activate,
		});

		key(items[2], 'Enter');
		expect(activate).toHaveBeenCalledWith(2, items[2]);
	});

	it('resolves the item when the key came from a nested element', () => {
		const root = document.createElement('div');
		const items = makeItems();
		items.forEach((el) => root.appendChild(el));
		const label = document.createElement('span');
		items[1].appendChild(label);

		const activate = vi.fn();
		bindKeynav(root, {
			items,
			active: () => 0,
			activate,
		});

		key(label, 'Enter');
		expect(activate).toHaveBeenCalledWith(1, items[1]);
	});
});

describe('linkAria', () => {
	it('pairs a trigger and target with ids on both sides', () => {
		const trigger = document.createElement('button');
		const target = document.createElement('div');

		const base = linkAria(trigger, target, { prefix: 'pair' });

		expect(trigger.id).toBe(base);
		expect(target.id).toBe(`${base}-target`);
		expect(trigger.getAttribute('aria-controls')).toBe(target.id);
		expect(target.getAttribute('aria-labelledby')).toBe(trigger.id);
	});

	it('derives the target id from an authored trigger id', () => {
		const trigger = document.createElement('button');
		trigger.id = 'save';
		const target = document.createElement('div');

		linkAria(trigger, target);

		expect(trigger.id).toBe('save');
		expect(target.id).toBe('save-target');
	});

	it('leaves authored references alone', () => {
		const trigger = document.createElement('button');
		trigger.id = 'btn';
		trigger.setAttribute('aria-controls', 'elsewhere');
		const target = document.createElement('div');
		target.id = 'panel';
		target.setAttribute('aria-labelledby', 'a-heading');

		linkAria(trigger, target);

		expect(trigger.getAttribute('aria-controls')).toBe('elsewhere');
		expect(target.getAttribute('aria-labelledby')).toBe('a-heading');
	});

	it('does not re-name a target that already has a name', () => {
		const trigger = document.createElement('button');
		const target = document.createElement('div');
		target.setAttribute('aria-label', 'Delete');

		linkAria(trigger, target);

		expect(target.hasAttribute('aria-labelledby')).toBe(false);
		expect(target.getAttribute('aria-label')).toBe('Delete');
	});

	it('can skip either side', () => {
		const trigger = document.createElement('button');
		const target = document.createElement('div');

		linkAria(trigger, target, { controls: false, label: false });

		expect(trigger.hasAttribute('aria-controls')).toBe(false);
		expect(target.hasAttribute('aria-labelledby')).toBe(false);
	});
});

describe('describeAria', () => {
	it('points the trigger at its description', () => {
		const trigger = document.createElement('button');
		const tip = document.createElement('div');

		const id = describeAria(trigger, tip, { prefix: 'tooltip' });

		expect(tip.id).toBe(id);
		expect(trigger.getAttribute('aria-describedby')).toBe(id);
	});

	it('leaves an authored description alone', () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('aria-describedby', 'hint');
		const tip = document.createElement('div');

		describeAria(trigger, tip);

		expect(trigger.getAttribute('aria-describedby')).toBe('hint');
	});
});

describe('linkTriggers', () => {
	const keyed = (keys) => {
		const root = document.createElement('div');
		for (const k of keys) {
			const trigger = document.createElement('button');
			trigger.setAttribute('data-trigger', k);
			root.appendChild(trigger);
			const panel = document.createElement('div');
			panel.setAttribute('data-target', k);
			root.appendChild(panel);
		}
		document.body.appendChild(root);
		return root;
	};

	it('pairs every keyed trigger with its target', () => {
		const root = keyed(['a', 'b']);
		const { base, triggers, targets } = linkTriggers(root, { prefix: 'x' });

		expect(base).toBe(root.id);
		expect(triggers[1].id).toBe(`${base}-b`);
		expect(targets[1].id).toBe(`${base}-b-panel`);
		expect(triggers[1].getAttribute('aria-controls')).toBe(targets[1].id);
		expect(targets[1].getAttribute('aria-labelledby')).toBe(triggers[1].id);
	});

	it('keeps two instances apart', () => {
		const one = keyed(['a']);
		const two = keyed(['a']);

		linkTriggers(one, { prefix: 'x' });
		linkTriggers(two, { prefix: 'x' });

		expect(one.id).not.toBe(two.id);
		expect(one.querySelector('[data-trigger]').id).not.toBe(
			two.querySelector('[data-trigger]').id,
		);
	});

	it('drops a reference it wrote when the target goes away', () => {
		const root = keyed(['a']);
		linkTriggers(root, { prefix: 'x' });
		const trigger = root.querySelector('[data-trigger]');
		expect(trigger.hasAttribute('aria-controls')).toBe(true);

		root.querySelector('[data-target]').remove();
		linkTriggers(root, { prefix: 'x' });

		expect(trigger.hasAttribute('aria-controls')).toBe(false);
	});

	it('leaves an authored aria-controls that points elsewhere', () => {
		const root = keyed(['a']);
		const trigger = root.querySelector('[data-trigger]');
		trigger.setAttribute('aria-controls', 'elsewhere');

		linkTriggers(root, { prefix: 'x' });

		expect(trigger.getAttribute('aria-controls')).toBe('elsewhere');
	});
});
