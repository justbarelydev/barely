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
