/**
 * @justbarely/engine - measurement helpers
 */

import { setCssVar } from './attr';

/**
 * Measure the natural size of a collapsed/clipped element and write it to
 * --width/--height on el. `height:auto` can't transition, so CSS animates
 * height: var(--height) while this sets the var.
 *
 *   setSize(panel)                             -> --height: <scrollHeight>px
 *   setSize(panel, ['width', 'height'])        -> --width + --height
 *   setSize(container, 'height', '[data-target][data-active]')
 *                                              -> measure child, write on el
 *
 * @param {Element} el - element to write the vars on
 * @param {string|string[]} [dims='height'] - 'width', 'height', or both
 * @param {string} [target] - selector for the element to measure (default el)
 */
export const setSize = (el, dims = 'height', target) => {
	const src = target ? el.querySelector(target) : el;
	if (!src) return;
	for (const dim of Array.isArray(dims) ? dims : [dims]) {
		if (dim === 'height') setCssVar(el, 'height', src.scrollHeight, 'px');
		else if (dim === 'width') setCssVar(el, 'width', src.scrollWidth, 'px');
	}
};
