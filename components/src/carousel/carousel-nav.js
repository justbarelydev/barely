/**
 * Carousel Nav - controls for a carousel, from anywhere on the page.
 *
 *   <div data-component="carousel-nav" data-for="#gallery">
 *     <button data-nav="prev">Prev</button>
 *     <button data-nav="next">Next</button>
 *     <button data-nav="2">Go to slide 3</button>
 *   </div>
 *
 * Emits the same way as a nested [data-nav] (barely:carouselnav) so the
 * carousel stays in control. One tab stop for the strip, arrows/keys move and
 * select, Home/End keys jump to the beginning/end.
 *
 * Config:
 *   data-for              - selector for the carousel to drive (required)
 *   data-mode="vertical"  - rove up/down and announce the block axis
 *   data-nav              - "prev", "next", or a slide number
 *
 * State - mirrored from the carousel through data-for, never authored here:
 *   data-index, data-can-prev, data-can-next
 *
 * Paints aria-current on the current number and aria-disabled on prev/next, and
 * names icon-only controls ("Go to slide 3"). Any name you provide yourself
 * always wins over the generated one.
 */

import '../base.css';
import './carousel-nav.css';

import { clamp } from '@justbarely/core';
import {
	Barely,
	emit,
	listen,
	sync,
	els,
	setAttrs,
	hasMode,
	scrollAxis,
	rovingTabindex,
	bindKeynav,
} from '@justbarely/engine';
import {
	hasAccessibleName,
	nameNavControls,
	setNavCurrent,
	setNavDisabled,
} from './carousel-controls';

const CarouselNav = Barely.register('carousel-nav', {
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

	const vertical = hasMode(root, 'vertical');
	const controls = els(root, '[data-nav]');
	const numbered = controls.filter((el) => /^\d+$/.test(el.dataset.nav));

	// An authored role wins. Otherwise toolbar (numbered buttons rove as one tab
	// stop) or group (prev/next only) - never tablist, there is no tabpanel.
	if (!root.hasAttribute('role'))
		root.setAttribute('role', numbered.length ? 'toolbar' : 'group');

	// Use the target's aria-labelledby, not its text: the browser resolves it, so
	// the name tracks the heading instead of drifting from it.
	if (!hasAccessibleName(root)) {
		const ids = target.getAttribute('aria-labelledby');
		if (ids) root.setAttribute('aria-labelledby', ids);
		else root.setAttribute('aria-label', 'Carousel controls');
	}

	sync(root, root.dataset.for, [
		'data-index',
		'data-can-prev',
		'data-can-next',
	]);
	nameNavControls(root);
	setNavDisabled(root);
	setNavCurrent(root);

	// Navigate the target carousel using custom events so it maintains control
	// of its own navigation
	const navigate = (nav) => {
		if (nav === 'next') emit(target, 'barely:carouselnav', { dir: 1 });
		else if (nav === 'prev')
			emit(target, 'barely:carouselnav', { dir: -1 });
		else if (nav != null)
			emit(target, 'barely:carouselnav', { index: nav });
	};

	if (numbered.length) {
		// Keyboard navigation focus and select when pressed. They also rove
		// (jump from the end to the beginning and vice versa).
		// [data-nav="prev/next"] does not rove.
		setAttrs(root, { 'aria-orientation': vertical ? 'vertical' : null });

		const current = numbered.findIndex(
			(el) => el.dataset.nav === String(root.dataset.index),
		);
		rovingTabindex(numbered, current === -1 ? 0 : current);

		bindKeynav(root, {
			items: numbered,
			delegate: '[data-nav]',
			orientation: vertical ? 'vertical' : 'horizontal',
			active: () => numbered.indexOf(document.activeElement),
			activate: (i, button) => navigate(button.dataset.nav),
			activateOnArrow: true,
		});
	}

	listen(root, 'click', (e, btn) => navigate(btn.dataset.nav), '[data-nav]');
});

// Keep the current active control item in view by reading the mirrored index
// and scrolling (without writing any state)
const followActive = (root, index) => {
	const control = root.querySelector(`[data-nav="${index}"]`);
	if (!control) return;

	const axis = scrollAxis(root, { vertical: hasMode(root, 'vertical') });
	if (axis.max() <= 0) return;

	const centered =
		axis.offsetOf(control) + axis.sizeOf(control) / 2 - axis.size() / 2;
	axis.scrollTo(clamp(centered, 0, axis.max()));
};

CarouselNav.onChange('data-can-prev', setNavDisabled);
CarouselNav.onChange('data-can-next', setNavDisabled);
CarouselNav.onChange('data-index', setNavCurrent);
CarouselNav.onChange('data-index', followActive);
