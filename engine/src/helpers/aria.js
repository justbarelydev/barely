/**
 * ARIA helpers and keyboard navigation
 *
 *   linkAria(trigger, target)      trigger controls and names the target
 *   describeAria(trigger, target)  trigger is described by the target (tooltip)
 *   linkTriggers(root, {...})      pair every keyed [data-trigger]/[data-target]
 *
 *   rovingTabindex(items, active)  only the active item is tabbable
 *   moveFocus(items, index, dir)   wrapped move and focus, returns the new index
 *   restoreFocus(el)               focus on the saved return target
 *   bindKeynav(root, {...})        arrows, Home/End, Enter/Space, opt-in Escape
 *
 * Existing attributes are used, not overwritten.
 */

import { wrap } from '@justbarely/core';
import { els } from './elements';
import { listen } from './events';
import { ensureAttr, ensureId, setAttrs, uid } from './attr';

/**
 * `aria-controls` on the trigger, `aria-labelledby` on the target so it
 * inherits the trigger's name.
 *
 * @param {Element} trigger
 * @param {Element} target
 * @param {object} [opts]
 * @param {boolean} [opts.controls=true]
 * @param {boolean} [opts.label=true] - skip it for a target that has a name
 * @param {string} [opts.prefix='aria'] - id prefix when the trigger has none
 * @returns {string} the trigger's id
 */
export const linkAria = (
	trigger,
	target,
	{ controls = true, label = true, prefix = 'aria' } = {},
) => {
	const base = ensureId(trigger, () => uid(prefix));
	ensureId(target, `${base}-target`);

	if (controls) ensureAttr(trigger, 'aria-controls', target.id);

	const named =
		target.hasAttribute('aria-label') ||
		target.hasAttribute('aria-labelledby');
	if (label && !named) ensureAttr(target, 'aria-labelledby', trigger.id);

	return base;
};

/**
 * `aria-describedby` on the trigger - content that describes it rather than
 * names it (tooltips)
 *
 * @param {Element} trigger
 * @param {Element} target
 * @param {object} [opts]
 * @param {string} [opts.prefix='aria'] - id prefix when the trigger has none
 * @returns {string} the target's id
 */
export const describeAria = (trigger, target, { prefix = 'aria' } = {}) => {
	const base = ensureId(trigger, () => uid(prefix));
	ensureId(target, `${base}-desc`);
	ensureAttr(trigger, 'aria-describedby', target.id);
	return target.id;
};

// Did barely write this reference? ours start with the instance's base id.
const ours = (el, name, base) => !!el.getAttribute(name)?.startsWith(base);

/**
 * Link `[data-trigger="key"]` to `[data-target="key"]` (ids and references).
 * Roles should be added per-component.
 *
 * @param {Element} root
 * @param {object} [opts]
 * @param {string} [opts.trigger='data-trigger']
 * @param {string} [opts.target='data-target']
 * @param {string} [opts.prefix='aria'] - id prefix for the instance
 * @returns {{ base: string, triggers: Element[], targets: Element[] }}
 */
export const linkTriggers = (
	root,
	{ trigger = 'data-trigger', target = 'data-target', prefix = 'aria' } = {},
) => {
	const base = ensureId(root, () => uid(prefix));
	const triggers = els(root, `[${trigger}]`);
	const targets = els(root, `[${target}]`);

	for (const el of triggers) {
		const key = el.getAttribute(trigger);
		const pair = targets.find((t) => t.getAttribute(target) === key);
		const id = ensureId(el, () => `${base}-${key}`);

		if (!pair) {
			// if the target leaves drop our own reference, not an authored one
			if (ours(el, 'aria-controls', base))
				el.removeAttribute('aria-controls');
			continue;
		}

		ensureId(pair, `${id}-panel`);
		ensureAttr(el, 'aria-controls', pair.id);

		const named =
			pair.hasAttribute('aria-label') ||
			pair.hasAttribute('aria-labelledby');
		if (!named) ensureAttr(pair, 'aria-labelledby', id);
	}

	return { base, triggers, targets };
};

/**
 * Ensure only the active tab is in the tab order
 *
 * @param {Element[]} items
 * @param {number} active - index to make tabbable (-1 removes all)
 */
export const rovingTabindex = (items, active) => {
	items.forEach((el, i) =>
		setAttrs(el, { tabindex: i === active ? '0' : '-1' }),
	);
};

/**
 * @param {Element[]} items
 * @param {number} index - current index
 * @param {number} dir - 1 (next) or -1 (previous)
 * @returns {number} the new index, or -1 when there is nothing to move
 */
export const moveFocus = (items, index, dir) => {
	if (!items.length) return -1;
	const next = wrap(index + dir, items.length);
	items[next].focus();
	return next;
};

/**
 * Focus the `_barelyReturnFocus` target (a menu remembers its trigger) and clear
 * it, so a second close doesn't steal focus again.
 *
 * @param {Element} el - the element holding the return target
 */
export const restoreFocus = (el) => {
	const target = el?._barelyReturnFocus;
	if (!target) return;
	el._barelyReturnFocus = null;
	target.focus();
};

/**
 * `activateOnArrow` decides whether moving focus also automatically selects
 *
 * @param {Element} root
 * @param {object} opts
 * @param {Element[]|string|Function} opts.items - items, a selector inside root,
 *   or a function returning the current items
 * @param {string} [opts.delegate] - only handle keys on delegated selectors
 *   and block events from nested components
 * @param {'horizontal'|'vertical'} [opts.orientation='horizontal']
 * @param {boolean} [opts.rtl] - reverse ArrowLeft/Right (defaults to the
 *   root's computed direction for horizontal orientation)
 * @param {() => number} opts.active - the current item index
 * @param {(index: number, item: Element) => void} opts.activate - the
 *   consumer's own action
 * @param {boolean} [opts.activateOnArrow=false] - tabs/filmstrip true, menu false
 * @param {() => void} [opts.onEscape] - optional Escape handler
 * @param {boolean} [opts.typeahead=false] - first-letter match
 * @returns {Function} off - stop listening
 */
export const bindKeynav = (root, opts) => {
	const {
		items,
		delegate,
		orientation = 'horizontal',
		rtl,
		active,
		activate,
		activateOnArrow = false,
		onEscape,
		typeahead = false,
	} = opts;

	const resolve = () => {
		if (typeof items === 'function') {
			return items();
		}

		if (typeof items === 'string') {
			return els(root, items);
		}

		return items;
	};

	const onKeydown = (e, target) => {
		// Skip on chorded keyboard shortcuts
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		const list = resolve();
		if (!list.length) return;

		// Use focus, not state. `data-active` is one tick behind the keypress,
		// so holding an arrow key would keep calculating the same step. Fall
		// back to state when the key came from outside the items.
		const from = delegate ? target : e.target;
		let focused = list.findIndex(
			(item) => item === from || item.contains?.(from),
		);
		if (focused === -1) focused = active();

		const vertical = orientation === 'vertical';
		const reversed =
			rtl ?? (!vertical && getComputedStyle(root).direction === 'rtl');
		const nextKey = vertical
			? 'ArrowDown'
			: reversed
				? 'ArrowLeft'
				: 'ArrowRight';
		const prevKey = vertical
			? 'ArrowUp'
			: reversed
				? 'ArrowRight'
				: 'ArrowLeft';

		switch (e.key) {
			case nextKey:
			case prevKey: {
				if (focused < 0 || focused >= list.length) return;
				e.preventDefault();
				const dir = e.key === nextKey ? 1 : -1;
				const next = moveFocus(list, focused, dir);
				rovingTabindex(list, next);
				if (activateOnArrow) activate(next, list[next]);
				return;
			}
			case 'Home':
				e.preventDefault();
				list[0].focus();
				rovingTabindex(list, 0);
				if (activateOnArrow) activate(0, list[0]);
				return;
			case 'End': {
				const last = list.length - 1;
				e.preventDefault();
				list[last].focus();
				rovingTabindex(list, last);
				if (activateOnArrow) activate(last, list[last]);
				return;
			}
			case 'Enter':
			case ' ': {
				if (focused < 0 || focused >= list.length) return;
				e.preventDefault();
				activate(focused, list[focused]);
				return;
			}
			case 'Escape':
				if (onEscape) {
					e.preventDefault();
					onEscape();
				}
				return;
			default:
				if (typeahead && e.key.length === 1) {
					const char = e.key.toLowerCase();
					const match = list.find(
						(el) =>
							el.textContent.trim().charAt(0).toLowerCase() ===
							char,
					);
					if (match) {
						e.preventDefault();
						match.focus();
						rovingTabindex(list, list.indexOf(match));
					}
				}
				return;
		}
	};

	return delegate
		? listen(root, 'keydown', onKeydown, delegate)
		: listen(root, 'keydown', onKeydown);
};
