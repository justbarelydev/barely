/**
 * @justbarely/engine - component initialization
 *
 * This runs when a component first appears in the DOM - either on page load
 * or when it's scrolled into view if lazy: true - and does the following:
 * 	1. Fires onEffect for each watched attribute with a value
 *  2. Adds CSS vars to the inline style attr for refracted attributes
 *  3. Forwards watched attrs and refracted CSS vars to all data-sync subscribers
 * 	4. Calls onMount() if defined and registers it for teardown
 *  5. Sets [data-ready] on the root element (data-component)
 *
 * mutation.js handles dynamically added elements
 * intersection.js handles lazy components
 */

import { forwardSync } from './helpers/sync';
import { registerCleanup } from './helpers/cleanup';
import { getAttr, getComponentName, setCssVar } from './helpers/attr';

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

	/** If the component uses onMount, register it for teardown */
	if (blueprint.onMount) {
		const teardown = blueprint.onMount(el);
		if (typeof teardown === 'function') registerCleanup(el, teardown);
	}

	/** Add [data-ready] so you can do cool transitions and stuff */
	el.setAttribute('data-ready', '');
};
