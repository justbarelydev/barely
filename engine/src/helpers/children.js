/**
 * @justbarely/engine - child elements
 *
 * resolveIndex(root, selector, val, { attr }) - find child by position or named attr
 * 	- val = null: returns -1 (deactivates)
 *  - attr provided: lookup by attr match (e.g. aria-controls)
 *  - default: parse numeric index
 *
 * syncActiveChild(root, selector, attr, activeIndex) - toggle attr on one child
 */

import { getAttr, setAttr, removeAttr } from './attr';

export const resolveIndex = (root, selector, val, { attr: attrName } = {}) => {
	/** null = deactivate all */
	if (val === null) return -1;

	const children = [...root.querySelectorAll(selector)];

	/**
	 * Try named lookup first (e.g. aria-controls="tab1" or data-tab="tab1")
	 * Falls back to numeric index if no match found
	 */
	if (attrName) {
		const lookup = attrName.startsWith('aria-')
			? (el) => el.getAttribute(attrName) === val
			: (el) => getAttr(el, attrName) === val;
		const namedIndex = children.findIndex(lookup);
		if (namedIndex !== -1) return namedIndex;
	}

	/** Fall back to numeric index */
	const n = parseInt(val, 10);
	return isNaN(n) ? 0 : n;
};

export const syncActiveChild = (root, selector, attr, activeIndex) => {
	const children = [...root.querySelectorAll(selector)];
	children.forEach((child, i) => {
		/** Set blank attr on active child (boolean presence), remove from others */
		i === activeIndex ? setAttr(child, attr, '') : removeAttr(child, attr);
	});
};
