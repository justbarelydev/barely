/**
 * @justbarely/engine - component registration and lifecycle
 *
 * register() defines blueprints
 * initElement() initializes blueprints
 * refractValue() handles onRefract transforms
 */

import { forwardSync } from './helpers/sync';
import { registerCleanup } from './helpers/cleanup';
import { getComponentName } from './helpers/elements';
import { refract } from './helpers/attr';
import { emit } from './helpers/emit';

// Keeper of the keys for all components
export const Registry = new Map();

/**
 * Register components to hook them into the engine and to get those
 * sweet sweet lifecycle methods
 *
 * onMount: fires immediately or when scrolled into view if lazy:true
 * onEffect: fires on watched attribute changes
 * onRefract: transform attribute values before they hit CSS vars
 * refract: copies attribute values to inline CSS variables
 */
export function register(
	name,
	{ watch = [], refract = [], lazy = false, watchChildren = null } = {},
) {
	// Auto-watch refracted attributes
	const allWatched = [...new Set([...watch, ...refract])];
	const blueprint = {
		watch: allWatched,
		refract,
		refractMap: {},
		lazy,
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
 * Fires effects, sets CSS vars for refracted attrs, forwards to data-sync
 * subscribers, calls onMount, and sets [data-ready].
 */
export const initElement = (el, Registry) => {
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
		const teardown = blueprint.onMount(el);
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

	// Anti-FOUC — mark ready after all init work is done
	el.setAttribute('data-ready', '');

	emit(el, 'barely:mount', { name: getComponentName(el) });
};
