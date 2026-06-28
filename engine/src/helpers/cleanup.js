/**
 * @justbarely/engine - teardown system
 *
 * This is used everywhere — onMount returns, DOM removal (mutation.js), event
 * listeners (events.js)
 *
 * This is how we avoid leaks without having to think about it
 */

/** WeakMap gives us automatic cleanup */
const Cleanups = new WeakMap();

/** Stores a cleanup function tied to a DOM element */
export const registerCleanup = (el, fn) => {
	if (!Cleanups.has(el)) Cleanups.set(el, new Set());
	Cleanups.get(el).add(fn);
};

/** Fires all those cleanups stored on an element and delete them */
export const runCleanup = (el) => {
	Cleanups.get(el)?.forEach((fn) => fn());
	Cleanups.delete(el);
};
