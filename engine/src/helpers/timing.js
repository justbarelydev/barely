/**
 * @justbarely/engine - timing helpers
 */

/**
 * Wait for a CSS transition or animation to finish, then callback.
 * If the element has no transition/animation, calls immediately (after one rAF).
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
		const once = () => {
			if (fired) return;
			fired = true;
			callback();
		};

		if (hasTransition)
			el.addEventListener('transitionend', once, { once: true });
		if (hasAnimation)
			el.addEventListener('animationend', once, { once: true });
	});
};
