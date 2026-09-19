/**
 * @justbarely/engine - component registration and lifecycle
 *
 * register() defines blueprints
 * initElement() initializes blueprints
 * refractValue() handles onRefract transforms
 */

import { forwardSync } from './helpers/sync';
import { registerCleanup, setCleanupOwner } from './helpers/cleanup';
import { getComponentName } from './helpers/elements';
import { refract } from './helpers/attr';
import { emit } from './helpers/emit';

// Keeper of the keys for all components
export const Registry = new Map();

/**
 * Register components to hook them into the engine and get those sweet
 * lifecycle methods.
 *
 * Config:
 *   watch          - attributes to watch for changes
 *   refract        - attributes copied to inline CSS vars
 *   watchChildren  - childList selector (or true for the root)
 *
 * Hooks (returned):
 *   onMount(fn)         - runs on init, or first intersection if [data-lazy]
 *   onEffect(attr, fn)  - runs on watched attribute changes
 *   onRefract(attr, fn) - transforms a value before it hits its CSS var
 *   onChildUpdate(fn)   - runs when watchChildren children change
 */
export function register(
	name,
	{ watch = [], refract = [], watchChildren = null } = {},
) {
	// Refracted attributes have to be watched, so merge them and dedupe
	const allWatched = [...new Set([...watch, ...refract])];
	const blueprint = {
		watch: allWatched,
		refract,
		refractMap: {},
		watchChildren,
		effects: {},
		onMount: null,
		onChildUpdate: null,
	};
	Registry.set(name, blueprint);

	return {
		onEffect: (attr, fn) => {
			blueprint.effects[attr] = fn;
		},
		onRefract: (attr, fn) => {
			blueprint.refractMap[attr] = fn;
		},
		onMount: (fn) => {
			blueprint.onMount = fn;
		},
		onChildUpdate: (fn) => {
			blueprint.onChildUpdate = fn;
		},
	};
}

/**
 * Apply onRefract transform for a given attribute, if one is registered
 * (e.g. add a unit to a value: data-offset="12" -> --offset: 12px;)
 *
 * Otherwise return the raw value
 * @param {object} blueprint
 * @param {string} key - attribute name (e.g. 'data-offset-x')
 * @param {string} val - raw attribute value
 * @returns {string}
 */
export const refractValue = (blueprint, key, val) => {
	const fn = blueprint.refractMap?.[key];
	return fn ? fn(val) : val;
};

/**
 * Initialize a component element when it first appears in the DOM.
 * 1. Reconcile watched attributes (refract, effects, data-sync)
 * 2. Set instance data-watch/data-refract vars
 * 3. Run onMount
 * 4. Attach the watchChildren observer
 * 5. Mark [data-ready]
 * 6. Emit barely:mount
 *
 * @param {Element} el - component root element
 */
export const initElement = (el) => {
	const blueprint = Registry.get(getComponentName(el));
	if (!blueprint) return;

	blueprint.watch.forEach((key) => {
		const val = el.getAttribute(key);
		if (val === null) return;

		if (blueprint.refract?.includes(key))
			refract(el, key, refractValue(blueprint, key, val));

		if (blueprint.effects[key]) blueprint.effects[key](el, val, null);

		forwardSync(el, key, val);
	});

	// Non-component watch/refract, set initial CSS vars, forward sync
	const instanceWatch = el.dataset.watch?.split(/\s+/) ?? [];
	const instanceRefract = el.dataset.refract?.split(/\s+/) ?? [];
	const instanceAttrs = [...new Set([...instanceWatch, ...instanceRefract])];

	instanceAttrs.forEach((key) => {
		const val = el.getAttribute(key);
		if (val === null) return;
		if (instanceRefract.includes(key)) refract(el, key, val);
		forwardSync(el, key, val);
	});

	if (blueprint.onMount) {
		const teardown = setCleanupOwner(el, () => blueprint.onMount(el));
		if (typeof teardown === 'function') registerCleanup(el, teardown);
	}

	// Set up childList MO if the component has a watchChildren selector
	if (blueprint.watchChildren && blueprint.onChildUpdate) {
		const target =
			blueprint.watchChildren === true
				? el
				: el.querySelector(blueprint.watchChildren);
		if (target) {
			const mo = new MutationObserver(() => blueprint.onChildUpdate(el));
			mo.observe(target, { childList: true });
			registerCleanup(el, () => mo.disconnect());
		}
	}

	// Anti-FOUC - mark ready after all init work is done
	el.setAttribute('data-ready', '');

	emit(el, 'barely:mount', { name: getComponentName(el) });
};
