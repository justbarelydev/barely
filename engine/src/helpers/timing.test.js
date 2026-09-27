// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForAnimation } from '@justbarely/engine';

// The helper defers to rAF - run it inline so it settles synchronously
beforeEach(() => vi.stubGlobal('requestAnimationFrame', (cb) => cb()));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

// Stub the computed style so the tests don't depend on happy-dom's CSSOM
const stubDurations = (transition, animation = '0s') =>
	vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
		transitionDuration: transition,
		animationDuration: animation,
	});

const makeEl = () => {
	const el = document.createElement('div');
	document.body.append(el);
	return el;
};

const end = (el, elapsedTime = 0.3) => {
	const e = new Event('transitionend', { bubbles: true });
	Object.defineProperty(e, 'elapsedTime', { value: elapsedTime });
	el.dispatchEvent(e);
};

describe('waitForAnimation', () => {
	it('ignores a bubbled transitionend from a descendant', () => {
		stubDurations('0.3s');
		const el = makeEl();
		const child = document.createElement('div');
		el.append(child);

		const fn = vi.fn();
		waitForAnimation(el, fn);

		// A descendant finishing must not end the wait for the element itself
		end(child);
		expect(fn).not.toHaveBeenCalled();

		end(el);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('waits for the longest transition, not the first to end', () => {
		stubDurations('0.15s, 0.3s');
		const el = makeEl();

		const fn = vi.fn();
		waitForAnimation(el, fn);

		end(el, 0.15);
		expect(fn).not.toHaveBeenCalled();

		end(el, 0.3);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('fires once and detaches its listeners', () => {
		stubDurations('0.3s');
		const el = makeEl();

		const fn = vi.fn();
		waitForAnimation(el, fn);

		end(el);
		end(el);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('calls back off the timer when no event ever fires', () => {
		vi.useFakeTimers();
		try {
			stubDurations('0.3s');
			const el = makeEl();

			const fn = vi.fn();
			waitForAnimation(el, fn);
			expect(fn).not.toHaveBeenCalled();

			vi.advanceTimersByTime(400);
			expect(fn).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('calls back immediately when there is nothing to wait for', () => {
		stubDurations('0s');
		const el = makeEl();

		const fn = vi.fn();
		waitForAnimation(el, fn);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
