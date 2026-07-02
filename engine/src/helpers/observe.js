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
const IOEntries = new WeakMap(); // el → { fn, once, key }

const ROPool = new Map();
const ROCallbacks = new WeakMap();

/**
 * Pooled IntersectionObserver — watches elements enter/leave/exist in viewport.
 *
 * One observer per IO config, shared across elements.
 * Callback receives the raw entries array — no opinion on isIntersecting.
 *
 * opts accepts all IO options plus:
 *   once: true — fire once, then unobserve (per-element, not per-pool)
 *
 * Returns a cleanup function.
 */
export const observe = (el, fn, opts = {}) => {
	const { once = false, ...ioOpts } = opts;
	const key = JSON.stringify(ioOpts);

	const prev = IOEntries.get(el);
	if (prev && prev.key !== key) IOPool.get(prev.key)?.unobserve(el);

	if (!IOPool.has(key)) {
		IOPool.set(
			key,
			new IntersectionObserver((entries) => {
				for (const entry of entries) {
					const rider = IOEntries.get(entry.target);
					if (!rider) continue;
					rider.fn(entries);
					if (rider.once) IOPool.get(rider.key)?.unobserve(entry.target);
					break; // fn called once with full array
				}
			}, ioOpts),
		);
	}

	IOEntries.set(el, { fn, once, key });
	IOPool.get(key).observe(el);

	return () => {
		const rider = IOEntries.get(el);
		IOPool.get(rider?.key ?? key)?.unobserve(el);
		IOEntries.delete(el);
	};
};

/**
 * Pooled ResizeObserver — watches element size changes.
 * Callback receives the raw entries array — no filtering.
 *
 * Returns a cleanup function.
 */
export const resize = (el, fn) => {
	const key = 'default';

	if (ROCallbacks.has(el)) {
		ROCallbacks.set(el, fn);
		return () => {
			ROPool.get(key)?.unobserve(el);
			ROCallbacks.delete(el);
		};
	}

	if (!ROPool.has(key)) {
		ROPool.set(
			key,
			new ResizeObserver((entries) => {
				for (const entry of entries) {
					const cb = ROCallbacks.get(entry.target);
					if (cb) cb(entries);
					break; // fn called once with full array
				}
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
