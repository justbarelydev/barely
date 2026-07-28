/**
 * @justbarely/core — timing utilities
 * Environment-agnostic pure functions
 */

/**
 * Debounce — call fn after ms of inactivity.
 * Each call resets the timer, only the last call in a burst fires.
 *
 * @param {Function} fn
 * @param {number} [ms=150]
 * @returns {Function}
 */
export const debounce = (fn, ms = 150) => {
	let id;
	const debounced = (...args) => {
		clearTimeout(id);
		id = setTimeout(() => fn(...args), ms);
	};
	debounced.cancel = () => clearTimeout(id);
	return debounced;
};

/**
 * Throttle — call fn at most once per ms.
 * Leading edge fires immediately, trailing edge fires after the window
 * if calls kept coming.
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export const throttle = (fn, ms) => {
	let last = 0;
	let timeout;
	const throttled = (...args) => {
		const now = Date.now();
		const remaining = ms - (now - last);
		if (remaining <= 0) {
			clearTimeout(timeout);
			timeout = null;
			last = now;
			fn(...args);
		} else if (!timeout) {
			timeout = setTimeout(() => {
				last = Date.now();
				timeout = null;
				fn(...args);
			}, remaining);
		}
	};
	throttled.cancel = () => {
		clearTimeout(timeout);
		timeout = null;
		last = 0;
	};
	return throttled;
};
