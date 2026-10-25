/**
 * @justbarely/engine - imperative attribute watching
 *
 * Declarative `watch: [...]` in register() covers the static case. `watch()`
 * adds a callback for an attribute from inside onMount (or any code that runs
 * before the observer attaches), so you can add attrs to watch at runtime.
 * Cleanup keyed on the element, like listen().
 */

import { registerCleanup, getCleanupOwner } from './cleanup';

// el -> Map(attr, Set<fn>) - auto GC'd with the element
const Watches = new WeakMap();

export const watch = (el, attr, cb) => {
	let map = Watches.get(el);
	if (!map) Watches.set(el, (map = new Map()));

	let set = map.get(attr);
	if (!set) map.set(attr, (set = new Set()));
	set.add(cb);

	registerCleanup(getCleanupOwner() ?? el, () => {
		set.delete(cb);
		if (set.size === 0) map.delete(attr);
	});
};

// Internal accessors for the mutation observer (not part of the public API)
export const watchCallbacks = (el, attr) => Watches.get(el)?.get(attr);
export const watchAttrs = (el) => [...(Watches.get(el)?.keys() ?? [])];
