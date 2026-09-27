/**
 * @justbarely/engine - timing helpers
 */

/**
 * Wait for the motion on this element to end, then callback. No transition and
 * no animation means it calls immediately.
 *
 * End means the longest one: a shorter property finishing first is not the end
 * of the motion, and neither is an event bubbled up from a child. Cancels are
 * ignored, since a cancel means the transition was retargeted and the new run
 * owns the finish. A timer nets the case where the end event never arrives.
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

		const parseMax = (str) =>
			Math.max(...str.split(',').map((s) => parseFloat(s.trim()) || 0));
		const maxDuration = Math.max(
			parseMax(style.transitionDuration),
			parseMax(style.animationDuration),
		);

		let fired = false;
		let fallback;

		// Not `{ once: true }` - a bubbled child event would consume it
		const finish = (e) => {
			if (e) {
				if (e.target !== el) return;
				// A property with a shorter duration ending first isn't the end
				if (
					e.elapsedTime != null &&
					e.elapsedTime + 0.001 < maxDuration
				)
					return;
			}
			if (fired) return;
			fired = true;
			clearTimeout(fallback);
			el.removeEventListener('transitionend', finish);
			el.removeEventListener('animationend', finish);
			callback();
		};

		if (hasTransition) el.addEventListener('transitionend', finish);
		if (hasAnimation) el.addEventListener('animationend', finish);

		// If the event never fires, fall through after duration + 50ms
		if (maxDuration > 0)
			fallback = setTimeout(finish, maxDuration * 1000 + 50);
	});
};
