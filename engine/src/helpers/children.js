/**
 * @justbarely/engine - helpers for child elements
 */

/**
 * children() - Simple wrapper for querySelectorAll that returns an array so you
 * can use array methods without converting from a NodeList first.
 *
 *   children('.foo')              // document-level
 *   children(root, '.foo')        // scoped to component
 *   children(root, '.foo', true)  // deep — all descendants, no scoping
 */
export const children = (root, selector, deep = false) => {
	// Single-arg: document-level query
	if (typeof root === 'string') return [...document.querySelectorAll(root)];

	const els = [...root.querySelectorAll(selector)];
	if (deep) return els;
	if (!root.getAttribute) return els;
	if (!root.hasAttribute('data-component')) return els;
	return els.filter((el) => el.closest('[data-component]') === root);
};
