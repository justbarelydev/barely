/**
 * @justbarely/engine — ARIA injection helper
 *
 * Because writing ARIA attributes is a lot, but that's no excuse to overlook
 * our friends who rely on them.
 *
 * Write ARIA attributes automatically to elements based on a map of
 * selectors -> attributes
 *
 * Call this in onMount AND onEffect to make sure ARIA attrs always stay up to
 * date. It writes every mapped attribute every time which might sound
 * concerning, but don't worry because:
 * - Static attrs like role and aria-controls never change
 * - Dynamic booleans like aria-selected are copied fresh from the component's
 * data-* state each time, so they'll always be the correct value
 *
 * Map keys are CSS selectors, and values are either a static object or a
 * function that receives the element and returns an object.
 *
 *   const TABS_ARIA = {
 *     '[data-tab]': (el) => ({
 *       role: 'tab',
 *       'aria-controls': `panel-${el.getAttribute('data-tab')}`,
 *       'aria-selected': el.hasAttribute('data-active') ? 'true' : 'false',
 *     }),
 *   };
 */

export const updateAria = (root, map) => {
	for (const [selector, attrs] of Object.entries(map)) {
		const elements =
			selector === 'root'
				? [root]
				: [...root.querySelectorAll(selector)].filter(
						(el) => el.closest('[data-component]') === root,
					);

		for (const el of elements) {
			const values = typeof attrs === 'function' ? attrs(el) : attrs;

			for (const [attr, val] of Object.entries(values)) {
				el.setAttribute(attr, val);
			}
		}
	}
};
