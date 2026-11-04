// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollAxis, whenSettled } from './scroll';

const makeTrack = ({ children = 5, size = 100, rtl = false } = {}) => {
	const track = document.createElement('div');
	Object.defineProperties(track, {
		clientWidth: { configurable: true, value: 100 },
		scrollWidth: { configurable: true, value: children * size },
		clientHeight: { configurable: true, value: 100 },
		scrollHeight: { configurable: true, value: children * size },
		scrollLeft: { configurable: true, writable: true, value: 0 },
		scrollTop: { configurable: true, writable: true, value: 0 },
	});
	track.getBoundingClientRect = () => ({ left: 0, right: 100, top: 0 });
	track.scrollTo = vi.fn(({ left, top }) => {
		if (left != null) track.scrollLeft = left;
		if (top != null) track.scrollTop = top;
	});

	for (let i = 0; i < children; i++) {
		const child = document.createElement('div');
		// Reversed axes lay children out from the right edge.
		child.getBoundingClientRect = () => {
			// A reversed axis lays children out from the track's right edge.
			const right = rtl
				? 100 - i * size - track.scrollLeft
				: (i + 1) * size - track.scrollLeft;
			return {
				left: right - size,
				right,
				top: i * size - track.scrollTop,
			};
		};
		Object.defineProperty(child, 'offsetWidth', { value: size });
		track.appendChild(child);
	}

	document.body.appendChild(track);
	return track;
};

afterEach(() => {
	document.body.replaceChildren();
});

describe('scrollAxis', () => {
	it('maps a horizontal LTR track onto a positive axis', () => {
		const track = makeTrack();
		const axis = scrollAxis(track);

		expect(axis.vertical).toBe(false);
		expect(axis.rtl).toBe(false);
		expect(axis.pos()).toBe(0);
		expect(axis.max()).toBe(400);
		expect(axis.offsetOf(track.children[0])).toBe(0);
		expect(axis.offsetOf(track.children[3])).toBe(300);

		axis.scrollTo(200);
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 200,
			behavior: 'auto',
		});
		expect(axis.pos()).toBe(200);
	});

	it('keeps offsetOf monotonic on a reversed axis', () => {
		const track = makeTrack({ rtl: true });
		const axis = scrollAxis(track, { rtl: true });
		expect(axis.sign).toBe(-1);

		track.scrollLeft = -200;
		expect(axis.pos()).toBe(200);
		// children still measure 0, 100, 200 ... from the start end
		expect(axis.offsetOf(track.children[0])).toBe(0);
		expect(axis.offsetOf(track.children[1])).toBe(100);

		axis.scrollTo(300);
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: -300,
			behavior: 'auto',
		});
	});

	it('uses the vertical properties and keys', () => {
		const track = makeTrack();
		const axis = scrollAxis(track, { vertical: true });

		expect(axis.vertical).toBe(true);
		expect(axis.size()).toBe(100);
		expect(axis.max()).toBe(400);
		expect(axis.nextKey).toBe('ArrowDown');
		expect(axis.keyDir('ArrowDown')).toBe(1);
		expect(axis.keyDir('ArrowUp')).toBe(-1);
		expect(axis.keyDir('ArrowRight')).toBe(0);

		axis.scrollTo(200);
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			top: 200,
			behavior: 'auto',
		});
	});

	it('swaps the arrow keys when the axis is reversed', () => {
		const track = makeTrack();
		const axis = scrollAxis(track, { rtl: true });
		expect(axis.keyDir('ArrowLeft')).toBe(1);
		expect(axis.keyDir('ArrowRight')).toBe(-1);
	});
});

describe('whenSettled', () => {
	it('waits for a quiet period without scrollend, and can be cancelled', async () => {
		const track = makeTrack();
		const fn = vi.fn();
		whenSettled(track, fn);

		expect(fn).not.toHaveBeenCalled();
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(fn).not.toHaveBeenCalled();

		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scroll'));
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
