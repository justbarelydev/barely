import { describe, it, expect } from 'vitest';
import {
	toInt,
	clamp,
	snapEdge,
	toPage,
	pageCount,
	pageTarget,
	wrap,
} from '@justbarely/core';

describe('toInt', () => {
	it('parses numbers and numeric strings', () => {
		expect(toInt('12')).toBe(12);
		expect(toInt(12)).toBe(12);
	});

	it('falls back on bad input', () => {
		expect(toInt('barely')).toBe(0);
		expect(toInt(null, 5)).toBe(5);
	});
});

describe('clamp', () => {
	it('bounds a value to [min, max]', () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(11, 0, 10)).toBe(10);
	});
});

describe('snapEdge', () => {
	it('snaps to the start near the beginning', () => {
		expect(snapEdge(20, 500, 200, -1)).toBe(0);
	});

	it('snaps to the end near the finish', () => {
		expect(snapEdge(280, 500, 200, 1)).toBe(300);
	});

	it('passes through mid-range values', () => {
		expect(snapEdge(150, 500, 200, 1)).toBe(150);
	});
});

describe('paging', () => {
	it('maps position to page index', () => {
		expect(toPage(240, 100)).toBe(2);
	});

	it('counts partial pages', () => {
		expect(pageCount(250, 100)).toBe(3);
	});

	it('advances by ratio then snaps', () => {
		expect(pageTarget(0, 100, 500, 1)).toBe(80);
	});
});

describe('wrap', () => {
	it('wraps forward and backward', () => {
		expect(wrap(3, 3)).toBe(0);
		expect(wrap(-1, 3)).toBe(2);
	});
});
