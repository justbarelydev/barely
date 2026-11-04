/**
 * @justbarely/core - scroll geometry
 *
 * Pure math for scroll: given items as `{ start, size }` on one axis to get
 * "which item is nearest to this position" and "where is this item". Axis always
 * increases from 0.
 */

/**
 * The spot on an item that lines up with the viewport: its start edge, its
 * center, or its end edge, depending on `align`.
 * @param {{start: number, size: number}} item
 * @param {'start'|'center'|'end'} align
 * @returns {number}
 */
const alignPoint = (item, align) => {
	if (align === 'center') return item.start + item.size / 2;
	if (align === 'end') return item.start + item.size;
	return item.start;
};

/**
 * The spot on the viewport that items line up with, at a given scroll position.
 * @param {number} at - scroll position
 * @param {number} viewport - how much is visible along the axis
 * @param {'start'|'center'|'end'} align - alignment type
 * @returns {number}
 */
const viewPoint = (at, viewport, align) => {
	if (align === 'center') return at + viewport / 2;
	if (align === 'end') return at + viewport;
	return at;
};

/**
 * The item closest to where the viewport is looking. Does two things:
 * - says which item a scroll landed on
 * - asks "which item can be the last one?"
 *
 * @param {{start: number, size: number}[]} items
 * @param {number} at - scroll position
 * @param {number} [viewport=0] - how much is visible along the axis
 * @param {'start'|'center'|'end'} [align='start']
 * @returns {number} item index
 */
export const nearestIndex = (items, at, viewport = 0, align = 'start') => {
	if (!items?.length) return 0;

	const point = viewPoint(at, viewport, align);
	let closest = 0;
	let minDiff = Infinity;

	for (let i = 0; i < items.length; i++) {
		const diff = Math.abs(alignPoint(items[i], align) - point);
		if (diff < minDiff) {
			minDiff = diff;
			closest = i;
		}
	}

	return closest;
};

/**
 * Where to scroll so `index` sits in the right spot. Clamped by the caller, not
 * here. Returns null if the index has no item.
 *
 * @param {{start: number, size: number}[]} items
 * @param {number} index
 * @param {number} [viewport=0]
 * @param {'start'|'center'|'end'} [align='start']
 * @returns {number|null} null when the index has no item
 */
export const targetFor = (items, index, viewport = 0, align = 'start') => {
	const item = items?.[index];
	if (!item) return null;
	return alignPoint(item, align) - viewPoint(0, viewport, align);
};

/**
 * The last item that can sit at the front. With more than one item showing,
 * the final few never get there - the track runs out of scroll before their
 * leading edge reaches the start - so the prev/next boundaries stop here, not
 * at `items.length - 1`.
 *
 * @param {{start: number, size: number}[]} items
 * @param {number} viewport
 * @param {number} max - how far the axis can scroll
 * @param {'start'|'center'|'end'} [align='start']
 * @returns {number}
 */
export const lastReachable = (items, viewport, max, align = 'start') =>
	nearestIndex(items, max, viewport, align);
