/**
 * @justbarely/engine - attribute helpers
 * These are just thin wrappers for dealing with attributes
 */

import { COMPONENT } from '../constants';

/** Attrs */
/** Keeping setAttr around in case I want to add functionality later */
export const setAttr = (el, key, val) => el.setAttribute(key, val);

/** Components */
export const getComponentName = (el) => el.getAttribute('data-component');
export const closestComponent = (el) => el.closest(COMPONENT) ?? null;
export const findComponents = (el, name) => {
	const attr = 'data-component';
	const selector = name ? `[${attr}='${name}']` : COMPONENT;
	return [...el.querySelectorAll(selector)];
};

/** This is refract - convert an attribute to a CSS var as an inline style */
export const setCssVar = (el, name, val) =>
	el.style.setProperty(`--${name.replace(/^data-/, '')}`, val);

/** Checks if a space-separated data-mode flag is present */
export const hasMode = (el, mode) =>
	(el.dataset.mode || '').split(' ').includes(mode);

/** Presence check → 'true' / 'false' for ARIA booleans */
export const ariaBool = (el, attr) =>
	el.hasAttribute(attr) ? 'true' : 'false';
