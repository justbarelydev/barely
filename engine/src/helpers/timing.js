/**
 * Throttle - rAF-based throttle
 * Call fn at most once per frame - provide `ms` to extend time between calls.
 *
 * The cool thing here is that requestAnimationFrame is already a throttle in
 * and of itself, so that's the default
 *
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export const throttle = (fn, ms) => {
	if (!ms) {
		let id;
		const t = (...args) => {
			if (id) return;
			id = requestAnimationFrame(() => {
				id = null;
				fn(...args);
			});
		};
		t.cancel = () => {
			cancelAnimationFrame(id);
			id = null;
		};
		return t;
	}

	let last = 0;
	const t = (...args) => {
		const now = performance.now();
		if (now - last < ms) return;
		last = now;
		fn(...args);
	};
	t.cancel = () => {
		last = 0;
	};
	return t;
};

/**
 * Debounce - call fn after `ms` of inactivity
 * @param {Function} fn
 * @param {number} [ms=150]
 */
export const debounce = (fn, ms = 150) => {
	let id;
	const debounced = (...args) => {
		clearTimeout(id);
		id = setTimeout(() => fn(...args), ms);
	};
	debounced.cancel = () => {
		clearTimeout(id);
	};
	return debounced;
};
