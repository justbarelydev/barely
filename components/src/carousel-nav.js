/**
 * @justbarely/components - Carousel Nav
 *
 * External carousel controls. Put the buttons anywhere; they drive the
 * carousel matching [data-for] through the barely:carouselnav intent event, so
 * go() and barely:beforechange fire exactly like nested [data-nav].
 *
 *   <div data-component="carousel-nav" data-for="#gallery">
 *     <button data-nav="prev">Prev</button>
 *     <button data-nav="next">Next</button>
 *     <button data-nav="3">Go to 3</button>
 *   </div>
 */

import { Barely, emit, listen } from '@justbarely/engine';

export const CarouselNav = Barely.register('carousel-nav');

CarouselNav.onMount((root) => {
	const target = document.querySelector(root.dataset.for);
	if (!target) {
		console.warn(
			`[barely] carousel-nav: target "${root.dataset.for}" not found`,
		);
		return;
	}

	listen(
		root,
		'click',
		(e, btn) => {
			const nav = btn.dataset.nav;
			if (nav === 'next') emit(target, 'barely:carouselnav', { dir: 1 });
			else if (nav === 'prev')
				emit(target, 'barely:carouselnav', { dir: -1 });
			else if (nav != null)
				emit(target, 'barely:carouselnav', { index: nav });
		},
		'[data-nav]',
	);
});
