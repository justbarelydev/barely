/**
 * @justbarely/engine - positioning helpers
 *
 * These are used to position elements relative to other elements, useful for
 * trigger/target components like tooltip, popover, etc.
 */

import { fitRect } from '@justbarely/core';

/**
 * Calculate placement and overflow shift for a popup relative to its trigger.
 * Thin DOM wrapper around core's fitRect()
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

/**
 * Corrects fitToViewport() shifts when CSS centers the popup on the wrapper
 * instead of the trigger.
 *
 * Tooltip and dropdown nest the trigger inside a wrapper, and positioning.css
 * centers the popup on that wrapper (left: 50% + translate). fitToViewport()
 * shifts relative to the trigger, so when the two centers differ, add the
 * offset this returns to center the popup on the trigger.
 *
 * Zero when the trigger is the wrapper itself.
 *
 * @param {Element} root - the wrapper (positioned container)
 * @param {Element} trigger - the invoking element (may be root itself)
 * @returns {{ adjustX: number, adjustY: number }}
 */
export const adjustForWrapper = (root, trigger) => {
	if (trigger === root) return { adjustX: 0, adjustY: 0 };

	const rootRect = root.getBoundingClientRect();
	const triggerRect = trigger.getBoundingClientRect();

	return {
		adjustX:
			triggerRect.left +
			triggerRect.width / 2 -
			(rootRect.left + rootRect.width / 2),
		adjustY:
			triggerRect.top +
			triggerRect.height / 2 -
			(rootRect.top + rootRect.height / 2),
	};
};
