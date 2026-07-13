/**
 * @justbarely/components — Carousel
 *
 *	<div data-component="carousel" data-items-to-show="3">
 *		<button data-nav="prev">←</button>
 *		<div data-track>
 *			<button>Slide 1</button>
 *			<button>Slide 2</button>
 *		</div>
 *		<button data-nav="next">→</button>
 *	</div>
 *
 * State attrs (on root):
 *   data-can-prev, data-can-next — toggle, set by syncState
 *   data-page — current page (1-based)
 *   data-total — total pages
 *
 * Config attrs:
 *   data-items-to-show  — how many items visible (default 1, refracted to --items-to-show)
 *   data-items-to-scroll — how many pages to advance per click (default 1)
 *
 * Events:
 *   barely:pagechange -> { page, total }
 *
 * Notes:
 * - update `--gap` variable when using items-to-show or it won't
 * calculate/update properly
 */

import {
	Barely,
	listen,
	resize,
	emit,
	children,
	setAttrs,
	debounce,
} from '@justbarely/engine';
import { toInt, toPage, pageCount, pageTarget } from '@justbarely/core';

export const Carousel = Barely.register('carousel', {
	refract: ['data-items-to-show', 'data-page', 'data-total'],
});

// Navigate the carousel by direction. Uses pageTarget for smooth page-based scrolling.
const go = (root, dir) => {
	const track = children(root, '[data-track]')[0];
	if (!track) return;

	const count = toInt(root.getAttribute('data-items-to-scroll'), 1);
	const { scrollLeft, clientWidth, scrollWidth } = track;
	const target = pageTarget(scrollLeft, clientWidth, scrollWidth, dir, count);

	track.scrollTo({ left: target, behavior: 'smooth' });
};

Carousel.onMount((root) => {
	const track = children(root, '[data-track]')[0];
	if (!track) return;

	// ARIA landmark + live region for screen reader announcements
	setAttrs(root, {
		role: 'region',
		'aria-roledescription': 'carousel',
	});

	const liveRegion = document.createElement('div');
	liveRegion.setAttribute('aria-live', 'polite');
	liveRegion.setAttribute('aria-atomic', 'true');
	root.appendChild(liveRegion);

	const syncState = () => {
		const threshold = 5;
		const { scrollLeft, clientWidth, scrollWidth } = track;

		setAttrs(root, {
			'data-can-prev': scrollLeft > threshold,
			'data-can-next': scrollLeft + clientWidth < scrollWidth - threshold,
			'data-page': toPage(scrollLeft, clientWidth) + 1,
			'data-total': pageCount(scrollWidth, clientWidth),
		});

		liveRegion.textContent = `Slide ${toPage(scrollLeft, clientWidth) + 1} of ${pageCount(scrollWidth, clientWidth)}`;
	};

	const emitPageChange = debounce(() => {
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
			const dir = btn.dataset.nav;
			if (dir === 'next') go(root, 1);
			else if (dir === 'prev') go(root, -1);
		},
		'[data-nav]',
	);
	resize(root, track, syncState);

	// Update the component on first run
	syncState();
});
