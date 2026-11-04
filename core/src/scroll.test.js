import { describe, expect, it } from 'vitest';
import { lastReachable, nearestIndex, targetFor } from './scroll';

// 5 items, 100 wide, no gaps
const items = Array.from({ length: 5 }, (_, i) => ({
	start: i * 100,
	size: 100,
}));

describe('nearestIndex', () => {
	it('picks the item whose leading edge is nearest (start align)', () => {
		expect(nearestIndex(items, 0)).toBe(0);
		expect(nearestIndex(items, 149)).toBe(1);
		expect(nearestIndex(items, 151)).toBe(2);
		expect(nearestIndex(items, 400)).toBe(4);
	});

	it('flips at the midpoint of a glide in both directions', () => {
		const forward = [0, 40, 60, 100].map((at) => nearestIndex(items, at));
		const backward = [100, 60, 40, 0].map((at) => nearestIndex(items, at));
		expect(forward).toEqual([0, 0, 1, 1]);
		expect(backward).toEqual([1, 1, 0, 0]);
	});

	it('picks the centered item (center align)', () => {
		// viewport 300: the centered item sits in the middle
		expect(nearestIndex(items, 0, 300, 'center')).toBe(1);
		expect(nearestIndex(items, 100, 300, 'center')).toBe(2);
		expect(nearestIndex(items, 100, 300, 'end')).toBe(3);
	});

	it('has no opinion about empty input', () => {
		expect(nearestIndex([], 500)).toBe(0);
		expect(nearestIndex(undefined, 500)).toBe(0);
	});
});

describe('targetFor', () => {
	it('aligns the item start', () => {
		expect(targetFor(items, 0)).toBe(0);
		expect(targetFor(items, 3)).toBe(300);
	});

	it('centers and ends', () => {
		expect(targetFor(items, 2, 300, 'center')).toBe(100);
		expect(targetFor(items, 2, 300, 'end')).toBe(0);
	});

	it('returns null for a missing item', () => {
		expect(targetFor(items, 9)).toBeNull();
		expect(targetFor([], 0)).toBeNull();
	});
});

describe('lastReachable', () => {
	it('is the last item when it can fill the viewport', () => {
		expect(lastReachable(items, 100, 400)).toBe(4);
	});

	it('stops early when several items are visible', () => {
		// 8 items of 100, viewport 300, max scroll 500
		const eight = Array.from({ length: 8 }, (_, i) => ({
			start: i * 100,
			size: 100,
		}));
		expect(lastReachable(eight, 300, 500)).toBe(5);
	});

	it('is the centered item at the end of the scroll (center align)', () => {
		// viewport 589, items 77.3 wide, 51 items: the last centered item is 47
		const wide = Array.from({ length: 51 }, (_, i) => ({
			start: i * 85.28,
			size: 77.31,
		}));
		const max = 3754;
		expect(lastReachable(wide, 589, max, 'center')).toBe(
			nearestIndex(wide, max, 589, 'center'),
		);
	});
});
