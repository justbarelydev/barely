/**
 * @justbarely/engine - attribute helpers
 * These are just thin wrappers for dealing with attributes
 */

import { COMPONENT } from '../constants';

/** Attrs */
export const getAttr = (el, key) => el.getAttribute(key);
export const setAttr = (el, key, val) => el.setAttribute(key, val);
export const hasAttr = (el, key) => el.hasAttribute(key);
export const removeAttr = (el, key) => el.removeAttribute(key);
export const toggleAttr = (el, key) => el.toggleAttribute(key);

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
	el.style.setProperty(`--${name}`, val);
