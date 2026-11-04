/**
 * @justbarely/engine - scroll axis and settle detection
 *
 * The one place that knows about direction and orientation, so nothing above
 * has to worry about it.
 *
 * `scrollAxis()` turns a scroll container into a plain old "0 to end" axis. It's
 * the only code that knows RTL scrolls negative and that vertical scrolling
 * uses top/height - everywhere else just works with increasing numbers:
 *
 *   const axis = scrollAxis(track, { vertical });
 *   axis.pos()               // 0 .. axis.max(), always increasing
 *   axis.offsetOf(child)     // child's start along the same axis
 *   axis.scrollTo(px)        // assign back, sign included
 *   axis.keyDir('ArrowLeft') // -1, 1, or 0
 *
 * `whenSettled()` is just scrollend with a polyfill for older browsers.
 */

import { registerCleanup } from './cleanup';

/**
 * Normalize a scroll container into a single logical axis.
 *
 * `vertical` and `rtl` are read from the element, but both can be passed in
 * explicitly (tests, or an author who knows better).
 *
 * @param {Element} el - the scroll container
 * @param {{vertical?: boolean, rtl?: boolean}} [opts]
 */
export const scrollAxis = (el, { vertical = false, rtl } = {}) => {
	rtl = rtl ?? (!vertical && getComputedStyle(el).direction === 'rtl');

	// RTL scrollLeft runs 0 -> -max, so the sign makes the axis monotonic.
	const sign = rtl ? -1 : 1;

	const pos = () => sign * (vertical ? el.scrollTop : el.scrollLeft);
	const size = () => (vertical ? el.clientHeight : el.clientWidth);
	const max = () =>
		Math.max(0, (vertical ? el.scrollHeight : el.scrollWidth) - size());

	// Distance from the logical origin (the start end) to a child's leading
	// edge. Leading is the right edge when the axis is reversed.
	const offsetOf = (child) => {
		const track = el.getBoundingClientRect();
		const rect = child.getBoundingClientRect();
		let lead;
		if (vertical) lead = rect.top - track.top;
		else if (rtl) lead = track.right - rect.right;
		else lead = rect.left - track.left;
		return lead + pos();
	};

	const sizeOf = (child) => {
		const rect = child.getBoundingClientRect();
		return vertical ? rect.height : rect.width;
	};

	const scrollTo = (px, behavior = 'auto') => {
		el.scrollTo(
			vertical
				? { top: sign * px, behavior }
				: { left: sign * px, behavior },
		);
	};

	// On a reversed axis the next item is to the left, so the keys swap.
	const nextKey = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
	const prevKey = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
	const keyDir = (key) => (key === nextKey ? 1 : key === prevKey ? -1 : 0);

	return {
		vertical,
		rtl,
		sign,
		pos,
		size,
		max,
		offsetOf,
		sizeOf,
		scrollTo,
		nextKey,
		prevKey,
		keyDir,
	};
};

const hasScrollEnd = typeof window !== 'undefined' && 'onscrollend' in window;

// Quiet period used after the last scroll event.
const SETTLE_MS = 150;

/**
 * Call `fn` once scrolling has settled.
 *
 * Uses `scrollend` when the browser has it, otherwise a 150ms quiet timer as the
 * fallback (browsers without `scrollend`, or when it never fires). Runs exactly
 * once per settle.
 *
 * @param {Element} el
 * @param {Function} fn
 * @returns {Function} off
 */
export const whenSettled = (el, fn) => {
	let timer;
	let armed = false;

	const fire = () => {
		if (!armed) return;
		armed = false;
		clearTimeout(timer);
		timer = undefined;
		fn();
	};

	const onScroll = () => {
		armed = true;
		clearTimeout(timer);
		timer = setTimeout(fire, SETTLE_MS);
	};

	el.addEventListener('scroll', onScroll, { passive: true });
	if (hasScrollEnd) el.addEventListener('scrollend', fire, { passive: true });

	const off = () => {
		clearTimeout(timer);
		timer = undefined;
		armed = false;
		el.removeEventListener('scroll', onScroll);
		el.removeEventListener('scrollend', fire);
	};

	registerCleanup(el, off);
	return off;
};
