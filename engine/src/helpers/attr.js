/**
 * @justbarely/engine - attribute helpers
 * Thin wrappers for dataset for cleaner and more consistent null handling
 * setCssVar writes to style.setProperty - refraction
 */

import { COMPONENT } from '../constants';

export const getAttr = (el, key) => el.dataset[key] ?? null;
export const setAttr = (el, key, val) => (el.dataset[key] = val);
export const hasAttr = (el, key) => key in el.dataset;
export const removeAttr = (el, key) => delete el.dataset[key];
export const toggleAttr = (el, key) =>
	hasAttr(el, key) ? removeAttr(el, key) : setAttr(el, key, '');

export const componentName = (el) => el.dataset.component ?? null;
export const closestComponent = (el) => el.closest(COMPONENT) ?? null;
export const findComponents = (el, name) => {
	const attr = 'data-component';
	const selector = name ? `[${attr}='${name}']` : COMPONENT;
	return [...el.querySelectorAll(selector)];
};

export const setCssVar = (el, name, val) =>
	el.style.setProperty(`--${name}`, val);
