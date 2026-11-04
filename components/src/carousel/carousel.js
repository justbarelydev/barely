/**
 * @justbarely/components - Carousel
 *
 * At its base this is a smart scrolling container with a current item, event
 * emitters, keyboard navigation, and a11y injection (if it's not already there).
 * You can add controls with [data-nav] wherever you want inside the component or
 * you can use [data-component="carousel-nav"] if you want to control a carousel
 * from a different part of the page.
 *
 *   <div data-component="carousel" data-items-to-show="3" data-mode="center">
 *     <div data-track>
 *       <button>Slide 1</button>
 *       <button>Slide 2</button>
 *     </div>
 *     <button data-nav="prev">←</button>
 *     <button data-nav="next">→</button>
 *   </div>
 *
 * Behavior:
 *   [data-items-to-show]   - items visible at once (default: 1)
 *   [data-items-to-scroll] - items per arrow press (default: items-to-show if present, or 1)
 *   [data-mode="center"]   - align the active item to the center
 *   [data-mode="vertical"] - scroll on the block axis (size the track yourself)
 *   [data-mode="index"]    - stacked items, no scroll
 *
 * Controls:
 *   [data-index]   - source of truth for carousel position - you can update this
 * 					  attribute from anywhere and it will update
 *   [data-nav]     - nested 'prev'/'next'/<number> buttons move this carousel
 *   <carousel-nav> - Separate component for external controls (prev/next/dots)
 * 					  that set index from anywhere else on the page
 *
 * State:
 *   data-index     - current item, 0-based
 *   data-active    - current active item
 *   data-can-prev  - there are items behind, you can go backward
 *   data-can-next  - there are items ahead, you can go forward
 *   data-page      - current page, 1-based, index + items-to-show
 *   data-total     - total page count
 *
 * Events:
 *   barely:beforechange -> { index, child, track }              (intent accepted)
 *   barely:afterchange  -> { index, page, total, child, track } (settled)
 *   barely:pagechange   -> { page, total }                      (page changed)
 *
 * Input:
 *   barely:carouselnav  -> { dir } steps, { index } goes to index
 *
 * Notes:
 * - `--gap` is the track's gap (read only by CSS) and needed to properly calculate
 *     item widths
 * - If you want to control multiple carousels you can just query them, loop over
 *   them, and set their data-index. carousel-nav does this for you, but only on
 *   the first carousel matching the given selector
 *
 * Important :
 *   measure()  items as intervals on an axis (horiztonal or vertical, direction)
 *   move()     fires on intent: keyboard, [data-nav], <carouselnav>, data-index change
 *   settle()   scrolling has settled, update state
 *   publish()  update state based on index
 */

import '../base.css';
import './carousel.css';

import {
	Barely,
	listen,
	resize,
	emit,
	els,
	setAttrs,
	hasMode,
	scrollAxis,
	whenSettled,
} from '@justbarely/engine';
import { toInt, clamp, lastReachable } from '@justbarely/core';
import {
	hasAccessibleName,
	nameNavControls,
	setNavCurrent,
	setNavDisabled,
} from './carousel-controls';
import { createPosition } from './position';
import { createPresenter } from './presenter';

export const Carousel = Barely.register('carousel', {
	refract: ['data-index', 'data-items-to-show', 'data-items-to-scroll'],
	watch: ['data-can-prev', 'data-can-next'],
	watchChildren: '[data-track]',
});

// state attributes
const PUBLISHED = ['canPrev', 'canNext', 'page', 'total'];

// config
const alignOf = (root) => (hasMode(root, 'center') ? 'center' : 'start');
const scrollable = (root) =>
	root._barelyPresenter?.scrollable ?? !hasMode(root, 'index');
const perPage = (root) =>
	Math.max(1, toInt(root.getAttribute('data-items-to-show'), 1));
const stepOf = (root) =>
	Math.max(
		1,
		toInt(root.getAttribute('data-items-to-scroll'), perPage(root)),
	);

// measurement

// measure each slide as {start, size} along the given axis. The axis gets rebuilt
// every time, so changing [data-mode] on the fly (horizontal <-> vertical) works
const measure = (root) => {
	const geo = root._barelyGeometry;
	if (!geo) return false;

	geo.axis = scrollAxis(geo.track, { vertical: hasMode(root, 'vertical') });
	if (geo.axis.size() === 0) return false;

	geo.items = [...geo.track.children].map((el) => ({
		start: geo.axis.offsetOf(el),
		size: geo.axis.sizeOf(el),
	}));

	// [data-mode="index"] stacks carousel items. it also handles [data-items-to-show]
	// with `grid-column` so you can stack sets
	if (hasMode(root, 'index')) {
		const per = perPage(root);
		[...geo.track.children].forEach((slide, i) => {
			slide.style.gridColumn = String((i % per) + 1);
		});
	}
	return true;
};

// re-measure if any children change size (lazy loading, images, etc)
const observeItems = (root) => {
	const geo = root._barelyGeometry;
	if (!geo) return;
	const children = [...geo.track.children];
	if (children.length) resize(root, children, () => settle(root));
};

// the last index the carousel will let you go to, depending on mode (center, rtl)
const lastIndexOf = (root) => {
	const geo = root._barelyGeometry;
	const count = geo?.items.length ?? 0;
	if (!count) return 0;
	if (!scrollable(root) || alignOf(root) === 'center' || geo.axis.max() <= 0)
		return count - 1;
	return lastReachable(
		geo.items,
		geo.axis.size(),
		geo.axis.max(),
		alignOf(root),
	);
};

const indexOf = (root) => {
	const geo = root._barelyGeometry;
	const value = Math.max(0, toInt(root.getAttribute('data-index'), 0));
	const count = geo?.items.length ?? 0;
	return count ? clamp(value, 0, count - 1) : value;
};

const pageOf = (root, index) => {
	const page = Math.floor(index / perPage(root)) + 1;
	// Ensure a trailing orphan item counts as its own page
	if (scrollable(root) && index === lastIndexOf(root)) return pageTotal(root);
	return page;
};

// Total pages counting trailing orphans as their own page
// (e.g. 5 items with 2 per page = 3 pages)
const pageTotal = (root) =>
	Math.ceil((root._barelyGeometry?.items.length ?? 0) / perPage(root));

// Project the current index onto the DOM as data-active, data-can-prev/next,
// and data-page/data-total. data-index is the source of truth.
const publish = (root, index) => {
	const geo = root._barelyGeometry;
	if (!geo?.items.length) return;

	const child = geo.track.children[index];
	const active = geo.track.querySelector('[data-active]');
	if (child && active !== child) {
		if (active) active.removeAttribute('data-active');
		child.setAttribute('data-active', '');
	}

	// Index mode shows the current page as a set. Mark which slides are in it,
	// so CSS can crossfade the whole page in and the previous one out.
	if (hasMode(root, 'index')) {
		const per = perPage(root);
		const start = Math.floor(index / per) * per;
		const end = Math.min(start + per, geo.items.length);
		[...geo.track.children].forEach((slide, i) => {
			if (i >= start && i < end) slide.setAttribute('data-in-page', '');
			else slide.removeAttribute('data-in-page');
		});
	}

	setNavCurrent(root, index);

	const next = {
		canPrev: index > 0,
		canNext: index < lastIndexOf(root),
		page: pageOf(root, index),
		total: pageTotal(root),
	};

	const prev = root._barelyPublished;
	if (prev && PUBLISHED.every((key) => prev[key] === next[key])) return;
	root._barelyPublished = next;

	setAttrs(root, {
		'data-can-prev': next.canPrev,
		'data-can-next': next.canNext,
		'data-page': next.page,
		'data-total': next.total,
	});
};

// Announce the current slide to screen readers
const announce = (root, index) => {
	const live = root._barelyLive;
	const count = root._barelyGeometry?.items.length ?? 0;
	if (!live || !count) return;

	const text = `Slide ${index + 1} of ${count}`;
	if (live._barelyText === text) return;
	live._barelyText = text;
	live.textContent = text;
};

// Fire off event + payload when index changes on settle
const emitSettled = (root, index) => {
	const geo = root._barelyGeometry;
	const total = pageTotal(root);
	const page = pageOf(root, index);

	if (root._barelyEmittedIndex !== index) {
		root._barelyEmittedIndex = index;
		emit(root, 'barely:afterchange', {
			index,
			page,
			total,
			child: geo.track.children[index],
			track: geo.track,
		});
	}

	if (root._barelyEmittedPage !== page) {
		root._barelyEmittedPage = page;
		emit(root, 'barely:pagechange', { page, total });
	}
};

// Handle step requests (direction) from [data-nav] prev/next, arrow keys, and
// external carouselnav {dir}. Numeric go-to and data-index updates are handled
// by onChange
const move = (root, intent) => {
	const geo = root._barelyGeometry;
	if (!geo?.items.length) return;

	const from = indexOf(root);
	const next = clamp(
		intent.index != null
			? toInt(intent.index, from)
			: from + intent.dir * stepOf(root),
		0,
		lastIndexOf(root),
	);

	// Skip if there's nowhere to go
	if (next === from) return;

	emit(root, 'barely:beforechange', {
		index: next,
		child: geo.track.children[next],
		track: geo.track,
	});

	root.setAttribute('data-index', next);
};

// Ensure hidden carousels respect their set index when they become visible
const applyPending = (root) => {
	if (root._barelyPending == null || !measure(root)) return;
	const pending = clamp(root._barelyPending, 0, lastIndexOf(root));
	root._barelyPending = null;

	if (root.getAttribute('data-index') !== String(pending))
		root.setAttribute('data-index', pending);

	publish(root, pending);
	root._barelyPresenter.scrollTo(pending, 'instant');
};

const settle = (root) => {
	if (root._barelyPending != null) return applyPending(root);
	if (!measure(root)) return;

	const position = root._barelyPosition;

	// Only read index when scrolling has truly settled
	if (!position.settleGate()) return;

	// This isn't an issue for index mode so just publish index and return
	if (!root._barelyPresenter.scrollable) {
		publish(root, indexOf(root));
		return;
	}

	const current = toInt(root.getAttribute('data-index'), -1);
	const nearest = position.nearest();

	if (!position.chosenHere(current) && nearest !== current) {
		// If index comes from where the scroll landed instead of from a
		// request, don't scroll to it. Mark it "reported" so the change handler
		// doesn't try to scroll back to it.
		position.markReported(nearest);
		root.setAttribute('data-index', nearest);
	}

	const index = indexOf(root);
	publish(root, index);
	announce(root, index);
	emitSettled(root, index);
};

Carousel.onMount((root) => {
	const track = els(root, '[data-track]')[0];
	if (!track) return;

	root._barelyGeometry = {
		track,
		axis: scrollAxis(track, { vertical: hasMode(root, 'vertical') }),
		items: [],
	};
	root._barelyPosition = createPosition(root._barelyGeometry, alignOf(root));
	// The presenter decides how data-index moves (native scroll or index mode's
	// no-scroll). More coming later (like transform/rAF)
	root._barelyPresenter = createPresenter(root, root._barelyPosition);

	if (!root.hasAttribute('role'))
		root.setAttribute('role', hasAccessibleName(root) ? 'region' : 'group');
	if (!root.hasAttribute('aria-roledescription'))
		root.setAttribute('aria-roledescription', 'carousel');

	// One live region per carousel (reused across re-mounts so we don't stack
	// them).
	let live = root.querySelector(':scope > [aria-live]');
	if (!live) {
		live = document.createElement('div');
		live.setAttribute('aria-live', 'polite');
		live.setAttribute('aria-atomic', 'true');
		root.appendChild(live);
	}
	root._barelyLive = live;

	// The scroll container is the tab stop, so keyboard scrolling is reachable
	// whatever the slides contain. No heuristic about focusable children.
	if (!track.hasAttribute('tabindex')) track.setAttribute('tabindex', '0');

	nameNavControls(root);
	setNavDisabled(root);
	setNavCurrent(root, indexOf(root));

	root._barelyPending = indexOf(root);
	applyPending(root);
	observeItems(root);

	// Mount doesn't count as a change so don't fire the change event
	root._barelyEmittedIndex = indexOf(root);
	root._barelyEmittedPage = pageOf(root, indexOf(root));
	setNavDisabled(root);

	whenSettled(track, () => settle(root));

	// Release the destination when the user manually interacts with the track
	const release = () => root._barelyPosition.release();
	listen(track, 'pointerdown', release);
	listen(track, 'wheel', release);

	// Layout appeared or changed
	resize(root, track, () => {
		if (root._barelyPending != null) applyPending(root);
		else settle(root);
	});

	listen(
		root,
		'click',
		(e, btn, root) => {
			const nav = btn.dataset.nav;
			if (nav === 'next') move(root, { dir: 1 });
			else if (nav === 'prev') move(root, { dir: -1 });
			else root.setAttribute('data-index', nav);
		},
		'[data-nav]',
	);

	// Listen for external carousel nav events and move the carousel accordingly
	listen(root, 'barely:carouselnav', (e) => {
		if (e.detail.index != null)
			root.setAttribute('data-index', e.detail.index);
		else move(root, { dir: e.detail.dir });
	});

	// Force arrows to change the index instead of scrolling natively
	listen(root, 'keydown', (e) => {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		if (e.target.closest('[data-component]') !== root) return;
		if (e.target.closest('input, textarea, select, [contenteditable]'))
			return;

		const dir = root._barelyGeometry.axis.keyDir(e.key);
		if (!dir) return;

		e.preventDefault();
		move(root, { dir });
	});
});

// When [data-index] changes, paint immediately and then scroll
Carousel.onChange('data-index', (root, value) => {
	const geo = root._barelyGeometry;
	if (!geo) return;

	if (!geo.items.length) {
		// Store pending request and apply it on the first measure
		root._barelyPending = toInt(value, 0);
		return;
	}

	const requested = toInt(value, 0);
	const fromViewport = root._barelyPosition.wasReported(requested);

	// Normalize the attribute once so data-index is always reachable
	const index = clamp(requested, 0, lastIndexOf(root));
	if (index !== requested) root.setAttribute('data-index', index);

	publish(root, index);

	// Index mode has no scroll so just announce and emit
	if (!root._barelyPresenter.scrollable) {
		announce(root, index);
		emitSettled(root, index);
		return;
	}

	// Skip scrolling when this index update came from where the scroll landed
	// Since the track is already there, and scrolling would snap it back.
	if (!fromViewport) root._barelyPresenter.scrollTo(index);
});

// Remeasure when [data-items-to-show] changes
Carousel.onChange('data-items-to-show', (root) => {
	if (!measure(root)) return;
	settle(root);
});

// Keep prev/next aria-disabled in sync
Carousel.onChange('data-can-prev', setNavDisabled);
Carousel.onChange('data-can-next', setNavDisabled);

Carousel.onChildUpdate((root) => {
	if (!measure(root)) return;
	observeItems(root);
	settle(root);
});
