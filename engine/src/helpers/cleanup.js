/**
 * Cleanup system - WeakMap teardown for elements
 *
 * registerCleanup(el, fn) stores a teardown function tied to an element
 * runCleanup(el) fires all teardowns, remove from WeakMap
 *
 * Multiple teardowns per element via Set
 * Auto garbage collection when elements are collected - auto cleanup
 *
 * Used by:
 *   - init.js (onMount() returns)
 *   - mutation.js (DOM node removal)
 *   - events.js (listeners)
 */

const Cleanups = new WeakMap();

export const registerCleanup = (el, fn) => {
	if (!Cleanups.has(el)) Cleanups.set(el, new Set());
	Cleanups.get(el).add(fn);
};

export const runCleanup = (el) => {
	Cleanups.get(el)?.forEach((fn) => fn());
	Cleanups.delete(el);
};
