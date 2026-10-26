import { describe, it, expect } from 'vitest';
import { popupCoords, placeTarget, floatCoords } from '@justbarely/engine';

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

// A DOM-ish element mock: attributes + inline style + a fixed rect.
const makePosEl = (rect) => {
	const attrs = {};
	const vars = {};
	return {
		attrs,
		vars,
		getBoundingClientRect: () => rect,
		setAttribute: (k, v) => {
			attrs[k] = String(v);
		},
		removeAttribute: (k) => {
			delete attrs[k];
		},
		hasAttribute: (k) => k in attrs,
		style: {
			getPropertyValue: (p) => vars[p] ?? '',
			setProperty: (p, v) => {
				vars[p] = v;
			},
		},
	};
};

const viewport = () => ({
	width: 1000,
	height: 1000,
	getBoundingClientRect: () => ({ width: 1000, height: 1000 }),
});

describe('placeTarget', () => {
	const trigger = makePosEl({ top: 100, left: 200, width: 80, height: 40 });

	it('writes the preferred placement and zero shift when it fits', () => {
		const target = makePosEl({ top: 0, left: 0, width: 60, height: 20 });
		const placement = placeTarget(
			trigger,
			trigger,
			target,
			'top',
			viewport(),
		);
		expect(placement).toBe('top');
		expect(target.attrs['data-placement']).toBe('top');
		expect(target.vars['--shift-x']).toBe('0px');
		expect(target.vars['--shift-y']).toBe('0px');
	});

	it('flips to the opposite side when there is no room', () => {
		const target = makePosEl({ top: 0, left: 0, width: 60, height: 20 });
		const vp = {
			width: 1000,
			height: 100,
			getBoundingClientRect: () => ({ width: 1000, height: 100 }),
		};
		const placement = placeTarget(trigger, trigger, target, 'bottom', vp);
		expect(placement).toBe('top');
		expect(target.attrs['data-placement']).toBe('top');
	});
});

describe('floatCoords', () => {
	const trigger = makePosEl({ top: 100, left: 200, width: 80, height: 40 });

	it('returns viewport-relative coords for the preferred side', () => {
		const target = makePosEl({ top: 0, left: 0, width: 60, height: 20 });
		expect(floatCoords(trigger, target, 'bottom', viewport())).toEqual({
			placement: 'bottom',
			top: 140,
			left: 210,
		});
	});

	it('reads refracted offsets off the trigger', () => {
		trigger.vars['--offset-x'] = '10px';
		trigger.vars['--offset-y'] = '8px';
		const target = makePosEl({ top: 0, left: 0, width: 60, height: 20 });
		expect(floatCoords(trigger, target, 'bottom', viewport())).toEqual({
			placement: 'bottom',
			top: 148,
			left: 220,
		});
	});
});
