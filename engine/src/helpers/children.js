/**
 * @justbarely/engine - helpers for child elements
 */

/**
 * children() - querySelectorAll wrapper that returns a real array to iterate on
 * If `root` is a [data-component] it scopes to that component to allow for
 * worry free nested components
 *
 *   children('.foo') 		// document-level query
 *   children(root, '.foo')	// scoped to component
 */
export const children = (root, selector) => {
	// Single-arg: document-level query
	if (typeof root === 'string') return [...document.querySelectorAll(root)];

	const els = [...root.querySelectorAll(selector)];

	return root.hasAttribute?.('data-component')
		? els.filter((el) => el.closest('[data-component]') === root)
		: els;
};
