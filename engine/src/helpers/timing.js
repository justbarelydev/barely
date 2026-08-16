/**
 * @justbarely/engine - timing helpers
 */

/**
 * Wait for a CSS transition or animation to finish, then callback. If the
 * element has no transition/animation it calls immediately (well... technically
 * after one rAF).
 *
 * Includes a setTimeout safety net. If the transition/animation never fires,
 * it calls after the longest duration + 50ms.
 *
 * @param {Element} el
 * @param {Function} callback
 */
export const waitForAnimation = (el, callback) => {
	requestAnimationFrame(() => {
		const style = getComputedStyle(el);
		const hasTransition = style.transitionDuration !== '0s';
		const hasAnimation = style.animationDuration !== '0s';

		if (!hasTransition && !hasAnimation) {
			callback();
			return;
		}

		let fired = false;
		let fallback;

		const once = () => {
			if (fired) return;
			fired = true;
			clearTimeout(fallback);
			callback();
		};

		if (hasTransition)
			el.addEventListener('transitionend', once, { once: true });
		if (hasAnimation)
			el.addEventListener('animationend', once, { once: true });

		// If the event never fires, fall through after duration + 50ms
		const parseMax = (str) =>
			Math.max(...str.split(',').map((s) => parseFloat(s.trim()) || 0));
		const maxDuration = Math.max(
			parseMax(style.transitionDuration),
			parseMax(style.animationDuration),
		);
		if (maxDuration > 0)
			fallback = setTimeout(once, maxDuration * 1000 + 50);
	});
};
