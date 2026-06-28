/**
 * @justbarely/engine - pooled IntersectionObserver and ResizeObserver
 */

/**
 * Map: for storing observers by a stringified config key so we can look them up
 * and reuse them. Strings work as Map keys and Map.has/get/set is cleaner than
 * using a plain object
 *
 * WeakMap: for callbacks keyed to elements. When elements are removed from the
 * DOM and GC'd, the WeakMap entry goes with it
 *
 * No leaks and auto cleanup (sunglasses emoji)
 *
 * Map + WeakMap is a common pooling pattern (I learned) and you'll see that
 * it's used throughout the engine layer
 */
const IOPool = new Map();
const IOCallbacks = new WeakMap();

const ROPool = new Map();
const ROCallbacks = new WeakMap();

/**
 * Watches for an element to scroll into view using a pooled IO
 * One observer per IO config and shared by all elements (because, again, you
 * need a new IO if you want different options)
 *
 * opts accepts all IO options plus:
 *   once: true - which fires once, then unobserves (default: false)
 *
 * Returns a cleanup function
 * Use this in onMount, or with registerCleanup for auto-teardown
 * (because why should you have to remember to teardown every time?)
 */
export const observe = (el, fn, opts = {}) => {
	const { once, ...ioOpts } = opts;
	const key = JSON.stringify(ioOpts);

	/** If you're already observing with these opts — just update the callback */
	if (IOCallbacks.has(el)) {
		IOCallbacks.set(el, fn);
		return () => {
			IOPool.get(key)?.unobserve(el);
			IOCallbacks.delete(el);
		};
	}

	/** If the key doesn't exist in the pool, add it */
	if (!IOPool.has(key)) {
		IOPool.set(
			key,
			new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					const cb = IOCallbacks.get(entry.target);
					if (cb) cb(entry);
					/** One-shot — unobserve after first intersection */
					if (once) IOPool.get(key)?.unobserve(entry.target);
				});
			}, ioOpts),
		);
	}

	IOCallbacks.set(el, fn);
	IOPool.get(key).observe(el);

	/** Cleanup */
	return () => {
		IOPool.get(key)?.unobserve(el);
		IOCallbacks.delete(el);
	};
};

/**
 * Watches for a component resizing using a pooled RO
 * (RO configs don't usually change so it's a single pool, unlike IO)
 *
 * Returns a cleanup function
 * Same as observe - use in onMount, or with registerCleanup for auto-teardown
 *
 * Useful for responsive components like carousel to show/hide arrows, or
 * anything that needs to recalculate on resize
 *
 * RO is better and cooler than window.addEventListener('resize')
 * because it's scoped to the element you actually care about
 */
export const resize = (el, fn) => {
	const key = 'default';

	/** Again if it's already being observed, just update the callback */
	if (ROCallbacks.has(el)) {
		ROCallbacks.set(el, fn);
		return () => {
			ROPool.get(key)?.unobserve(el);
			ROCallbacks.delete(el);
		};
	}

	/** If it's not being observed, assign to the pool and init the observer */
	if (!ROPool.has(key)) {
		ROPool.set(
			key,
			new ResizeObserver((entries) => {
				entries.forEach((entry) => {
					const cb = ROCallbacks.get(entry.target);
					if (cb) cb(entry);
				});
			}),
		);
	}

	ROCallbacks.set(el, fn);
	ROPool.get(key).observe(el);

	/** Cleeeeeeean */
	return () => {
		ROPool.get(key)?.unobserve(el);
		ROCallbacks.delete(el);
	};
};
