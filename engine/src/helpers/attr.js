/**
 * @justbarely/engine - attribute helpers
 * Thin wrappers for dealing with attributes
 */

import { hasToken } from '@justbarely/core';
import { COMPONENT } from '../constants';

// Attrs
/**
 * Update one or more attributes on an element
 * Booleans add/remove attributes without values
 * All other values are set as string literals
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

// Components
export const getComponentName = (el) => el.getAttribute('data-component');
export const closestComponent = (el) => el.closest(COMPONENT) ?? null;
export const findComponents = (el, name) => {
	const attr = 'data-component';
	const selector = name ? `[${attr}='${name}']` : COMPONENT;
	return [...el.querySelectorAll(selector)];
};

// This is refract - convert an attribute to a CSS var as an inline style
export const setCssVar = (el, name, val) =>
	el.style.setProperty(`--${name.replace(/^data-/, '')}`, val);

// Checks if a space-separated data-mode flag is present
export const hasMode = (el, mode) => hasToken(el.dataset.mode, mode);
