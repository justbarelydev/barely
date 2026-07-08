/**
 * Wrap an index forward (end -> start) or backward (start <- end)
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
export const wrap = (index, length) => {
	// Double-modulo because in JS, % is a remainder, not a true modulo
	return ((index % length) + length) % length;
};
