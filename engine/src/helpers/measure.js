/**
 * @justbarely/engine - measurement helpers
 */

import { setCssVar } from './attr';
import { resize } from './observe';

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

/**
 * Measure first, then re-measure whenever content resizes. Observes content, not
 * the container because writing `--height` on the container while observing it
 * would cause a loop.
 *
 * Returns a manual re-measure function which is the only way to re-measure in
 * the no-`target` case (no observer is attached). If the observed element is
 * replaced (skeleton -> content), call `measure()` again instead - that
 * re-measures and re-attaches the observer.
 *
 * Auto re-measure needs `target` (a descendant selector). Without it, this
 * measures el itself once, because observing the container we write to loops.
 *
 * @param {Element} el - element to write the vars on
 * @param {string|string[]} [dims='height']
 * @param {string} [target] - selector for the content to measure
 * @returns {() => void} manual re-measure function
 */
export const measure = (el, dims = 'height', target) => {
	const run = () => setSize(el, dims, target);
	run();

	const src = target ? el.querySelector(target) : null;
	if (src) resize(el, src, run);

	return run;
};
