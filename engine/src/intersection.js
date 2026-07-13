/**
 * @justbarely/engine - IntersectionObserver (pooled)
 *
 * Writing IntersectionObservers is tedious and repetitive, and you have to
 * remember to cleanup every time, so why not use this helper instead?
 *
 * Since it's more performant to add elements to an existing IO than it is to
 * add a new IO per-element, we pool all elements with matching options together.
 *
 * One IO per unique { opts } config because that's what IO demands of us.
 *
 * Two different ways to add IO:
 * 1. When registering components with `lazy`
 * 	Uses observe() and only checks isIntersecting but allows for custom { opts }
 * 		lazy: true 			— wait for first intersection
 * 		lazy: { rootMargin }	— wait with custom IO options
 * 		lazy: false/undefined - init immediately
 *
 * 2. Anywhere else with the observe() helper
 * 	This one allows custom options AND returns the normal callback so you can
 * 	act on it however you want.
 */

import { COMPONENT } from './constants';
import { getComponentName } from './helpers/attr';
import { children } from './helpers/children';
import { initElement } from './init';
import { attachAttrMO } from './mutation';
import { observe } from './helpers/observe';

/** Find every [data-component], init non-lazy ones immediately, and set up
 *  IntersectionObservers for lazy ones. You can also use observe() anywhere
 *  you want and get the same pooling and auto-cleanup. */
export const initIntersection = (Registry) => {
	children(document, COMPONENT).forEach((el) => {
		const blueprint = Registry.get(getComponentName(el));

		// Not lazy — init and attach MO immediately
		if (!blueprint?.lazy) {
			attachAttrMO(el, blueprint);
			initElement(el, Registry);
			return;
		}

		// Lazy — wait for first intersection and init once
		const opts = typeof blueprint.lazy === 'object' ? blueprint.lazy : {};
		observe(
			el,
			(entry) => {
				// Only react when the element enters the viewport
				if (!entry.isIntersecting) return;
				const blueprint = Registry.get(getComponentName(entry.target));
				if (blueprint) attachAttrMO(entry.target, blueprint);
				initElement(entry.target, Registry);
			},
			{ ...opts, once: true },
		);
	});
};
