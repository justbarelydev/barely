/**
 * @justbarely/core - spatial positioning, pure geometry
 */

// A placement is a side, optionally corner-aligned.
//   'top' | 'bottom' | 'left' | 'right'   - centered on the anchor
//   'top-left/right' | 'bottom-left/right' - edge-aligned to the anchor
const SIDES = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * Parse a placement string into its side and alignment.
 * CSS matches it with `^=` (side) and `$=` (corner).
 *
 * @param {string} placement - 'top' | 'bottom-left' | ...
 * @returns {{ side: string, align: 'left'|'right'|'center' }}
 */
export const parsePlacement = (placement) => {
	const [side, align] = placement.split('-');
	const horizontal = side === 'top' || side === 'bottom';
	return {
		side,
		align:
			horizontal && (align === 'left' || align === 'right')
				? align
				: 'center',
	};
};

/**
 * Fit a child rect to an anchor rect, picking the best placement and
 * calculating any overflow shift. Tries the preferred side first and flips to
 * the opposite side if it doesn't fit, keeping the corner through the flip
 * (bottom-left becomes top-left).
 *
 * @param {{ top: number, left: number, width: number, height: number }} anchor - the rect to attach to
 * @param {{ width: number, height: number }} child - dimensions to fit
 * @param {{ width: number, height: number }} viewport - bounding area
 * @param {string} preferred - side, optionally corner-aligned
 * @returns {{ placement: string, shiftX: number, shiftY: number }}
 */
export const fitRect = (anchor, child, viewport, preferred) => {
	const { top, left, width: aw, height: ah } = anchor;
	const { width: pw, height: ph } = child;
	const { width: vw, height: vh } = viewport;
	const { side, align } = parsePlacement(preferred);

	const fits = {
		top: top >= ph,
		bottom: vh - (top + ah) >= ph,
		left: left >= pw,
		right: vw - (left + aw) >= pw,
	};

	const placement = fits[side]
		? side
		: fits[SIDES[side]]
			? SIDES[side]
			: side;

	let shiftX = 0,
		shiftY = 0;
	if (placement === 'top' || placement === 'bottom') {
		// Child's left edge before any shift
		const childLeft =
			align === 'left'
				? left
				: align === 'right'
					? left + aw - pw
					: left + aw / 2 - pw / 2;
		if (childLeft < 0) shiftX = -childLeft;
		else if (childLeft + pw > vw) shiftX = vw - (childLeft + pw);
	} else {
		const childTop = top + ah / 2 - ph / 2;
		if (childTop < 0) shiftY = -childTop;
		else if (childTop + ph > vh) shiftY = vh - (childTop + ph);
	}

	return {
		placement: align === 'center' ? placement : `${placement}-${align}`,
		shiftX: Math.round(shiftX),
		shiftY: Math.round(shiftY),
	};
};
