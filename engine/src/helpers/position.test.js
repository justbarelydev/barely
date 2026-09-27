import { describe, it, expect } from 'vitest';
import { popupCoords } from '@justbarely/engine';

const trigger = { top: 100, left: 200, width: 80, height: 40 };
const popup = { width: 60, height: 20 };

describe('popupCoords', () => {
	it('places above for top', () => {
		expect(
			popupCoords(trigger, popup, {
				placement: 'top',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 80, left: 210 });
	});

	it('places below for bottom', () => {
		expect(
			popupCoords(trigger, popup, {
				placement: 'bottom',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 140, left: 210 });
	});

	it('places to the side for left and right', () => {
		expect(
			popupCoords(trigger, popup, {
				placement: 'left',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 110, left: 140 });
		expect(
			popupCoords(trigger, popup, {
				placement: 'right',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 110, left: 280 });
	});

	it('aligns a corner to the trigger edge, not the center', () => {
		expect(
			popupCoords(trigger, popup, {
				placement: 'bottom-left',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 140, left: 200 });
		expect(
			popupCoords(trigger, popup, {
				placement: 'bottom-right',
				shiftX: 0,
				shiftY: 0,
			}),
		).toEqual({ top: 140, left: 220 });
	});

	it('applies offsets and overflow shifts', () => {
		expect(
			popupCoords(
				trigger,
				popup,
				{ placement: 'top', shiftX: 5, shiftY: -3 },
				10,
				8,
			),
		).toEqual({ top: 69, left: 225 });
	});
});
