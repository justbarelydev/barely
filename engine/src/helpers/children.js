/**
 * @justbarely/engine - helpers for child elements
 */

/**
 * Query children of a component root.
 *
 * Default: scoped — only returns elements whose closest [data-component]
 * ancestor is `root`. This prevents nested components from bleeding into
 * each other's queries (tabs inside tabs, accordion inside tabs, etc.).
 *
 * Pass `true` as the third arg to get ALL descendants (rare).
 */
export const children = (root, selector, deep = false) => {
	const els = [...root.querySelectorAll(selector)];
	if (deep) return els;
	/** Only scope to component root when called from one (not engine scans) */
	if (!root.getAttribute) return els;
	if (!root.hasAttribute('data-component')) return els;
	return els.filter((el) => el.closest('[data-component]') === root);
};
