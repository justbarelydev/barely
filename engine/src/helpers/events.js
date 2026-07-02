/**
 * @justbarely/engine - event delegation (pooled)
 *
 * Single global listener per event type (click, scroll, etc)
 * By pooling events by type on the window, we avoid creating a new listener on
 * every single element every single time.
 *
 * Returns a cleanup fn (you don't need to call it, it auto-registers with Cleanups)
 * You can skip this and use addEventListener if you want.
 */

import { registerCleanup } from './cleanup';

const pools = new Map(); // store handler sets by event type
const activeGlobals = new Set(); // check which events are already on window

/** Get or create the handler set for a given event type */
const getPool = (event) => {
	if (!pools.has(event)) pools.set(event, new Set());
	return pools.get(event);
};

/** Create the one global listener on window for this event type */
const setupGlobalListener = (event, pool) => {
	activeGlobals.add(event);
	window.addEventListener(event, (e) => {
		for (const handler of pool) handler(e);
	});
};

/**
 * listen() — this is the way to get performant listeners with automatic cleanup
 *
 * If you pass a selector, it uses closest() to scope it to the root so only
 * events from inside the component fire the handler
 *
 * Cleanup will remove the handler from the pool but it keeps the global listener
 * alive so other components that use it don't break
 *
 * Basically if you want performant events with auto-cleanup, listen() is your
 * friend
 */
export const listen = (root, event, handler, selector) => {
	const pool = getPool(event);
	const wrapped = (e) => {
		const target = e.target.closest(selector);
		if (!target || !root.contains(target)) return;

		/** Don't handle events from nested components (only when root IS one) */
		if (root.getAttribute) {
			const owner = target.closest('[data-component]');
			if (owner && owner !== root) return;
		}

		handler(e, target, root);
	};
	const _handler = selector ? wrapped : handler;

	pool.add(_handler);

	if (!activeGlobals.has(event)) setupGlobalListener(event, pool);

	const cleanup = () => pool.delete(_handler);
	registerCleanup(root, cleanup);
	return cleanup;
};
