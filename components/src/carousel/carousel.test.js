// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Registry, initElement } from '../../../engine/src/registry.js';
import { attachAttrMO } from '../../../engine/src/mutation.js';
import './carousel.js';

// happy-dom advertises scrollend but never dispatches it, so settling falls
// through to the quiet-period trigger. 150ms + a frame of slack.
const settleWait = () => new Promise((resolve) => setTimeout(resolve, 220));
const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

const makeCarousel = (
	id,
	{
		index,
		mode,
		itemsToShow,
		itemsToScroll,
		slides = 5,
		size = 100,
		viewport = 100,
		nav = false,
		dots = [],
		mount = true,
		ariaLabel,
		title,
		role,
		tabindex,
	} = {},
) => {
	const root = document.createElement('div');
	root.id = id;
	root.setAttribute('data-component', 'carousel');
	if (mode) root.dataset.mode = mode;
	if (itemsToShow) root.setAttribute('data-items-to-show', String(itemsToShow));
	if (itemsToScroll)
		root.setAttribute('data-items-to-scroll', String(itemsToScroll));
	if (ariaLabel) root.setAttribute('aria-label', ariaLabel);
	if (title) root.setAttribute('title', title);
	if (role) root.setAttribute('role', role);
	if (tabindex != null) root.setAttribute('tabindex', tabindex);
	if (index != null) root.setAttribute('data-index', index);

	const vertical = mode?.includes('vertical');
	const indexDriven = mode?.includes('index');

	const track = document.createElement('div');
	track.setAttribute('data-track', '');
	// The index drive is a grid: every slide shares one cell, nothing scrolls.
	const extent = indexDriven ? size : slides * size;
	Object.defineProperties(track, {
		clientWidth: { configurable: true, value: vertical ? 0 : viewport },
		scrollWidth: { configurable: true, value: vertical ? 0 : extent },
		clientHeight: { configurable: true, value: vertical ? viewport : 0 },
		scrollHeight: { configurable: true, value: vertical ? extent : 0 },
	});
	track.scrollLeft = 0;
	track.scrollTop = 0;
	track.getBoundingClientRect = () => ({
		left: 0,
		right: viewport,
		top: 0,
		bottom: viewport,
	});
	track.scrollTo = vi.fn(({ left, top }) => {
		if (left != null) track.scrollLeft = left;
		if (top != null) track.scrollTop = top;
	});

	for (let i = 0; i < slides; i++) {
		const slide = document.createElement('div');
		slide.getBoundingClientRect = () => ({
			left: i * size - (vertical ? 0 : track.scrollLeft),
			right: (i + 1) * size - (vertical ? 0 : track.scrollLeft),
			top: i * size - (vertical ? track.scrollTop : 0),
			bottom: (i + 1) * size - (vertical ? track.scrollTop : 0),
			width: size,
			height: size,
		});
		track.appendChild(slide);
	}

	root.appendChild(track);

	if (nav) {
		for (const name of ['prev', 'next']) {
			const button = document.createElement('button');
			button.dataset.nav = name;
			button.textContent = name === 'prev' ? '←' : '→';
			root.appendChild(button);
		}
	}
	for (const n of dots) {
		const dot = document.createElement('button');
		dot.dataset.nav = String(n);
		dot.textContent = '•';
		root.appendChild(dot);
	}

	document.body.appendChild(root);
	if (mount) {
		initElement(root);
		attachAttrMO(root, Registry.get('carousel'));
	}
	return { root, track };
};

const navButton = (root, name) => root.querySelector(`[data-nav="${name}"]`);
const scrollTrack = (track) => track.dispatchEvent(new Event('scroll'));

afterEach(() => {
	document.body.replaceChildren();
	vi.restoreAllMocks();
});

describe('carousel state', () => {
	it('mounts with the first item painted and the boundaries set', () => {
		const { root, track } = makeCarousel('basic');

		expect(root.getAttribute('data-index')).toBe('0');
		expect(track.children[0].hasAttribute('data-active')).toBe(true);
		expect(root.hasAttribute('data-can-prev')).toBe(false);
		expect(root.hasAttribute('data-can-next')).toBe(true);
		// No data-items-to-show: there are no pages, just one item per view.
		expect(root.hasAttribute('data-page')).toBe(false);
		expect(root.hasAttribute('data-total')).toBe(false);
	});

	it('makes the scroll container the tab stop, not the root', () => {
		const { root, track } = makeCarousel('focus', { ariaLabel: 'Gallery' });
		expect(track.getAttribute('tabindex')).toBe('0');
		expect(root.hasAttribute('tabindex')).toBe(false);
		expect(root.getAttribute('role')).toBe('region');
		expect(root.getAttribute('aria-roledescription')).toBe('carousel');
	});

	it('honors an authored data-index', () => {
		const { root, track } = makeCarousel('authored', { index: '2' });

		expect(root.getAttribute('data-index')).toBe('2');
		expect(track.children[2].hasAttribute('data-active')).toBe(true);
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 200,
			behavior: 'instant',
		});
	});

	it('keeps the requested index while a programmatic scroll runs', async () => {
		const { root, track } = makeCarousel('jump', { index: '0' });

		root.setAttribute('data-index', '4');
		await flush();

		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 400,
			behavior: 'auto',
		});
		expect(root.getAttribute('data-index')).toBe('4');
		expect(track.children[4].hasAttribute('data-active')).toBe(true);
	});

	it('does not reinterpret a partial position while an intent is in flight', async () => {
		const { root, track } = makeCarousel('flight', { index: '0', nav: true });

		root.setAttribute('data-index', '4');
		await flush();

		// The browser has only moved part of the way (the scroll is animating).
		track.scrollLeft = 150;
		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();

		// Nearest-to-150 would be index 1; the intent says where we are going.
		expect(root.getAttribute('data-index')).toBe('4');

		// Arrived: nothing left to correct.
		track.scrollLeft = 400;
		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();
		expect(root.getAttribute('data-index')).toBe('4');
	});

	it('gives up on a destination the track never reaches', async () => {
		const { root, track } = makeCarousel('stuck', { index: '0' });

		root.setAttribute('data-index', '4');
		await flush();

		// The animation is interrupted and never arrives.
		track.scrollLeft = 150;

		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();
		expect(root.getAttribute('data-index')).toBe('4');

		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();

		// Second settle with no movement: take the real position.
		expect(root.getAttribute('data-index')).toBe('1');
	});

	it('hands the index back to the user when they grab the track', async () => {
		const { root, track } = makeCarousel('takeover', { index: '0' });

		root.setAttribute('data-index', '4');
		await flush();

		track.dispatchEvent(new Event('pointerdown'));
		track.scrollLeft = 150;
		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();

		expect(root.getAttribute('data-index')).toBe('1');
	});

	it('settles to the item nearest the resting position', async () => {
		const { root, track } = makeCarousel('follow', { index: '0' });

		track.scrollLeft = 150;
		scrollTrack(track);
		await settleWait();

		expect(root.getAttribute('data-index')).toBe('1');
		expect(track.children[1].hasAttribute('data-active')).toBe(true);
	});

	it('leaves a manual scroll where it landed, even off an item start', async () => {
		// 6 cards of 100 in a 250 viewport: max is 350, which is not an item
		// start. The browser owns that resting place.
		const { root, track } = makeCarousel('landing', {
			slides: 6,
			viewport: 250,
		});

		track.scrollLeft = 350;
		scrollTrack(track);
		await settleWait();

		expect(root.getAttribute('data-index')).toBe('3');
		expect(track.scrollLeft).toBe(350);
		expect(track.scrollTo).not.toHaveBeenCalled();
	});

	it('still scrolls when an intent asks for an index', async () => {
		const { root, track } = makeCarousel('intent-scroll', {
			slides: 6,
			viewport: 250,
		});

		root.setAttribute('data-index', '2');
		await flush();

		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 200,
			behavior: 'auto',
		});
	});

	it('announces the settled slide, not intermediate ones', async () => {
		const { root, track } = makeCarousel('announce', { index: '0' });
		const live = root.querySelector('[aria-live]');

		expect(live.textContent).toBe('');

		track.scrollLeft = 300;
		scrollTrack(track);
		await settleWait();

		expect(live.textContent).toBe('Slide 4 of 5');
	});

	it('emits afterchange once intent has landed', async () => {
		const { root } = makeCarousel('events', { index: '0', nav: true });
		const before = [];
		const after = [];
		root.addEventListener('barely:beforechange', (e) =>
			before.push(e.detail.index),
		);
		root.addEventListener('barely:afterchange', (e) =>
			after.push(e.detail.index),
		);

		navButton(root, 'next').click();
		await flush();
		expect(before).toEqual([1]);
		expect(after).toEqual([]);

		root.querySelector('[data-track]').dispatchEvent(new Event('scroll'));
		await settleWait();
		expect(after).toEqual([1]);
	});
});

describe('carousel stepping', () => {
	it('stops at the last reachable index when items-to-show > 1', async () => {
		const { root, track } = makeCarousel('multi', {
			nav: true,
			slides: 8,
			viewport: 300,
			itemsToShow: 3,
		});
		const next = navButton(root, 'next');

		next.click();
		await flush();
		expect(root.getAttribute('data-index')).toBe('3');
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 300,
			behavior: 'auto',
		});

		// Index 6 can never lead with 3 showing; the track stops at 5.
		next.click();
		await flush();
		expect(root.getAttribute('data-index')).toBe('5');
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 500,
			behavior: 'auto',
		});
		expect(next.getAttribute('aria-disabled')).toBe('true');

		// Nowhere left to go: no scroll, no relabel.
		next.click();
		await flush();
		expect(root.getAttribute('data-index')).toBe('5');
	});

	it('normalizes a requested index past the last reachable one', async () => {
		const { root } = makeCarousel('clamp', { slides: 8, viewport: 300, itemsToShow: 3 });

		root.setAttribute('data-index', '7');
		await flush();
		await flush();

		expect(root.getAttribute('data-index')).toBe('5');
	});

	it('lets every index be selected when nothing can scroll', async () => {
		// 3 cards in a 500 viewport: no scroll range at all.
		const { root, track } = makeCarousel('no-scroll', {
			slides: 3,
			viewport: 500,
		});

		root.setAttribute('data-index', '2');
		await flush();

		expect(root.getAttribute('data-index')).toBe('2');
		expect(track.children[2].hasAttribute('data-active')).toBe(true);
	});

	it('lets a centered carousel select its last item', async () => {
		// 5 items of 100 in a 300 viewport: only index 3 can be centered.
		const { root, track } = makeCarousel('center-end', {
			mode: 'center',
			viewport: 300,
			nav: true,
		});

		root.setAttribute('data-index', '4');
		await flush();

		expect(root.getAttribute('data-index')).toBe('4');
		expect(track.children[4].hasAttribute('data-active')).toBe(true);
		expect(navButton(root, 'next').getAttribute('aria-disabled')).toBe('true');
	});

	it('steps by one even when the edge item cannot center', async () => {
		// 5 items of 100 in a 300 viewport: item 0 and item 1 both rest at 0
		// (neither can center). The index still advances by exactly one - the
		// step is a state change, not a promise to scroll.
		const { root, track } = makeCarousel('center-step', {
			mode: 'center',
			viewport: 300,
			nav: true,
		});

		navButton(root, 'next').click();
		await flush();
		expect(root.getAttribute('data-index')).toBe('1');
		expect(track.children[1].hasAttribute('data-active')).toBe(true);
	});

	it('keeps pages when items-to-show is authored as 1', async () => {
		// An explicit items-to-show opts into pagination, even at 1 per page:
		// data-page is then index + 1 rather than dropped.
		const { root } = makeCarousel('one-per-page', {
			slides: 5,
			itemsToShow: 1,
		});

		expect(root.getAttribute('data-page')).toBe('1');
		expect(root.getAttribute('data-total')).toBe('5');

		root.setAttribute('data-index', '3');
		await flush();
		expect(root.getAttribute('data-page')).toBe('4');
	});

	it('counts a trailing orphan as its own page', async () => {
		// 7 items, 2 shown: pages 1 (0-1), 2 (2-3), 3 (4-5), and 4 (6 alone).
		const { root } = makeCarousel('orphan-pages', {
			slides: 7,
			viewport: 200,
			itemsToShow: 2,
		});

		expect(root.getAttribute('data-total')).toBe('4');

		// The last reachable anchor is 5 (showing 5-6): the final page.
		root.setAttribute('data-index', '5');
		await flush();
		expect(root.getAttribute('data-page')).toBe('4');
		expect(root.getAttribute('data-total')).toBe('4');

		// The anchor before it is still page 3.
		root.setAttribute('data-index', '4');
		await flush();
		expect(root.getAttribute('data-page')).toBe('3');
	});

	it('puts the end anchor on the final page', async () => {
		// 8 items, 3 shown: pages 1 (0-2), 2 (3-5), 3 (6-7); steps land on
		// 0, 3, 5 - and 5 (showing 5-7) is the final page.
		const { root } = makeCarousel('pages', {
			slides: 8,
			viewport: 300,
			itemsToShow: 3,
		});

		expect(root.getAttribute('data-page')).toBe('1');
		expect(root.getAttribute('data-total')).toBe('3');

		root.setAttribute('data-index', '5');
		await flush();
		expect(root.getAttribute('data-page')).toBe('3');
		expect(root.getAttribute('data-total')).toBe('3');
	});
});

describe('carousel axis', () => {
	it('is keyboard operable from the track', async () => {
		const { root, track } = makeCarousel('keys');

		track.focus();
		const event = new KeyboardEvent('keydown', {
			key: 'ArrowRight',
			bubbles: true,
			cancelable: true,
		});
		document.activeElement.dispatchEvent(event);
		await flush();

		expect(event.defaultPrevented).toBe(true);
		expect(root.getAttribute('data-index')).toBe('1');
		expect(track.children[1].hasAttribute('data-active')).toBe(true);
	});

	it('scrolls the block axis in vertical mode', async () => {
		const { root, track } = makeCarousel('vertical', {
			mode: 'vertical',
			nav: true,
		});

		navButton(root, 'next').click();
		await flush();

		expect(track.scrollTo).toHaveBeenLastCalledWith({
			top: 100,
			behavior: 'auto',
		});
		expect(root.getAttribute('data-index')).toBe('1');
	});

	it('maps ArrowDown/ArrowUp in vertical mode', async () => {
		const { root, track } = makeCarousel('vertical-keys', {
			mode: 'vertical',
		});

		track.focus();
		track.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			}),
		);
		await flush();
		expect(root.getAttribute('data-index')).toBe('1');

		track.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowUp',
				bubbles: true,
				cancelable: true,
			}),
		);
		await flush();
		expect(root.getAttribute('data-index')).toBe('0');
	});
});

describe('carousel index drive', () => {
	it('paints without scrolling and reports the change immediately', async () => {
		const { root, track } = makeCarousel('index-drive', {
			mode: 'index',
			nav: true,
		});
		const after = [];
		root.addEventListener('barely:afterchange', (e) =>
			after.push(e.detail.index),
		);

		expect(root.hasAttribute('data-can-next')).toBe(true);
		navButton(root, 'next').click();
		await flush();

		expect(root.getAttribute('data-index')).toBe('1');
		expect(track.children[1].hasAttribute('data-active')).toBe(true);
		expect(track.scrollTo).not.toHaveBeenCalled();
		expect(after).toEqual([1]);
	});

	it('keeps the index through a settle or resize', async () => {
		const { root, track } = makeCarousel('index-drive-settle', {
			mode: 'index',
			nav: true,
		});

		navButton(root, 'next').click();
		await flush();
		expect(root.getAttribute('data-index')).toBe('1');

		// No scroll ever happens here, so a settle must not re-derive the index
		// from a viewport that has not moved.
		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();

		expect(root.getAttribute('data-index')).toBe('1');
		expect(track.children[1].hasAttribute('data-active')).toBe(true);
	});

	it('crossfades one page into the next, not one slide at a time', async () => {
		// items-to-show=2: advancing from 0 goes to 2, and the whole page
		// (slides 2,3) is marked in-page while the old page (0,1) is not.
		const { root, track } = makeCarousel('index-drive-pages', {
			mode: 'index',
			itemsToShow: 2,
			nav: true,
			slides: 6,
		});

		const inPage = () =>
			[...track.children].map((slide) => slide.hasAttribute('data-in-page'));

		expect(inPage()).toEqual([true, true, false, false, false, false]);

		navButton(root, 'next').click();
		await flush();

		expect(root.getAttribute('data-index')).toBe('2');
		expect(inPage()).toEqual([false, false, true, true, false, false]);
	});

	it('wraps grid columns by items-to-show so pages overlap', async () => {
		const { track } = makeCarousel('index-drive-columns', {
			mode: 'index',
			itemsToShow: 2,
			slides: 6,
		});

		// Page 0 and page 1 land in the same two columns.
		const cols = [...track.children].map((slide) => slide.style.gridColumn);
		expect(cols).toEqual(['1', '2', '1', '2', '1', '2']);
	});
});

describe('carousel controls', () => {
	it('names icon-only controls and mirrors the boundaries', () => {
		const { root } = makeCarousel('nav-labels', { nav: true });

		expect(navButton(root, 'next').getAttribute('aria-label')).toBe(
			'Next slide',
		);
		expect(navButton(root, 'prev').getAttribute('aria-disabled')).toBe('true');
		expect(navButton(root, 'next').getAttribute('aria-disabled')).toBe('false');
	});

	it('marks the numeric control for the current slide', async () => {
		const { root } = makeCarousel('dots', { dots: [0, 1, 2] });
		const dots = [...root.querySelectorAll('[data-nav="0"], [data-nav="1"], [data-nav="2"]')];

		expect(dots[0].getAttribute('aria-current')).toBe('true');

		root.setAttribute('data-index', '2');
		await flush();

		expect(dots[2].getAttribute('aria-current')).toBe('true');
		expect(dots[0].hasAttribute('aria-current')).toBe(false);
	});
});

describe('carousel lifecycle', () => {
	it('reuses the live region when re-mounted', async () => {
		const { root } = makeCarousel('remount');
		const parent = root.parentNode;
		const nextSibling = root.nextSibling;

		expect(root.querySelectorAll('[aria-live]').length).toBe(1);

		root.remove();
		await flush();
		parent.insertBefore(root, nextSibling);
		await flush();

		expect(root.querySelectorAll('[aria-live]').length).toBe(1);
	});

	it('keeps a request made before the carousel is laid out', async () => {
		const { root, track } = makeCarousel('hidden', { viewport: 0 });

		root.setAttribute('data-index', '3');
		await flush();

		// No layout, so nothing is painted and nothing is thrown away.
		expect(root.getAttribute('data-index')).toBe('3');
		expect(track.querySelector('[data-active]')).toBeNull();
		expect(root._barelyPending).toBe(3);
	});

	it('applies that request as soon as the first layout arrives', async () => {
		const { root, track } = makeCarousel('hidden-then-shown', {
			viewport: 0,
		});

		root.setAttribute('data-index', '3');
		await flush();

		// The track gets a size (a tab revealed, a dialog opened).
		Object.defineProperty(track, 'clientWidth', {
			configurable: true,
			value: 100,
		});
		track.dispatchEvent(new Event('scroll'));
		track.dispatchEvent(new Event('scrollend'));
		await settleWait();

		expect(root._barelyPending).toBeNull();
		expect(root.getAttribute('data-index')).toBe('3');
		expect(track.children[3].hasAttribute('data-active')).toBe(true);
		expect(track.scrollTo).toHaveBeenLastCalledWith({
			left: 300,
			behavior: 'instant',
		});
	});
});
