/**
 * @justbarely/engine - teardown system
 *
 * Every teardown in the engine funnels through here: onMount return functions,
 * listeners, and observers register their cleanups, and DOM removal fires them.
 *
 * This is how we avoid leaks without having to think about it.
 */

// WeakMap so cleanups are garbage collected with their element
const Cleanups = new WeakMap();

/**
 * Store a cleanup function to run when the element leaves the DOM.
 * Elements can have multiple cleanup functions.
 *
 * @param {Element} el
 * @param {Function} fn
 */
export const registerCleanup = (el, fn) => {
	if (!Cleanups.has(el)) Cleanups.set(el, new Set());
	Cleanups.get(el).add(fn);
};

/**
 * Fire every cleanup stored on an element, then forget it.
 *
 * Called by mutation.js when the element leaves the DOM, which only happens
 * if Barely.init() is running. Without Barely.init, the WeakMap still garbage
 * collects everything with the element, so nothing leaks either way.
 *
 * @param {Element} el
 */
export const runCleanup = (el) => {
	Cleanups.get(el)?.forEach((fn) => fn());
	Cleanups.delete(el);
};
