/**
 * @justbarely/engine - helpers for child elements
 */

/**
 * Get an array of children inside a component that match the provided selector
 * so you don't have to write root.querySelectorAll() everywhere, and so you can
 * loop over them with forEach, map, filter, etc
 */
export const children = (root, selector) => [
	...root.querySelectorAll(selector),
];
