import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from '@justbarely/core';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('debounce', () => {
	it('fires only the last call in a burst', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d(1);
		d(2);
		d(3);
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith(3);
	});

	it('cancel() drops the pending call', () => {
		const fn = vi.fn();
		const d = debounce(fn, 100);
		d();
		d.cancel();
		vi.advanceTimersByTime(100);
		expect(fn).not.toHaveBeenCalled();
	});
});

describe('throttle', () => {
	it('collapses a burst to one call per window', () => {
		const fn = vi.fn();
		const t = throttle(fn, 100);
		t();
		const calls = fn.mock.calls.length;
		t();
		t();
		expect(fn.mock.calls.length).toBe(calls);
		vi.advanceTimersByTime(100);
		expect(fn.mock.calls.length).toBe(calls + 1);
	});
});
