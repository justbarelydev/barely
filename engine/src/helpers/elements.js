/**
 * @justbarely/engine - DOM element helpers
 */

import { COMPONENT } from '../constants';

/**
 * Wrapper for querySelectorAll that returns an array to iterate on. If root is
 * [data-component] it will stop walking up the tree when it finds the first
 * component instance, allowing for nested components without leaks.
 *
 *   els('.foo')         // document-level query
 *   els(root, '.foo')   // scoped to component
 *
 * @param {Element} root - element to query from
 * @param {string} selector - selector to look for
 * @returns Array<Element>
 */
export const els = (root, selector) => {
	// Single-arg: document-level query
	if (typeof root === 'string') return [...document.querySelectorAll(root)];

	const found = [...root.querySelectorAll(selector)];

	return root.hasAttribute?.('data-component')
		? found.filter((el) => el.closest('[data-component]') === root)
		: found;
};

/**
 * Convenience wrapper for els() that returns the first match
 * or null. Like querySelector but with the guards from els()
 *
 * @param {Element} root
 * @param {string} selector
 * @returns {Element|null}
 */
export const el = (root, selector) => els(root, selector)[0] ?? null;

/**
 * Get a component's name from data-component attribute
 * @param {Element} el
 * @returns {string|null}
 */
export const getComponentName = (el) => el.getAttribute('data-component');

/**
 * Get the closest [data-component] ancestor
 * @param {Element} el
 * @returns {Element|null}
 */
export const closestComponent = (el) => el.closest(COMPONENT) ?? null;

/**
 * Find child components, optionally filtered by name
 * @param {Element} el
 * @param {string} [name]
 * @returns {Array<Element>}
 */
export const findComponents = (el, name) => {
	const attr = 'data-component';
	const selector = name ? `[${attr}='${name}']` : COMPONENT;
	return [...el.querySelectorAll(selector)];
};

/**
 * Remove [hidden] attribute and override display:none so the element
 * becomes visible
 *
 * @param {Element} el
 */
export const showElement = (el) => {
	el.removeAttribute('hidden');
	if (getComputedStyle(el).display === 'none') el.style.display = 'block';
};

/**
 * Add [hidden] attribute and clear any inline display override
 *
 * @param {Element} el
 */
export const hideElement = (el) => {
	el.setAttribute('hidden', '');
	el.style.display = '';
};
