/**
 * @justbarely/components — Carousel
 *
 *	<div data-component="carousel" data-items-to-show="3.5" data-mode="center">
 *		<button data-nav="prev">←</button>
 *		<div data-track>
 *			<button>Slide 1</button>
 *			<button>Slide 2</button>
 *		</div>
 *		<button data-nav="next">→</button>
 *	</div>
 *
 * State attrs (on root):
 *   data-can-prev, data-can-next — arrow visibility (boolean)
 *   data-index — current item index (0-based). Set from anywhere for go-to
 *
 * Config attrs:
 *   data-items-to-show   — items visible at once (default 1, refracted to --items-to-show)
 *   data-items-to-scroll — items to advance per arrow click (default 1)
 *   data-mode="center"   — active item is centered in the carousel
 *
 * Events:
 *   barely:pagechange -> { page, total }
 *
 * Notes:
 * - update `--gap` CSS variable when using items-to-show or it won't
 *   calculate/update properly
 */

import {
	Barely,
	listen,
	resize,
	emit,
	debounce,
	children,
	setAttrs,
	hasMode,
} from '@justbarely/engine';
import { toInt, clamp, toPage, pageCount } from '@justbarely/core';

export const Carousel = Barely.register('carousel', {
	refract: ['data-index', 'data-items-to-show', 'data-items-to-scroll'],
	watchChildren: '[data-track]',
});

// Build a cache of all child offsets and store it on the component element
// Called on mount, resize, items-to-show change, and childList mutations
const cacheOffsets = (root, track) => {
	const trackRect = track.getBoundingClientRect();
	root._offsets = [...track.children].map((el) => {
		const rect = el.getBoundingClientRect();
		return { left: rect.left - trackRect.left, width: rect.width };
	});
};

// Get which visible child is currently first or centered (from cached offsets)
// Used by go() so it advances from actual scroll position, not from
// [data-index] (which avoids the bidirectional feedback loop).
const getCurrentIndex = (root, track, centerMode) => {
	const offsets = root._offsets;
	const { scrollLeft, clientWidth } = track;
	// 1px tolerance to avoid sub-pixel rounding errors on high-DPI displays
	// (because getBoundingClientRect() returns floats but offsetLeft is an int)
	const SUB_PIXEL_TOLERANCE = 1;

	if (centerMode) {
		const mid = scrollLeft + clientWidth / 2;
		for (let i = 0; i < offsets.length; i++) {
			if (
				offsets[i].left - SUB_PIXEL_TOLERANCE <= mid &&
				offsets[i].left + offsets[i].width + SUB_PIXEL_TOLERANCE >= mid
			)
				return i;
		}
	} else {
		for (let i = offsets.length - 1; i >= 0; i--) {
			if (offsets[i].left - SUB_PIXEL_TOLERANCE <= scrollLeft + 5)
				return i;
		}
	}
	return 0;
};

// Target scroll position for a child index, clamped to valid range.
const scrollTarget = (root, track, idx) => {
	const offsets = root._offsets;
	const { left, width } = offsets[idx];
	const target = hasMode(root, 'center')
		? left - (track.clientWidth - width) / 2
		: left;
	const maxScroll = track.scrollWidth - track.clientWidth;
	return Math.min(Math.max(0, target), maxScroll);
};

// Navigate by advancing items-to-scroll items from the current scroll position
// Sets _skip so onEffect doesn't double-scroll, then calls scrollTo directly
// Never reads [data-index] to avoid feedback loops
const go = (root, dir) => {
	const track = root._track;
	if (!track) return;

	const itemsToScroll = root.getAttribute('data-items-to-scroll');
	const itemsToShow = root.getAttribute('data-items-to-show');
	const count = toInt(itemsToScroll, toInt(itemsToShow, 1));
	const centerMode = hasMode(root, 'center');
	const index = getCurrentIndex(root, track, centerMode);
	const next = clamp(index + dir * count, 0, track.children.length - 1);

	root._skip = true;
	root.setAttribute('data-index', next);
	track.scrollTo({
		left: scrollTarget(root, track, next),
	});
};

Carousel.onMount((root) => {
	const track = children(root, '[data-track]')[0];
	if (!track) return;
	root._track = track;

	setAttrs(root, { role: 'region', 'aria-roledescription': 'carousel' });

	// Inject live region for even more ARIA
	const liveRegion = document.createElement('div');
	liveRegion.setAttribute('aria-live', 'polite');
	liveRegion.setAttribute('aria-atomic', 'true');
	root.appendChild(liveRegion);

	const centerMode = hasMode(root, 'center');
	cacheOffsets(root, track);

	// Sync arrows, [data-active], [data-index], and live region on scroll
	// Only writes to the DOM when values change
	const syncState = (() => {
		let _prev = false,
			_next = false,
			_text = '';

		return () => {
			const { scrollLeft, clientWidth, scrollWidth } = track;
			const canPrev = scrollLeft > 5;
			const canNext = scrollLeft + clientWidth < scrollWidth - 5;

			if (canPrev !== _prev || canNext !== _next) {
				setAttrs(root, {
					'data-can-prev': canPrev,
					'data-can-next': canNext,
				});
				_prev = canPrev;
				_next = canNext;
			}

			// Sync data-active from current scroll position
			const index = getCurrentIndex(root, track, centerMode);
			const child = track.children[index];
			const active = track.querySelector('[data-active]');
			if (active !== child) {
				if (active) active.removeAttribute('data-active');
				child.setAttribute('data-active', '');
			}

			// Sync [data-index] from scroll position (go() reads scroll, not attr)
			// Skip during init to avoid overwriting existing [data-index]
			if (!root._initing) {
				const current = toInt(root.getAttribute('data-index'), -1);
				if (index !== current) {
					root._skip = true;
					root.setAttribute('data-index', index);
				}
			}
			const text = `Slide ${toPage(scrollLeft, clientWidth) + 1} of ${pageCount(scrollWidth, clientWidth)}`;
			if (_text !== text) {
				liveRegion.textContent = text;
				_text = text;
			}
		};
	})();

	const emitPageChange = debounce(() => {
		// If _stamp has changed since the debounce started, an external
		// [data-index] set happened while we were waiting. Skip overwrite.
		const stamp = root._stamp;
		const index = getCurrentIndex(root, track, centerMode);
		if (root._stamp === stamp) {
			const current = toInt(root.getAttribute('data-index'), -1);
			if (index !== current) {
				root._skip = true;
				root.setAttribute('data-index', index);
			}
		}

		emit(root, 'barely:pagechange', {
			page: toPage(track.scrollLeft, track.clientWidth) + 1,
			total: pageCount(track.scrollWidth, track.clientWidth),
		});
	});

	// Listeners
	let frameId;
	listen(track, 'scroll', () => {
		cancelAnimationFrame(frameId);
		frameId = requestAnimationFrame(syncState);
		emitPageChange();
	});

	listen(
		root,
		'click',
		(e, btn, root) => {
			const nav = btn.dataset.nav;
			if (nav === 'next') go(root, 1);
			else if (nav === 'prev') go(root, -1);
			else root.setAttribute('data-index', nav);
		},
		'[data-nav]',
	);

	// Rebuild cache and sync when resizing
	resize(root, track, () => {
		cacheOffsets(root, track);
		syncState();
	});

	// Store syncState for onChildrenUpdate
	root._syncState = syncState;

	// Init
	root._initing = true;
	syncState();

	// Respect existing [data-index]
	if (root.hasAttribute('data-index')) {
		const presetIndex = clamp(
			toInt(root.getAttribute('data-index'), 0),
			0,
			track.children.length - 1,
		);
		root._skip = true;
		root.setAttribute('data-index', presetIndex);
		track.scrollTo({
			left: scrollTarget(root, track, presetIndex),
			behavior: 'instant',
		});
	} else {
		// Default to 0 index
		root.setAttribute('data-index', '0');
	}
	root._initing = false;
});

// Rebuild cache when [data-items-to-show] changes
Carousel.onEffect('data-items-to-show', (root) => {
	const track = root._track;
	if (!track) return;
	cacheOffsets(root, track);
});

// Handle [data-index] changes
Carousel.onEffect('data-index', (root, value) => {
	const track = root._track;
	if (!track) return;

	const index = clamp(toInt(value, 0), 0, track.children.length - 1);
	const child = track.children[index];
	if (!child) return;

	// Sync data-active to the requested index
	const active = track.querySelector('[data-active]');
	if (active !== child) {
		if (active) active.removeAttribute('data-active');
		child.setAttribute('data-active', '');
	}

	// Skip scroll when set internally from go() or emitPageChange to avoid an
	// attr update loop
	if (root._skip) {
		root._skip = false;
		return;
	}

	// Bump stamp so pending emitPageChange won't overwrite
	root._stamp = (root._stamp || 0) + 1;

	if (track.scrollWidth <= track.clientWidth + 5) return;

	track.scrollTo({
		left: scrollTarget(root, track, index),
	});
});

// Rebuild cache when children change
Carousel.onChildUpdate((root) => {
	const track = root._track;
	if (!track) return;
	cacheOffsets(root, track);
	root._syncState?.();
});
