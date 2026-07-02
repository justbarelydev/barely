/**
 * @justbarely/engine — ARIA helper
 *
 * One export: updateAria(root, map)
 * Call from onMount AND onEffect. Always writes — static attrs are harmless
 * re-writes, dynamic booleans (aria-selected, aria-expanded) read current
 * data-* state and toggle correctly.
 *
 * Map keys are CSS selectors. Values are either a static object or a function
 * that receives the element and returns an object.
 *
 *   const TABS_ARIA = {
 *     '[data-tab]': (el) => ({
 *       role: 'tab',
 *       'aria-controls': `panel-${el.getAttribute('data-tab')}`,
 *       'aria-selected': el.hasAttribute('data-active') ? 'true' : 'false',
 *     }),
 *   };
 */

/**
 * Apply ARIA attributes to matching elements inside `root`.
 * Always writes — no skip-guard. Call from both onMount and onEffect.
 */
export const updateAria = (root, map) => {
	for (const [selector, attrs] of Object.entries(map)) {
		const elements =
			selector === '&'
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
