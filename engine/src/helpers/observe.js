/**
 * @justbarely/engine - pooled IntersectionObserver and ResizeObserver
 *
 * Pooling comes up a few times in Barely because it rocks. For observers,
 * if the options object matches an existing observer's options, then it just
 * adds the new elements to the existing observer.
 *
 * Less observers, MAXIMUM PERFORMANCE.
 */

import { registerCleanup, getCleanupOwner } from './cleanup';

const IOPool = new Map(); // shared observers by config key
const IOEntries = new WeakMap(); // el → { fn, once, key }

const ROPool = new Map();
const ROCallbacks = new WeakMap();

/**
 * Helper for IntersectionObserver with pooling and auto cleanup.
 *
 * One IntersectionObserver per config, shared across elements. The callback
 * receives a single IntersectionObserverEntry for the element you observed so
 * you don't need to dig through an array.
 *
 *   once: true - fire once, then stop watching (per-element, not per-pool)
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
					if (config.once) {
						IOPool.get(config.key)?.unobserve(entry.target);
						IOEntries.delete(entry.target);
					}
				}
			}, ioOpts),
		);
	}

	IOEntries.set(el, { fn, once, key });
	IOPool.get(key).observe(el);

	const off = () => {
		const config = IOEntries.get(el);
		IOPool.get(config?.key ?? key)?.unobserve(el);
		IOEntries.delete(el);
	};
	// Auto-cleanup like listen(): owned by the mounting component when called
	// inside onMount, otherwise keyed on the observed element itself.
	registerCleanup(getCleanupOwner() ?? el, off);
	return off;
};

/**
 * A callback that resizes the element it's watching never stops. It fires again
 * the next frame, forever. Deferring with rAF stops the browser from
 * complaining about it, so we warn.
 *
 * One warning per element, and only after a long run of deliveries with no gap.
 */
const RO_LOOP_FRAMES = 600; // consecutive deliveries, ~10s at 60fps
const ROStreak = new WeakMap(); // el -> { streak, at, warned }

const checkLoop = (el) => {
	if (ROStreak.get(el)?.warned) return;

	const now = performance.now();
	const prev = ROStreak.get(el);
	const streak = prev && now - prev.at < 100 ? prev.streak + 1 : 1;

	if (streak < RO_LOOP_FRAMES) {
		ROStreak.set(el, { streak, at: now });
		return;
	}

	console.warn(
		'[barely] resize(): this callback has run on every frame for ~10s without settling. If it changes the size of the element it watches, that is a loop nothing can break.',
		el,
	);
	ROStreak.set(el, { streak, at: now, warned: true });
};

/**
 * Pooled ResizeObserver with auto-cleanup.
 *
 * RO doesn't NEED pooling, but it doesn't hurt! Like everywhere else, cleanup
 * is auto-registered so you don't have to worry about it.
 *
 * The callback gets one ResizeObserverEntry for the element you're watching,
 * not an array. Slightly different from native, same shape as observe().
 *
 * Callbacks always run on the next frame, never while the browser is handing
 * out sizes. That's not decoration: a callback that writes to the DOM mid-loop
 * makes the browser redraw while it's still working, and it says so
 * ("ResizeObserver loop completed with undelivered notifications"). One frame
 * is the soonest a callback can run without that, so there is no switch to opt
 * out. Need same-frame timing? Own a ResizeObserver.
 *
 * What it can't fix: a callback that resizes the element it's watching. That
 * loops once per frame forever, and gets one console warning (see checkLoop).
 *
 * One callback per element - calling this twice for the same element swaps the
 * callback instead of adding a second observer.
 *
 * If no element is given, observes the root itself - resize(root, fn).
 */
export const resize = (root, el, fn) => {
	// Allow resize(root, fn) - el defaults to root
	if (typeof el === 'function') {
		fn = el;
		el = root;
	}

	const key = 'default';

	// If the element is already being observed, just swap the callback
	if (ROCallbacks.has(el)) {
		ROCallbacks.set(el, fn);
		registerCleanup(getCleanupOwner() ?? root, () => {
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
				// One frame later the delivery is over, so writes are safe.
				// Writing mid-delivery is what triggers "ResizeObserver loop
				// completed with undelivered notifications" - see resize().
				requestAnimationFrame(() => {
					for (const entry of entries) {
						const cb = ROCallbacks.get(entry.target);
						if (!cb) continue;
						checkLoop(entry.target);
						cb(entry);
					}
				});
			}),
		);
	}

	ROCallbacks.set(el, fn);
	ROPool.get(key).observe(el);

	registerCleanup(getCleanupOwner() ?? root, () => {
		ROPool.get(key)?.unobserve(el);
		ROCallbacks.delete(el);
	});
};
