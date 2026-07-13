/**
 * @justbarely/engine - event delegation
 *
 * Instead of individual event listeners on every element, we can use a global
 * listener on the window and then pool handlers by event type. Why? Because like
 * the old addage says, "less is more" (literally in this case).
 *
 * It also means you don't have to worry about removing listeners when elements
 * get removed. Cleanup is auto-registered.
 *
 * Bubbling events (click, keydown, etc) share one global listener on the window.
 *
 * Non-bubbling events (scroll, focus, etc) just get a direct listener on the
 * element like they normally would. Barely handles them so you can use listen()
 * for everything.
 *
 * You can always use addEventListener, this is just for convenience.
 *
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

// Non-bubbling events - direct listener on root, pool ignores them
// This way you can use listen() everywhere without thinking about bubbling
const NON_BUBBLING = new Set([
	'scroll',
	'focus',
	'blur',
	'mouseenter',
	'mouseleave',
	'load',
	'error',
	'resize',
]);

/**
 * listen() — one function for everything ("them" being your events)
 *
 * If you pass a selector, it uses closest() to scope it to the root so only
 * events from inside the component fire the handler
 *
 * Cleanup will remove the handler from the pool but it keeps the global listener
 * alive so any other components using it don't break
 */
export const listen = (root, event, handler, selector) => {
	// Ignore pooling if the event doesn't bubble
	if (NON_BUBBLING.has(event)) {
		const _handler = selector
			? (e) => {
					const target = e.target.closest(selector);
					if (!target || !root.contains(target)) return;
					handler(e, target, root);
				}
			: (e) => handler(e, root, root);

		root.addEventListener(event, _handler);
		const cleanup = () => root.removeEventListener(event, _handler);
		registerCleanup(root, cleanup);
		return cleanup;
	}

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
