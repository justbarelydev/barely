/**
 * @justbarely/components - Carousel control helpers
 *
 * Shared by the carousel's nested [data-nav] buttons and the external
 * carousel-nav component.
 */

// A provided name always wins. `title` is a weak fallback but it's better than
// nothing.
export const hasAccessibleName = (el) =>
	el.hasAttribute('aria-label') ||
	el.hasAttribute('aria-labelledby') ||
	el.hasAttribute('title');

// Check if a control has a visible label. If not, we need to assign one.
const hasLabelText = (el) => /[\p{L}\p{N}]/u.test(el.textContent ?? '');

/**
 * Give icon-only [data-nav] controls a decent accessible name. Numbers are
 * zero-based slide indexes, matching [data-nav] and [data-index].
 *
 * @param {Element} root
 */
export const nameNavControls = (root) => {
	root.querySelectorAll('[data-nav]').forEach((button) => {
		if (hasAccessibleName(button) || hasLabelText(button)) return;

		const nav = button.dataset.nav;
		if (nav === 'prev') button.setAttribute('aria-label', 'Previous slide');
		else if (nav === 'next')
			button.setAttribute('aria-label', 'Next slide');
		else if (/^\d+$/.test(nav))
			button.setAttribute('aria-label', `Go to slide ${Number(nav) + 1}`);
	});
};

/**
 * Mirror data-can-prev/next onto the prev/next buttons as aria-disabled.
 *
 * @param {Element} root - element holding the state and the buttons
 */
export const setNavDisabled = (root) => {
	const canPrev = root.hasAttribute('data-can-prev');
	const canNext = root.hasAttribute('data-can-next');
	root.querySelectorAll('[data-nav]').forEach((button) => {
		const nav = button.dataset.nav;
		if (nav === 'prev')
			button.setAttribute('aria-disabled', String(!canPrev));
		else if (nav === 'next')
			button.setAttribute('aria-disabled', String(!canNext));
	});
};

/**
 * Add aria-current to the button that matches the current index (and remove from
 * the others)
 *
 * @param {Element} root
 * @param {number|string} [index] - defaults to root's own [data-index]
 */
export const setNavCurrent = (
	root,
	index = root.getAttribute('data-index'),
) => {
	const current = String(index);
	root.querySelectorAll('[data-nav]').forEach((button) => {
		const nav = button.dataset.nav;
		if (!/^\d+$/.test(nav)) return;
		if (nav === current) button.setAttribute('aria-current', 'true');
		else button.removeAttribute('aria-current');
	});
};
