/**
 * @justbarely/engine - element initialization
 *
 * Runs when a component element first appears in the DOM:
 * 	1. Apply watched attrs - effects, refract (CSS vars), sync
 * 	2. Call onMount() if defined, register it for teardown
 *  3. Mark element as ready (data-ready attr)
 *
 * Called by mutation.js (new elements) and intersection.js (lazy init)
 */

import { getAttr, getComponentName, setCssVar } from './helpers/attr';
import { forwardSync } from './helpers/sync';
import { registerCleanup } from './helpers/cleanup';

export const initElement = (el, Registry) => {
	const blueprint = Registry.get(getComponentName(el));
	if (!blueprint) return;

	blueprint.watch.forEach((key) => {
		const val = getAttr(el, key);
		if (val === null) return;

		/** Set CSS var inline style if refract is populated */
		if (blueprint.refract?.includes(key)) setCssVar(el, key, val);
		/** Effect gets null for oldValue on first run */
		if (blueprint.effects[key]) blueprint.effects[key](el, val, null);
		/** Update attr and CSS var on subscribers */
		forwardSync(el, key, val);
	});

	if (blueprint.onMount) {
		const teardown = blueprint.onMount(el);
		if (typeof teardown === 'function') registerCleanup(el, teardown);
	}

	/** Set [data-ready] without a value (boolean presence) */
	el.setAttribute('data-ready', '');
};
