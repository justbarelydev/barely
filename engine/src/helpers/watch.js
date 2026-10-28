/**
 * @justbarely/engine - imperative attribute watching
 *
 * Declarative `watch: [...]` in register() covers the "one-time at registration"
 * case. `watch()` adds a callback for an attribute (or an array of attributes)
 * from inside onMount (or any code that runs before the observer attaches)
 * so you can add attrs to watch at runtime. Cleanup keyed on the element.
 *
 * Fires immediately with the current value, then on change. `previous` tells you
 * which kind of call it is:
 *   undefined - the mount report (no previous value yet)
 *   null     - the attribute just appeared
 *   string   - changed from that old value
 * Return early on `previous === undefined` to react to changes only.
 */

import { registerCleanup, getCleanupOwner } from './cleanup';

// el -> Map(attr -> Set<fn>) - auto GC'd with the element
const Watches = new WeakMap();

export const watch = (el, attr, cb) => {
	for (const name of Array.isArray(attr) ? attr : [attr]) {
		let map = Watches.get(el);
		if (!map) Watches.set(el, (map = new Map()));

		let set = map.get(name);
		if (!set) map.set(name, (set = new Set()));
		set.add(cb);

		registerCleanup(getCleanupOwner() ?? el, () => {
			set.delete(cb);
			if (set.size === 0) map.delete(name);
		});

		// Report the current value on subscribe
		const val = el.getAttribute(name);
		if (val != null) cb(el, val, undefined);
	}
};

// Internal accessors for the mutation observer (not part of the public API)
export const watchCallbacks = (el, attr) => Watches.get(el)?.get(attr);
export const watchAttrs = (el) => [...(Watches.get(el)?.keys() ?? [])];
