import { describe, it, expect } from 'vitest';
import { fitRect } from '@justbarely/core';

const viewport = { width: 1000, height: 1000 };

describe('fitRect corners', () => {
	it('keeps a corner placement and does not center it', () => {
		const out = fitRect(
			{ top: 300, left: 400, width: 200, height: 100 },
			{ width: 100, height: 50 },
			viewport,
			'bottom-left',
		);
		expect(out).toEqual({ placement: 'bottom-left', shiftX: 0, shiftY: 0 });
	});

	it('flips the side but keeps the corner', () => {
		const out = fitRect(
			{ top: 10, left: 400, width: 200, height: 100 },
			{ width: 100, height: 50 },
			viewport,
			'top-left',
		);
		expect(out.placement).toBe('bottom-left');
	});

	it('shifts a left-aligned corner back inside the right edge', () => {
		// Left edges align at 950, so the 100px child ends 50px past the viewport
		const out = fitRect(
			{ top: 500, left: 950, width: 100, height: 50 },
			{ width: 100, height: 50 },
			viewport,
			'bottom-left',
		);
		expect(out).toEqual({
			placement: 'bottom-left',
			shiftX: -50,
			shiftY: 0,
		});
	});

	it('shifts a right-aligned corner back inside the left edge', () => {
		// Right edges align, so the 100px child starts 30px off-screen
		const out = fitRect(
			{ top: 500, left: 20, width: 50, height: 50 },
			{ width: 100, height: 50 },
			viewport,
			'bottom-right',
		);
		expect(out).toEqual({
			placement: 'bottom-right',
			shiftX: 30,
			shiftY: 0,
		});
	});

	it('ignores an alignment suffix on a vertical side', () => {
		const out = fitRect(
			{ top: 300, left: 800, width: 100, height: 100 },
			{ width: 50, height: 50 },
			viewport,
			'right-left',
		);
		expect(out).toEqual({ placement: 'right', shiftX: 0, shiftY: 0 });
	});
});

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
