/**
 * Parse a value to an integer with a fallback
 * Handles values, strings, null, undefined, etc. safely
 * @param {*} val  - Value to parse (like a string from getAttribute)
 * @param {*} [fallback=0] - Default fallback if parse fails
 * @returns {number}
 */
export const toInt = (val, fallback = 0) => {
	const n = parseInt(val, 10);
	return Number.isFinite(n) ? n : fallback;
};

/**
 * Clamp a value between min and max
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

/**
 * Snap to an edge when you get close enough. If it's less than the buffer away,
 * snap to the start/end.
 * @param {number} target - Computed landing position
 * @param {number} total - Total length of the content
 * @param {number} visible - Length of one view
 * @param {number} dir - Direction (-1 backward, 1 forward)
 * @param {number} [buffer=50] - How close to the edge you need to be to snap
 * @returns {number}
 */
export const snapEdge = (target, total, visible, dir, buffer = 50) => {
	const max = total - visible;
	if (dir === -1 && target < buffer) return 0;
	if (dir === 1 && target > max - buffer) return max;
	return target;
};

/**
 * Get the page you're on based on the current position
 * @param {number} position - Current position
 * @param {number} visible - Size of a page
 * @returns {number}
 */
export const toPage = (position, visible) => Math.round(position / visible);

/**
 * Get the total number of pages. Round up because half-visible pages count.
 * @param {number} total - Total length of all content
 * @param {*} visible - Length of one page
 * @returns {number}
 */
export const pageCount = (total, visible) => Math.ceil(total / visible);

/**
 * Determine where the next page should land. 80% ratio by default.
 * @param {number} position - Current position offset
 * @param {number} visible - Length of one page
 * @param {number} total - Total content length
 * @param {number} dir - Direction
 * @param {number} [count=1] - Number of pages to advance
 * @param {number} [ratio=0.8] - Fraction of page length per step
 * @returns {number}
 */
export const pageTarget = (
	position,
	visible,
	total,
	dir,
	count = 1,
	ratio = 0.8,
) => {
	const raw = position + dir * visible * ratio * count;
	return snapEdge(raw, total, visible, dir);
};

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
