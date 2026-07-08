/**
 * @justbarely/engine - event delegation (pooled)
 *
 * Instead of individual event listeners on every element, we use a global
 * listener on the window and a pool of handlers for each event type (click,
 * scroll, etc). This is more performant (less is more am I right?), and it
 * means you don't have to think about removing listeners when their elements
 * are removed.
 *
 * Works for all events that you would call with addEventListener (but hey,
 * there's also nothing stopping you from using addEventListener if you want).
 */

import { registerCleanup } from './cleanup';

const pools = new Map(); // store event handler sets by event type
const activeGlobals = new Set(); // check which events are already on window

// Get or create the handler set for a given event type
const getPool = (event) => {
	if (!pools.has(event)) pools.set(event, new Set());
	return pools.get(event);
};

// Create the one global listener on window for this event type
const setupGlobalListener = (event, pool) => {
	activeGlobals.add(event);
	window.addEventListener(event, (e) => {
		for (const handler of pool) handler(e);
	});
};

/**
 * listen() — one import to rule them all ("them" being your events)
 *
 * If you pass a selector, it uses closest() to scope it to the root so only
 * events from inside the component fire the handler
 *
 * Cleanup will remove the handler from the pool but it keeps the global listener
 * alive so any other components using it don't break
 */
export const listen = (root, event, handler, selector) => {
	const pool = getPool(event);
	const wrapped = (e) => {
		const target = e.target.closest(selector);
		if (!target || !root.contains(target)) return;

		// Don't handle events from nested components (only when root IS one)
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
