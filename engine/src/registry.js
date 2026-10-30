/**
 * @justbarely/engine - component registration and lifecycle
 *
 * register() defines blueprints
 * initElement() initializes blueprints
 * refractValue() handles onRefract transforms
 */

import { forwardSync } from './helpers/sync';
import { registerCleanup, setCleanupOwner } from './helpers/cleanup';
import { getComponentName, els } from './helpers/elements';
import { setAttrVar } from './helpers/attr';
import { emit } from './helpers/emit';
import { initComponent } from './mutation';

// Keeper of the keys for all components
export const Registry = new Map();

// True once Barely.init() has run, so register() can init pre-existing markup.
let initialized = false;
export const markInitialized = () => {
	initialized = true;
};

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
 *   onChange(attr, fn)  - fn(el, value, previous); undefined on init, null if
 *                         the attr didn't exist before the write
 *   onRefract(attr, fn) - transforms a value before it hits its CSS var
 *   onChildUpdate(fn)   - runs when watchChildren children change
 */
export function register(
	name,
	{ watch = [], refract = [], watchChildren = null } = {},
) {
	// A re-register merges config into the existing blueprint instead of
	// replacing it, so addons and separate modules can add behavior.
	if (Registry.has(name)) {
		const blueprint = Registry.get(name);
		blueprint.watch = [
			...new Set([...blueprint.watch, ...watch, ...refract]),
		];
		if (refract.length)
			blueprint.refract = [
				...new Set([...blueprint.refract, ...refract]),
			];
		if (watchChildren) blueprint.watchChildren = watchChildren;
		return hooks(blueprint);
	}

	// Refracted attributes have to be watched, so merge them and dedupe
	const blueprint = {
		watch: [...new Set([...watch, ...refract])],
		refract: [...refract],
		refractMap: {},
		watchChildren,
		changes: {},
		onMount: [],
		onChildUpdate: [],
	};
	Registry.set(name, blueprint);

	// If the engine is already running, the startup scan already passed by any
	// existing markup for this name. Defer so hooks added synchronously after
	// register() are in place, then init those elements.
	if (initialized) {
		Promise.resolve().then(() => {
			els(document, `[data-component="${name}"]`).forEach((el) =>
				initComponent(el, Registry),
			);
		});
	}

	return hooks(blueprint);
}

const hooks = (blueprint) => ({
	onChange: (attr, fn) => {
		if (!blueprint.changes[attr]) blueprint.changes[attr] = [];
		blueprint.changes[attr].push(fn);
	},
	onRefract: (attr, fn) => {
		blueprint.refractMap[attr] = fn;
	},
	onMount: (fn) => {
		blueprint.onMount.push(fn);
	},
	onChildUpdate: (fn) => {
		blueprint.onChildUpdate.push(fn);
	},
});

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
 * 1. Resolve watched attributes (refract, changes, data-sync)
 * 2. Set instance data-refract vars
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
			setAttrVar(el, key, refractValue(blueprint, key, val));

		// undefined = the init pass. null is reserved for "attr didn't exist".
		if (blueprint.changes[key])
			blueprint.changes[key].forEach((fn) => fn(el, val, undefined));

		forwardSync(el, key, val);
	});

	// Non-component data-refract, set initial CSS vars, forward sync
	const instanceRefract = el.dataset.refract?.split(/\s+/) ?? [];
	instanceRefract.forEach((key) => {
		const val = el.getAttribute(key);
		if (val === null) return;
		setAttrVar(el, key, val);
		forwardSync(el, key, val);
	});

	const pending = [];
	blueprint.onMount.forEach((mount) => {
		const result = setCleanupOwner(el, () => mount(el));
		if (typeof result === 'function') registerCleanup(el, result);
		else if (result && typeof result.then === 'function')
			pending.push(result);
	});

	// Async mounts: data-ready is immediate, data-status tracks the async state
	// so skeletons can key off [data-status="loading"].
	if (pending.length) {
		el.setAttribute('data-status', 'loading');
		Promise.allSettled(pending).then((results) => {
			if (!el.isConnected) return;
			el.setAttribute(
				'data-status',
				results.some((r) => r.status === 'rejected')
					? 'error'
					: 'success',
			);
			results.forEach((r) => {
				if (r.status === 'fulfilled' && typeof r.value === 'function')
					registerCleanup(el, r.value);
				else if (r.status === 'rejected')
					console.error('[barely] onMount rejected:', r.reason);
			});
		});
	}

	// Set up childList MO if the component registered onChildUpdate. watchChildren
	// names the target selector; absent or true means the root itself.
	if (blueprint.onChildUpdate.length) {
		const target =
			!blueprint.watchChildren || blueprint.watchChildren === true
				? el
				: el.querySelector(blueprint.watchChildren);
		if (target) {
			const mo = new MutationObserver(() =>
				blueprint.onChildUpdate.forEach((fn) => fn(el)),
			);
			mo.observe(target, { childList: true });
			registerCleanup(el, () => mo.disconnect());
		}
	}

	// Anti-FOUC - mark ready after all init work is done
	el.setAttribute('data-ready', '');

	emit(el, 'barely:mount', { name: getComponentName(el) });
};
