/**
 * @justbarely/engine - attribute helpers
 * Thin wrappers for dealing with attributes
 */

import { hasToken } from '@justbarely/core';

/**
 * Update one or more attributes on an element
 * Booleans add/remove attributes without values
 * All other values are set as string literals
 *
 * @param {Element} el
 * @param {Record<string, string|boolean|number>} attrs
 */
export const setAttrs = (el, attrs) => {
	for (const [key, val] of Object.entries(attrs)) {
		if (typeof val === 'boolean') {
			val ? el.setAttribute(key, '') : el.removeAttribute(key);
		} else {
			el.setAttribute(key, val);
		}
	}
};

/**
 * onRefract helper: adds a unit to bare numbers or passes explicit
 * units through as-is
 *
 * unitize('px') returns a function that turns "12" → "12px"
 * and "100%" → "100%"
 *
 * @param {string} unit - CSS unit to append (px, ms, s, rem, etc.)
 * @returns {(val: string) => string}
 */
export const unitize = (unit) => (val) => (isNaN(val) ? val : `${val}${unit}`);

/**
 * Set an attribute only if it doesn't already exist
 * Respects provided attrs instead of overwriting
 *
 * @param {Element} el
 * @param {string} name
 * @param {string} value
 */
export const ensureAttr = (el, name, value) => {
	if (!el.hasAttribute(name)) el.setAttribute(name, value);
};

/**
 * Convert a data-attribute to an inline CSS var
 *
 * @param {Element} el
 * @param {string} name
 * @param {string} val
 */
export const refract = (el, name, val) =>
	el.style.setProperty(`--${name.replace(/^data-/, '')}`, val);

/**
 * Check if a flag (specific string) is in [data-mode]
 *
 * @param {Element} el
 * @param {string} mode - [data-mode] value(s)
 * @returns {boolean}
 */
export const hasMode = (el, mode) => hasToken(el.dataset.mode, mode);
