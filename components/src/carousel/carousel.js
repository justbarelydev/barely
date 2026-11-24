/**
 * Carousel - a smart scroll container with a current item.
 *
 *   <div data-component="carousel" data-items-to-show="3" data-mode="center">
 *     <div data-track>
 *       <div>Slide 1</div>
 *       <div>Slide 2</div>
 *     </div>
 *     <button data-nav="prev">←</button>
 *     <button data-nav="next">→</button>
 *   </div>
 *
 * `data-current` on the root is the source of truth: set it and the carousel
 * follows, regardless of who set it. Everything else on the root is derived from it.
 *
 * Config:
 *   data-items-to-show    - items visible at once (default 1; fractional is
 *                           scroll-drive only - the index drive floors it)
 *   data-items-to-scroll  - items per arrow press (default items-to-show, or 1)
 *   data-mode="center"    - align the active item to the center
 *   data-mode="vertical"  - scroll the block axis (needs a block-size somewhere)
 *   data-mode="index"     - stacked items, no scroll; CSS shows the current page
 *
 * Controls:
 *   [data-nav]            - nested prev/next/number buttons inside the carousel
 *   [data-component="carousel-nav"] - separate component for controls anywhere
 *                           else on the page, driven by data-for
 *   data-sync             - one-way follow (mirror another carousel's index)
 *
 * State - published by the component, never authored except data-current:
 *   data-current   - current item, 1-based (also the input)
 *   data-active    - marker on the current slide
 *   data-can-prev  - there is something behind
 *   data-can-next  - there is something ahead
 *   data-page      - current page, 1-based   (only with data-items-to-show)
 *   data-total     - page count              (only with data-items-to-show)
 *
 * Events:
 *   barely:beforechange -> { index, child, track }               intent accepted
 *   barely:afterchange  -> { index, page, total, child, track }  settled
 *                          (index and page both count from 1)
 *   barely:pagechange   -> { page, total }                       only with pages
 *
 * Input:
 *   barely:carouselnav  -> { dir } steps, { index } goes to that index
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
	ensureAttr,
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

const Carousel = Barely.register('carousel', {
	refract: ['data-current', 'data-items-to-show', 'data-items-to-scroll'],
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

	// A vertical carousel gets no height from layout: with none the track is as
	// tall as its slides, so it can't scroll and the controls are dead. Nothing
	// errors, so say it once (after a frame, in case a stylesheet loads late).
	if (
		hasMode(root, 'vertical') &&
		!hasMode(root, 'index') &&
		geo.track.childElementCount > perPage(root) &&
		geo.axis.max() === 0 &&
		!root._barelyHeightWarned
	)
		requestAnimationFrame(() => {
			if (root._barelyHeightWarned || geo.axis.max() > 0) return;
			root._barelyHeightWarned = true;
			console.warn(
				'[barely] carousel: a vertical carousel needs a height - on the carousel, on its [data-track], or stretched onto it by a flex or grid parent. A parent height alone does nothing: a block child stays content-tall. Without one the track is as tall as its slides and nothing scrolls.',
				root,
			);
		});

	// index mode stacks the items, one grid column per slot in the page
	if (hasMode(root, 'index')) {
		const per = perPage(root);
		[...geo.track.children].forEach((slide, i) => {
			slide.style.gridColumn = String((i % per) + 1);
		});
	}

	return true;
};

// These already announce a role worth keeping - a slide role would replace it.
const SLIDE_SKIP = new Set([
	'IMG',
	'VIDEO',
	'SVG',
	'INPUT',
	'BUTTON',
	'SELECT',
	'TEXTAREA',
	'A',
]);

// A slide is a group announced as "slide". Naming it is your job <3.
const markSlides = (root) => {
	const track = root._barelyGeometry?.track;
	if (!track) return;

	for (const slide of track.children) {
		if (SLIDE_SKIP.has(slide.tagName)) continue;
		ensureAttr(slide, 'role', 'group');
		ensureAttr(slide, 'aria-roledescription', 'slide');
	}
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

// While the attribute is 1-based (HTML), everything in here (JS) counts from 0
const indexOf = (root) => {
	const geo = root._barelyGeometry;
	const value = Math.max(1, toInt(root.getAttribute('data-current'), 1)) - 1;
	const count = geo?.items.length ?? 0;
	return count ? clamp(value, 0, count - 1) : value;
};

const setIndexOf = (root, index) =>
	root.setAttribute('data-current', String(index + 1));

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

// Pages exist whenever the author opts into pagination with
// data-items-to-show - even "1". Without the attribute, data-page would just
// be data-current, so it is dropped.
const hasPages = (root) => root.hasAttribute('data-items-to-show');

// Project the index onto the DOM: data-active, can-prev/next, page, total.
const publish = (root, index) => {
	const geo = root._barelyGeometry;
	if (!geo?.items.length) return;

	// The attr is the input and the published value. Write it on the first paint
	// so [data-current] and `--current` always exist.
	if (!root.hasAttribute('data-current')) setIndexOf(root, index);

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

	setNavCurrent(root, index + 1);

	const next = {
		canPrev: index > 0,
		canNext: index < lastIndexOf(root),
		page: hasPages(root) ? pageOf(root, index) : null,
		total: hasPages(root) ? pageTotal(root) : null,
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
	const page = hasPages(root) ? pageOf(root, index) : null;
	const total = hasPages(root) ? pageTotal(root) : null;

	if (root._barelyEmittedIndex !== index) {
		root._barelyEmittedIndex = index;
		emit(root, 'barely:afterchange', {
			index: index + 1,
			page,
			total,
			child: geo.track.children[index],
			track: geo.track,
		});
	}

	if (hasPages(root) && root._barelyEmittedPage !== page) {
		root._barelyEmittedPage = page;
		emit(root, 'barely:pagechange', { page, total });
	}
};

// Step requests from [data-nav] prev/next, arrow keys, and external
// carouselnav. Numeric go-to writes the attribute and lands in onChange.
const move = (root, { dir }) => {
	const geo = root._barelyGeometry;
	if (!geo?.items.length) return;

	const from = indexOf(root);
	const next = clamp(from + dir * stepOf(root), 0, lastIndexOf(root));

	if (next === from) return;

	emit(root, 'barely:beforechange', {
		index: next + 1,
		child: geo.track.children[next],
		track: geo.track,
	});

	setIndexOf(root, next);
};

// Ensure hidden carousels respect their set index when they become visible
const applyPending = (root) => {
	if (root._barelyPending == null || !measure(root)) return;
	const pending = clamp(root._barelyPending, 0, lastIndexOf(root));
	root._barelyPending = null;

	if (indexOf(root) !== pending) setIndexOf(root, pending);

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

	const attr = root.getAttribute('data-current');
	const current = attr == null ? -1 : toInt(attr, 1) - 1;
	const nearest = position.nearest();

	if (!position.chosenHere(current) && nearest !== current) {
		// If index comes from where the scroll landed instead of from a
		// request, don't scroll to it. Mark it "reported" so the change handler
		// doesn't try to scroll back to it.
		position.markReported(nearest);
		setIndexOf(root, nearest);
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
	// The presenter decides how the index moves: native scroll, or index mode's
	// no-scroll.
	root._barelyPresenter = createPresenter(root, root._barelyPosition);

	if (!root.hasAttribute('role'))
		root.setAttribute('role', hasAccessibleName(root) ? 'region' : 'group');
	if (!root.hasAttribute('aria-roledescription'))
		root.setAttribute('aria-roledescription', 'carousel');

	// One live region per carousel, marked [data-live] so re-mounts find it again
	// and an aria-live inside a slide is never mistaken for it.
	let live = root.querySelector('[data-live]');
	if (!live) {
		live = document.createElement('div');
		live.setAttribute('data-live', '');
		root.appendChild(live);
	}
	if (!live.hasAttribute('aria-live'))
		live.setAttribute('aria-live', 'polite');
	if (!live.hasAttribute('aria-atomic'))
		live.setAttribute('aria-atomic', 'true');
	root._barelyLive = live;

	// The scroll container is the tab stop, so keyboard scrolling is reachable
	// whatever the slides contain. No heuristic about focusable children.
	if (!track.hasAttribute('tabindex')) track.setAttribute('tabindex', '0');

	nameNavControls(root);
	setNavDisabled(root);
	setNavCurrent(root, indexOf(root) + 1);
	markSlides(root);

	root._barelyPending = indexOf(root);
	applyPending(root);
	observeItems(root);

	// Mount doesn't count as a change so don't fire the change event
	root._barelyEmittedIndex = indexOf(root);
	root._barelyEmittedPage = hasPages(root)
		? pageOf(root, indexOf(root))
		: null;
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
			else root.setAttribute('data-current', nav);
		},
		'[data-nav]',
	);

	// Listen for external carousel nav events and move the carousel accordingly
	listen(root, 'barely:carouselnav', (e) => {
		if (e.detail.index != null)
			root.setAttribute('data-current', e.detail.index);
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

// When [data-current] changes, paint immediately and then scroll
Carousel.onChange('data-current', (root, value) => {
	const geo = root._barelyGeometry;
	if (!geo) return;

	if (!geo.items.length) {
		// Store pending request and apply it on the first measure
		root._barelyPending = toInt(value, 1) - 1;
		return;
	}

	const requested = toInt(value, 1) - 1;
	const fromViewport = root._barelyPosition.wasReported(requested);

	// Normalize the attribute once so data-current is always reachable
	const index = clamp(requested, 0, lastIndexOf(root));
	if (index !== requested) setIndexOf(root, index);

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
	markSlides(root);
	if (!measure(root)) return;
	observeItems(root);
	settle(root);
});
