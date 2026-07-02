/**
 * @justbarely/engine - IntersectionObserver (pooled)
 *
 * Scans the DOM and inits lazy components when they scroll into view
 *
 * Uses the observe() helper for pooling - one IO per unique opts config because
 * that's what IO demands of us and because it's more performant to add to an
 * existing IO than to create a new one
 *
 * lazy: true 			— wait for first intersection
 * lazy: { rootMargin }	— wait with custom IO options
 * lazy: false/undefined - init immediately
 */

import { COMPONENT } from './constants';
import { getComponentName } from './helpers/attr';
import { children } from './helpers/children';
import { initElement } from './init';
import { attachAttrMO } from './mutation';
import { observe } from './helpers/observe';

/** Scan the DOM for registered components */
export const initIntersection = (Registry) => {
	children(document, COMPONENT).forEach((el) => {
		const blueprint = Registry.get(getComponentName(el));

		/** Not lazy — init and attach MO immediately */
		if (!blueprint?.lazy) {
			initElement(el, Registry);
			attachAttrMO(el, blueprint);
			return;
		}

		/** Lazy — wait for first intersection and init once */
		const opts = typeof blueprint.lazy === 'object' ? blueprint.lazy : {};
		observe(
			el,
			(entries) => {
				const entry = entries.find((e) => e.isIntersecting);
				if (!entry) return;
				const blueprint = Registry.get(getComponentName(entry.target));
				initElement(entry.target, Registry);
				if (blueprint) attachAttrMO(entry.target, blueprint);
			},
			{ ...opts, once: true },
		);
	});
};
