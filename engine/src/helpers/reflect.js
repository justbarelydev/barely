/**
 * @justbarely/engine - reflect: write CSS vars straight to style
 *
 * The primitive for effects. Bypasses attributes and the MutationObserver entirely
 * for high-frequency values (scroll, pointer, springs). Combined per frame per
 * element, deduped.
 */

import { setCssVar } from './attr';

// el -> { scheduled, pending } where pending is Map(name, value)
const Pending = new WeakMap();

const flush = (el) => {
	const state = Pending.get(el);
	if (!state) return;
	state.scheduled = false;
	state.pending.forEach((value, name) => setCssVar(el, name, value));
	state.pending.clear();
};

/**
 * Write a CSS var straight to el.style. Many calls in one frame collapse to one
 * write per property (last wins), and a value that did not change is skipped by
 * setCssVar. Not part of data-sync.
 *
 * @param {Element} el
 * @param {string} name - CSS var name, no leading -- (e.g. 'progress')
 * @param {number|string} value - numbers are rounded to `precision` decimals
 * @param {number} [precision=3]
 */
export const reflect = (el, name, value, precision = 3) => {
	const v =
		typeof value === 'number' ? Number(value.toFixed(precision)) : value;

	let state = Pending.get(el);
	if (!state) {
		state = { scheduled: false, pending: new Map() };
		Pending.set(el, state);
	}
	state.pending.set(name, v);

	if (state.scheduled) return;
	state.scheduled = true;
	requestAnimationFrame(() => flush(el));
};
