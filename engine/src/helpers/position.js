/**
 * @justbarely/engine — positioning helpers
 */

import { fitRect } from '@justbarely/core';

/**
 * Calculate placement and overflow shift for a popup relative to its trigger.
 * Thin DOM wrapper around the pure core function `fitRect`.
 *
 * @param {Element} trigger
 * @param {Element} popup
 * @param {'top'|'right'|'bottom'|'left'} [preferred='top']
 * @param {Element} [viewport] - container to constrain to (defaults to window)
 * @returns {{ placement: 'top'|'right'|'bottom'|'left', shiftX: number, shiftY: number }}
 */
export const fitToViewport = (trigger, popup, preferred = 'top', viewport) =>
	fitRect(
		trigger.getBoundingClientRect(),
		popup.getBoundingClientRect(),
		viewport?.getBoundingClientRect() ?? {
			width: innerWidth,
			height: innerHeight,
		},
		preferred,
	);

/**
 * Given a trigger position, popup size, placement side, and shift/offset
 * nudges, returns the { top, left } where the popup should appear.
 *
 * All values are viewport-relative.
 *
 * @param {DOMRect} triggerRect - trigger.getBoundingClientRect()
 * @param {DOMRect} popupRect  - popup.getBoundingClientRect()
 * @param {{ placement: string, shiftX: number, shiftY: number }} fit
 * @param {number} [offsetX=0]
 * @param {number} [offsetY=0]
 * @returns {{ top: number, left: number }}
 */
export const popupCoords = (
	triggerRect,
	popupRect,
	{ placement, shiftX, shiftY },
	offsetX = 0,
	offsetY = 0,
) => {
	const { top: rt, left: rl, width: rw, height: rh } = triggerRect;
	const { width: pw, height: ph } = popupRect;

	switch (placement) {
		case 'top':
			return {
				top: rt - ph - offsetY + shiftY,
				left: rl + rw / 2 - pw / 2 + offsetX + shiftX,
			};
		case 'bottom':
			return {
				top: rt + rh + offsetY + shiftY,
				left: rl + rw / 2 - pw / 2 + offsetX + shiftX,
			};
		case 'left':
			return {
				top: rt + rh / 2 - ph / 2 + offsetY + shiftY,
				left: rl - pw - offsetX + shiftX,
			};
		case 'right':
			return {
				top: rt + rh / 2 - ph / 2 + offsetY + shiftY,
				left: rl + rw + offsetX + shiftX,
			};
	}
};
