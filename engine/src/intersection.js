/**
 * @justbarely/engine - IntersectionObserver (pooled)
 *
 * Pooled IO keyed by JSON-stringified opts
 * One observer per unique config - shared by all elements
 *
 * lazy: true - observe before init
 * lazy: { rootMargin: '200px' } - custom IO options
 *
 * Elements are unobserved after first intersection
 * Non-lazy components init immediately
 */

import { COMPONENT } from './constants';
import { componentName } from './helpers/attr';
import { initElement } from './init';

export const initIntersection = (Registry) => {
	/** Pool of IO instances keyed by JSON.stringify(opts) */
	const IOs = new Map();

	const observe = (el, opts = {}) => {
		const key = JSON.stringify(opts);
		/** Create a new IO if this config hasn't been seen before */
		if (!IOs.has(key)) {
			IOs.set(
				key,
				new IntersectionObserver((entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							initElement(entry.target, Registry);
							/** One-shot — stop watching after first intersection */
							IOs.get(key).unobserve(entry.target);
						}
					});
				}, opts),
			);
		}
		IOs.get(key).observe(el);
	};

	document.querySelectorAll(COMPONENT).forEach((el) => {
		const blueprint = Registry.get(componentName(el));
		if (!blueprint?.lazy) {
			initElement(el, Registry);
			return;
		}
		const opts = typeof blueprint.lazy === 'object' ? blueprint.lazy : {};
		observe(el, opts);
	});
};
