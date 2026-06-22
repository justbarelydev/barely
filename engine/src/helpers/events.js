/**
 * @justbarely/engine - event delegation (pooled)
 *
 * Single global listener per event type
 * No per-element addEventListener - everything passes through window
 *
 * listen(root, event, handler, selector?)
 * 	Without selector: handler(e) - direct binding
 * 	With selector: handler(e, matchedTarget) - delegated via closest() [data-component]
 *
 * Returns a cleanup function. Auto-registers with Cleanups via root element.
 */

import { registerCleanup } from './cleanup';

const pools = new Map(); // store handler sets by event type
const activeGlobals = new Set(); // check which events are already on window

/** Get or create handler pool for an event type */
const getPool = (event) => {
	if (!pools.has(event)) pools.set(event, new Set());
	return pools.get(event);
};

/** Set up one global window listener per event type */
const setupGlobalListener = (event, pool) => {
	activeGlobals.add(event);
	window.addEventListener(event, (e) => {
		for (const handler of pool) handler(e);
	});
};

/**
 * listen() is the efficient helper for all events
 *  - pooled and placed on window
 *  - auto-cleanup
 *
 * Completely optional, you can addEventListener wherever you want
 */
export const listen = (root, event, handler, selector) => {
	const pool = getPool(event);
	const wrapped = (e) => {
		const target = e.target.closest(selector);

		if (target && root.contains(target)) handler(e, target);
	};
	/** Keep a reference to this handler so cleanup can remove it from the pool later */
	const _handler = selector ? wrapped : handler;

	pool.add(_handler);

	if (!activeGlobals.has(event)) setupGlobalListener(event, pool);

	/**
	 * Remove handler from the pool only, not the global window listener.
	 * Since it's shared by all listen() calls for this event type, we want to
	 * keep it on the window to prevent breaking other components using it.
	 *
	 * An empty pool is basically free: listener fires but doesn't iterate anything.
	 */
	const cleanup = () => pool.delete(_handler);
	registerCleanup(root, cleanup);
	return cleanup;
};
