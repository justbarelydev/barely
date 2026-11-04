/**
 * @justbarely/components - Carousel Nav
 *
 * External carousel controls. You can use this anywhere to drive the carousel
 * matching [data-for] (via the barely:carouselnav intent event), so
 * `beforechange` fires exactly like nested [data-nav].
 *
 *   <div data-component="carousel-nav" data-for="#gallery">
 *     <button data-nav="prev">Prev</button>
 *     <button data-nav="next">Next</button>
 *     <button data-nav="2">Go to slide 3</button>
 *   </div>
 *
 * Config attrs:
 *	[data-nav]           - numbers are zero-based slide indexes, same as [data-index]
 *	[data-mode="scroll"] - the filmstrip form: horizontal scroll + snap. The
 *                        current control stays centered as the target's index
 *                        changes (output-only, doesn't write state)
 */

import '../base.css';
import './carousel-nav.css';

import { Barely, emit, listen, sync } from '@justbarely/engine';
import {
	hasAccessibleName,
	nameNavControls,
	setNavCurrent,
	setNavDisabled,
} from './carousel-controls';

export const CarouselNav = Barely.register('carousel-nav', {
	watch: ['data-index', 'data-can-prev', 'data-can-next'],
});

CarouselNav.onMount((root) => {
	const target = document.querySelector(root.dataset.for);
	if (!target) {
		console.warn(
			`[barely] carousel-nav: target "${root.dataset.for}" not found`,
		);
		return;
	}

	if (!root.hasAttribute('role')) root.setAttribute('role', 'group');
	if (!hasAccessibleName(root))
		root.setAttribute('aria-label', 'Carousel controls');

	sync(root, root.dataset.for, [
		'data-index',
		'data-can-prev',
		'data-can-next',
	]);
	nameNavControls(root);
	setNavDisabled(root);
	setNavCurrent(root);

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

// Keep the current control in view. A projection, not a state change: it reads
// the mirrored index and moves only this nav's own scroll container, so it
// never writes state and never scrolls the page. Skipped when nothing
// overflows, and the smoothness is left to CSS `scroll-behavior` (which the
// reduced-motion branch turns off).
const followActive = (root, index) => {
	if (root.scrollWidth <= root.clientWidth) return;

	const control = root.querySelector(`[data-nav="${index}"]`);
	if (!control) return;

	const rect = control.getBoundingClientRect();
	const left =
		root.scrollLeft +
		rect.left -
		root.getBoundingClientRect().left -
		(root.clientWidth - rect.width) / 2;

	root.scrollTo({ left: Math.max(0, left) });
};

CarouselNav.onChange('data-can-prev', setNavDisabled);
CarouselNav.onChange('data-can-next', setNavDisabled);
CarouselNav.onChange('data-index', setNavCurrent);
CarouselNav.onChange('data-index', followActive);
