/**
 * @justbarely/engine - pooled IntersectionObserver and ResizeObserver
 *
 * Pooling comes up a few times in Barely because it rules. For observers,
 * if the options object matches an existing observer's options, then it just
 * adds the new elements to the existing observer.
 *
 * Less observers, MAXIMUM PERFORMANCE.
 */

const IOPool = new Map(); // shared observers by config key
const IOEntries = new WeakMap(); // el → { fn, once, key }

const ROPool = new Map();
const ROCallbacks = new WeakMap();

/**
 * observe() — helper for IntersectionObserver with pooling and auto cleanup.
 *
 * One observer per config, shared across elements. Callbacks come back the same
 * as they would with a normal IO, so you can decide what happens when it
 * fires.
 *
 *   once: true — fire once, then stop watching (per-element, not per-pool)
 */
export const observe = (el, fn, opts = {}) => {
	const { once = false, ...ioOpts } = opts;
	const key = JSON.stringify(ioOpts);

	// If we're re-observing with a different config, leave the old pool first
	const prev = IOEntries.get(el);
	if (prev && prev.key !== key) IOPool.get(prev.key)?.unobserve(el);

	// Only create a new observer if we don't have one for this config yet
	if (!IOPool.has(key)) {
		IOPool.set(
			key,
			new IntersectionObserver((entries) => {
				for (const entry of entries) {
					const config = IOEntries.get(entry.target);
					if (!config) continue;
					config.fn(entries);
					if (config.once)
						IOPool.get(config.key)?.unobserve(entry.target);
					break;
				}
			}, ioOpts),
		);
	}

	IOEntries.set(el, { fn, once, key });
	IOPool.get(key).observe(el);

	return () => {
		const config = IOEntries.get(el);
		IOPool.get(config?.key ?? key)?.unobserve(el);
		IOEntries.delete(el);
	};
};

/**
 * resize() — helper for ResizeObserver with auto cleanup.
 *
 * Using a single pool here because RO configs are almost always the same.
 * Like observe(), the callback comes back the same as it would from a normal RO.
 */
export const resize = (el, fn) => {
	const key = 'default';

	// If the element is already being observed, just swap the callback
	if (ROCallbacks.has(el)) {
		ROCallbacks.set(el, fn);
		return () => {
			ROPool.get(key)?.unobserve(el);
			ROCallbacks.delete(el);
		};
	}

	// If there's no observer yet create it
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

	return () => {
		ROPool.get(key)?.unobserve(el);
		ROCallbacks.delete(el);
	};
};
