import { registerCleanup } from './cleanup';
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
 * One IntersectionObserver per config, shared across elements. The callback
 * receives a single IntersectionObserverEntry for the element you observed so
 * you don't need to dig through an array.
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
					config.fn(entry);
					if (config.once)
						IOPool.get(config.key)?.unobserve(entry.target);
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
 * resize() — Pooled ResizeObserver, auto-cleanup.
 *
 * RO doesn't NEED pooling, but it doesn't hurt! Like elsewhere, cleanup is
 * auto-registered so you don't need to worry about it.
 *
 * The callback receives a single ResizeObserverEntry for the element you're
 * watching. This is a slight deviation from native, but it's consistent with
 * observe() and avoids having to dig through arrays.
 */
export const resize = (root, el, fn) => {
	const key = 'default';

	// If the element is already being observed, just swap the callback
	if (ROCallbacks.has(el)) {
		ROCallbacks.set(el, fn);
		registerCleanup(root, () => {
			ROPool.get(key)?.unobserve(el);
			ROCallbacks.delete(el);
		});
		return;
	}

	// If there's no observer yet create it
	if (!ROPool.has(key)) {
		ROPool.set(
			key,
			new ResizeObserver((entries) => {
				for (const entry of entries) {
					const cb = ROCallbacks.get(entry.target);
					if (cb) cb(entry);
				}
			}),
		);
	}

	ROCallbacks.set(el, fn);
	ROPool.get(key).observe(el);

	registerCleanup(root, () => {
		ROPool.get(key)?.unobserve(el);
		ROCallbacks.delete(el);
	});
};
