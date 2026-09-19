import { describe, it, expect } from 'vitest';
import { fitRect } from '@justbarely/core';

const viewport = { width: 1000, height: 1000 };

describe('fitRect', () => {
	it('keeps the preferred side when it fits', () => {
		const out = fitRect(
			{ top: 300, left: 400, width: 200, height: 100 },
			{ width: 100, height: 50 },
			viewport,
			'top',
		);
		expect(out).toEqual({ placement: 'top', shiftX: 0, shiftY: 0 });
	});

	it('flips to the opposite side when the preferred one is clipped', () => {
		const out = fitRect(
			{ top: 10, left: 400, width: 200, height: 100 },
			{ width: 100, height: 50 },
			viewport,
			'top',
		);
		expect(out.placement).toBe('bottom');
	});

	it('shifts horizontally when the child overflows an edge', () => {
		const out = fitRect(
			{ top: 500, left: 950, width: 200, height: 50 },
			{ width: 100, height: 50 },
			viewport,
			'top',
		);
		expect(out).toEqual({ placement: 'top', shiftX: -100, shiftY: 0 });
	});
});
