/**
 * @justbarely/core — spatial positioning, pure geometry function(s)
 */

/**
 * Fit a child rect to an anchor rect, picking the best placement and
 * calculating any overflow shift. Tries preferred side first, flips if needed.
 *
 * @param {{ top: number, left: number, width: number, height: number }} anchor - the rect to attach to
 * @param {{ width: number, height: number }} child - dimensions to fit
 * @param {{ width: number, height: number }} viewport - bounding area
 * @param {'top'|'bottom'|'left'|'right'} preferred
 * @returns {{ placement: 'top'|'bottom'|'left'|'right', shiftX: number, shiftY: number }}
 */
export const fitRect = (anchor, child, viewport, preferred) => {
	const { top, left, width: aw, height: ah } = anchor;
	const { width: pw, height: ph } = child;
	const { width: vw, height: vh } = viewport;

	const fits = {
		top: top >= ph,
		bottom: vh - (top + ah) >= ph,
		left: left >= pw,
		right: vw - (left + aw) >= pw,
	};

	const placement = fits[preferred]
		? preferred
		: fits[
					{
						top: 'bottom',
						bottom: 'top',
						left: 'right',
						right: 'left',
					}[preferred]
			  ]
			? { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[
					preferred
				]
			: preferred;

	let shiftX = 0,
		shiftY = 0;
	if (placement === 'top' || placement === 'bottom') {
		const centered = left + aw / 2 - pw / 2;
		if (centered < 0) shiftX = -centered;
		else if (centered + pw > vw) shiftX = vw - (centered + pw);
	} else {
		const centered = top + ah / 2 - ph / 2;
		if (centered < 0) shiftY = -centered;
		else if (centered + ph > vh) shiftY = vh - (centered + ph);
	}

	return {
		placement,
		shiftX: Math.round(shiftX),
		shiftY: Math.round(shiftY),
	};
};
