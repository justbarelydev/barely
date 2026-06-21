/**
 * @justbarely/engine - custom event helper
 *
 * Thin wrapper for dispatchEvent for outward component communications
 * Events bubble and carry a { detail } payload
 */

export const emit = (el, name, detail = {}) => {
	el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
};
