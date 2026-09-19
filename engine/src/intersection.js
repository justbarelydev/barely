/**
 * @justbarely/engine - lazy component init
 */

import { COMPONENT } from './constants';
import { getComponentName, children } from './helpers/elements';
import { initElement } from './registry';
import { attachAttrMO } from './mutation';
import { observe } from './helpers/observe';

/**
 * Init every [data-component] immediately, unless [data-lazy] is present -
 * then wait for the first intersection and init once.
 *
 * For custom IO options, skip [data-lazy] and use observe() directly.
 *
 * @param {Map} Registry
 */
export const initIntersection = (Registry) => {
	children(document, COMPONENT).forEach((el) => {
		const blueprint = Registry.get(getComponentName(el));
		if (!blueprint) return;

		// Not lazy - init and attach MO immediately
		if (!el.hasAttribute('data-lazy')) {
			attachAttrMO(el, blueprint);
			initElement(el);
			return;
		}

		// Lazy - wait for first intersection and init once
		observe(
			el,
			(entry) => {
				if (!entry.isIntersecting) return;
				const blueprint = Registry.get(getComponentName(entry.target));
				if (blueprint) attachAttrMO(entry.target, blueprint);
			initElement(entry.target);
			},
			{ once: true },
		);
	});
};
