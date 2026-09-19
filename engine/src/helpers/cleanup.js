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

// Component root currently being mounted (or null)
let currentOwner = null;

/**
 * When using listen() on an element, that element's listeners are automatically
 * cleaned up when the element leaves the DOM. But if you use listen() on the
 * document or window this doesn't work because document/window never leave.
 * To fix this, we set a listener owner instead of relying on the element that
 * the listener is attached to, so all listeners can be torn down properly.
 *
 * When a component is mounting, setCleanupOwner() is called with the component
 * root and a function that mounts the component. Any cleanups registered during
 * that function will be registered on the component root, and will fire when the
 * component root leaves the DOM.
 *
 * @param {Element} owner - component root to register cleanups on
 * @param {Function} fn - function to run with the owner set
 * @returns {*} whatever fn returns
 */
export const setCleanupOwner = (owner, fn) => {
	const prev = currentOwner;
	currentOwner = owner;
	try {
		return fn();
	} finally {
		currentOwner = prev;
	}
};

// Current cleanup owner
export const getCleanupOwner = () => currentOwner;
