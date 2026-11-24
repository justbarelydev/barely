// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initElement } from '../../../engine/src/registry.js';
import { Registry } from '../../../engine/src/registry.js';
import { attachAttrMO } from '../../../engine/src/mutation.js';
import './carousel-nav.js';

const mountNav = ({ nav, text = '', attrs = {} }) => {
	const target = document.createElement('div');
	target.id = 'target';
	document.body.appendChild(target);

	const root = document.createElement('div');
	root.setAttribute('data-component', 'carousel-nav');
	root.dataset.for = '#target';
	const button = document.createElement('button');
	button.dataset.nav = nav;
	button.textContent = text;
	Object.entries(attrs).forEach(([name, value]) =>
		button.setAttribute(name, value),
	);
	root.appendChild(button);
	document.body.appendChild(root);
	initElement(root);
	return { root, button, target };
};

const mountDots = (index) => {
	const target = document.createElement('div');
	target.id = 'dots-target';
	target.setAttribute('data-index', index);
	document.body.appendChild(target);

	const root = document.createElement('div');
	root.setAttribute('data-component', 'carousel-nav');
	root.dataset.for = '#dots-target';
	const dots = [0, 1, 2].map((n) => {
		const button = document.createElement('button');
		button.dataset.nav = String(n);
		button.textContent = '•';
		root.appendChild(button);
		return button;
	});
	document.body.appendChild(root);
	initElement(root);
	attachAttrMO(root, Registry.get('carousel-nav'));
	return { root, dots, target };
};

const mountFilmstrip = (index) => {
	const target = document.createElement('div');
	target.id = 'filmstrip-target';
	target.setAttribute('data-index', index);
	document.body.appendChild(target);

	const root = document.createElement('div');
	root.setAttribute('data-component', 'carousel-nav');
	root.dataset.for = '#filmstrip-target';
	root.dataset.mode = 'scroll';
	const thumbs = [0, 1, 2].map((n) => {
		const button = document.createElement('button');
		button.dataset.nav = String(n);
		button.textContent = '•';
		root.appendChild(button);
		return button;
	});
	document.body.appendChild(root);
	initElement(root);
	attachAttrMO(root, Registry.get('carousel-nav'));
	return { root, thumbs, target };
};

afterEach(() => {
	document.body.replaceChildren();
});

describe('carousel-nav accessible names', () => {
	it('names icon-only navigation buttons', () => {
		const { root, button } = mountNav({ nav: 'next', text: '→' });
		expect(root.getAttribute('role')).toBe('group');
		expect(root.getAttribute('aria-label')).toBe('Carousel controls');
		expect(button.getAttribute('aria-label')).toBe('Next slide');
	});

	it('names numeric controls by their zero-based destination', () => {
		const { button } = mountNav({ nav: '2', text: '•' });
		expect(button.getAttribute('aria-label')).toBe('Go to slide 3');
	});

	it('keeps visible text as the accessible name (2.5.3 label in name)', () => {
		const { button } = mountNav({ nav: 'next', text: 'next' });
		expect(button.hasAttribute('aria-label')).toBe(false);

		const dots = mountNav({ nav: '12', text: '12' });
		expect(dots.button.hasAttribute('aria-label')).toBe(false);
	});

	it('preserves authored accessible names', () => {
		const { button } = mountNav({
			nav: 'prev',
			text: '←',
			attrs: { 'aria-label': 'Back one item' },
		});
		expect(button.getAttribute('aria-label')).toBe('Back one item');
	});

	it('marks the numeric control for the current slide', async () => {
		const { dots, target } = mountDots('1');

		expect(dots[1].getAttribute('aria-current')).toBe('true');
		expect(dots[0].hasAttribute('aria-current')).toBe(false);

		target.setAttribute('data-index', '2');
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(dots[2].getAttribute('aria-current')).toBe('true');
		expect(dots[1].hasAttribute('aria-current')).toBe(false);
	});

	it('scrolls the current control into view as the index changes', async () => {
		const target = document.createElement('div');
		target.id = 'scroll-target';
		target.setAttribute('data-index', '0');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#scroll-target';
		Object.defineProperty(root, 'clientWidth', { value: 300 });
		Object.defineProperty(root, 'scrollWidth', { value: 500 });
		root.scrollLeft = 0;
		root.scrollTo = vi.fn();
		root.getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			width: 300,
			height: 40,
			right: 300,
			bottom: 40,
		});

		[0, 1, 2].forEach((n) => {
			const button = document.createElement('button');
			button.dataset.nav = String(n);
			button.getBoundingClientRect = () => ({
				left: n * 100,
				top: 0,
				width: 100,
				height: 40,
				right: n * 100 + 100,
				bottom: 40,
			});
			root.appendChild(button);
		});

		document.body.appendChild(root);
		initElement(root);
		attachAttrMO(root, Registry.get('carousel-nav'));

		target.setAttribute('data-index', '2');
		await new Promise((resolve) => setTimeout(resolve, 10));

		// center dot 2: 2*100 - (300 - 100)/2 = 100
		expect(root.scrollTo).toHaveBeenLastCalledWith({
			left: 100,
			behavior: 'auto',
		});
	});

	it('centers with the opposite scroll sign in RTL', async () => {
		const target = document.createElement('div');
		target.id = 'rtl-target';
		target.setAttribute('data-index', '0');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#rtl-target';
		root.dataset.mode = 'scroll';
		root.style.direction = 'rtl';
		Object.defineProperty(root, 'clientWidth', { value: 300 });
		Object.defineProperty(root, 'scrollWidth', { value: 500 });
		root.scrollLeft = 0;
		root.scrollTo = vi.fn();
		root.getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			width: 300,
			height: 40,
			right: 300,
			bottom: 40,
		});

		// RTL lays children out from the right edge.
		[0, 1, 2].forEach((n) => {
			const button = document.createElement('button');
			button.dataset.nav = String(n);
			button.getBoundingClientRect = () => ({
				left: 300 - n * 100 - 100,
				right: 300 - n * 100,
				top: 0,
				width: 100,
				height: 40,
				bottom: 40,
			});
			root.appendChild(button);
		});

		document.body.appendChild(root);
		initElement(root);
		attachAttrMO(root, Registry.get('carousel-nav'));

		target.setAttribute('data-index', '2');
		await new Promise((resolve) => setTimeout(resolve, 10));

		// Same logical target as LTR, opposite sign on the physical scroll.
		expect(root.scrollTo).toHaveBeenLastCalledWith({
			left: -100,
			behavior: 'auto',
		});
	});

	it('centers on the block axis in vertical mode', async () => {
		const target = document.createElement('div');
		target.id = 'vertical-target';
		target.setAttribute('data-index', '0');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#vertical-target';
		root.dataset.mode = 'scroll vertical';
		Object.defineProperty(root, 'clientHeight', { value: 300 });
		Object.defineProperty(root, 'scrollHeight', { value: 500 });
		Object.defineProperty(root, 'clientWidth', { value: 100 });
		Object.defineProperty(root, 'scrollWidth', { value: 100 });
		root.scrollTop = 0;
		root.scrollTo = vi.fn();
		root.getBoundingClientRect = () => ({
			left: 0,
			top: 0,
			width: 100,
			height: 300,
			right: 100,
			bottom: 300,
		});

		[0, 1, 2].forEach((n) => {
			const button = document.createElement('button');
			button.dataset.nav = String(n);
			button.getBoundingClientRect = () => ({
				left: 0,
				top: n * 100,
				width: 100,
				height: 100,
				right: 100,
				bottom: n * 100 + 100,
			});
			root.appendChild(button);
		});

		document.body.appendChild(root);
		initElement(root);
		attachAttrMO(root, Registry.get('carousel-nav'));

		target.setAttribute('data-index', '2');
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(root.scrollTo).toHaveBeenLastCalledWith({
			top: 100,
			behavior: 'auto',
		});
		expect(root.getAttribute('aria-orientation')).toBe('vertical');
	});

	it('mirrors target navigation boundaries and updates them', async () => {
		const target = document.createElement('div');
		target.id = 'boundary-target';
		target.setAttribute('data-can-next', '');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#boundary-target';
		root.setAttribute('data-can-prev', '');
		const prev = document.createElement('button');
		prev.dataset.nav = 'prev';
		const next = document.createElement('button');
		next.dataset.nav = 'next';
		root.append(prev, next);
		document.body.appendChild(root);
		initElement(root);
		attachAttrMO(root, Registry.get('carousel-nav'));

		expect(root.hasAttribute('data-can-prev')).toBe(false);
		expect(root.hasAttribute('data-can-next')).toBe(true);
		expect(prev.getAttribute('aria-disabled')).toBe('true');
		expect(next.getAttribute('aria-disabled')).toBe('false');

		target.setAttribute('data-can-prev', '');
		target.removeAttribute('data-can-next');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(root.hasAttribute('data-can-prev')).toBe(true);
		expect(root.hasAttribute('data-can-next')).toBe(false);
		expect(prev.getAttribute('aria-disabled')).toBe('false');
		expect(next.getAttribute('aria-disabled')).toBe('true');
	});
});

describe('carousel-nav filmstrip', () => {
	it('is a toolbar with a single tab stop', () => {
		const { root, thumbs } = mountFilmstrip('1');

		expect(root.getAttribute('role')).toBe('toolbar');
		expect(thumbs.map((t) => t.getAttribute('tabindex'))).toEqual([
			'-1',
			'0',
			'-1',
		]);
	});

	it('marks the current thumbnail with aria-current', async () => {
		const { thumbs, target } = mountFilmstrip('1');

		expect(thumbs[1].getAttribute('aria-current')).toBe('true');
		expect(thumbs[0].hasAttribute('aria-current')).toBe(false);

		target.setAttribute('data-index', '2');
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(thumbs[2].getAttribute('aria-current')).toBe('true');
		expect(thumbs[1].hasAttribute('aria-current')).toBe(false);
	});

	it('moves focus and selects with arrow keys, like a nested nav', () => {
		const { thumbs, target } = mountFilmstrip('0');
		const events = [];
		target.addEventListener('barely:carouselnav', (e) =>
			events.push(e.detail),
		);

		thumbs[0].focus();
		thumbs[0].dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowRight',
				bubbles: true,
				cancelable: true,
			}),
		);

		expect(events).toEqual([{ index: '1' }]);
		expect(document.activeElement).toBe(thumbs[1]);
		expect(thumbs[1].getAttribute('tabindex')).toBe('0');
		expect(thumbs[0].getAttribute('tabindex')).toBe('-1');

		thumbs[1].dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'Enter',
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(events).toEqual([{ index: '1' }, { index: '1' }]);
	});

	it('leaves prev/next out of the arrow roving set', () => {
		const target = document.createElement('div');
		target.id = 'strip-target';
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#strip-target';
		root.dataset.mode = 'scroll';
		const prev = document.createElement('button');
		prev.dataset.nav = 'prev';
		const next = document.createElement('button');
		next.dataset.nav = 'next';
		const thumbs = [0, 1].map((n) => {
			const button = document.createElement('button');
			button.dataset.nav = String(n);
			return button;
		});
		root.append(prev, next, ...thumbs);
		document.body.appendChild(root);
		initElement(root);

		// prev/next keep their own tab stops; only thumbs rove.
		expect(prev.hasAttribute('tabindex')).toBe(false);
		expect(next.hasAttribute('tabindex')).toBe(false);

		const events = [];
		target.addEventListener('barely:carouselnav', (e) =>
			events.push(e.detail),
		);

		// Arrowing on prev must not fire a step.
		prev.focus();
		prev.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowRight',
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(events).toEqual([]);
	});

	it('drives prev/next from the same strip', () => {
		const target = document.createElement('div');
		target.id = 'mixed-target';
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#mixed-target';
		root.dataset.mode = 'scroll';
		const prev = document.createElement('button');
		prev.dataset.nav = 'prev';
		const next = document.createElement('button');
		next.dataset.nav = 'next';
		const thumb = document.createElement('button');
		thumb.dataset.nav = '0';
		root.append(prev, next, thumb);
		document.body.appendChild(root);
		initElement(root);

		const events = [];
		target.addEventListener('barely:carouselnav', (e) =>
			events.push(e.detail),
		);

		next.click();
		prev.click();
		thumb.click();
		expect(events).toEqual([{ dir: 1 }, { dir: -1 }, { index: '0' }]);
	});
});

describe('carousel-nav naming', () => {
	it('borrows the carousel labelling reference', () => {
		const heading = document.createElement('h2');
		heading.id = 'named-heading';
		heading.textContent = 'gallery';
		document.body.appendChild(heading);

		const target = document.createElement('div');
		target.id = 'named-target';
		target.setAttribute('aria-labelledby', 'named-heading');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#named-target';
		const button = document.createElement('button');
		button.dataset.nav = '0';
		root.appendChild(button);
		document.body.appendChild(root);
		initElement(root);

		// A reference, not a copied string - so a heading edit flows through.
		expect(root.getAttribute('aria-labelledby')).toBe('named-heading');
		expect(root.hasAttribute('aria-label')).toBe(false);
	});

	it('falls back to a generic name when nothing else is available', () => {
		const target = document.createElement('div');
		target.id = 'unnamed-target';
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#unnamed-target';
		const button = document.createElement('button');
		button.dataset.nav = '0';
		root.appendChild(button);
		document.body.appendChild(root);
		initElement(root);

		expect(root.getAttribute('aria-label')).toBe('Carousel controls');
	});

	it('keeps an authored name', () => {
		const target = document.createElement('div');
		target.id = 'authored-target';
		document.body.appendChild(target);

		const nav = document.createElement('div');
		nav.setAttribute('data-component', 'carousel-nav');
		nav.dataset.for = '#authored-target';
		nav.dataset.mode = 'scroll';
		nav.setAttribute('aria-label', 'Gallery thumbnails');
		const button = document.createElement('button');
		button.dataset.nav = '0';
		nav.appendChild(button);
		document.body.appendChild(nav);
		initElement(nav);

		expect(nav.getAttribute('aria-label')).toBe('Gallery thumbnails');
	});
});

describe('carousel-nav modes', () => {
	const mountMode = (mode, navs = ['0', '1', '2']) => {
		const target = document.createElement('div');
		target.id = 'mode-target';
		target.setAttribute('data-index', '0');
		document.body.appendChild(target);

		const root = document.createElement('div');
		root.setAttribute('data-component', 'carousel-nav');
		root.dataset.for = '#mode-target';
		if (mode) root.dataset.mode = mode;
		const controls = navs.map((nav) => {
			const button = document.createElement('button');
			button.dataset.nav = nav;
			root.appendChild(button);
			return button;
		});
		document.body.appendChild(root);
		initElement(root);
		return { root, controls, target };
	};

	it('roves the numeric controls without needing scroll', () => {
		const { root, controls } = mountMode(null);

		expect(root.getAttribute('role')).toBe('toolbar');
		expect(controls.map((c) => c.getAttribute('tabindex'))).toEqual([
			'0',
			'-1',
			'-1',
		]);
	});

	it('uses Up/Down on a vertical nav with no scroll token', () => {
		const { root, controls, target } = mountMode('vertical');
		const events = [];
		target.addEventListener('barely:carouselnav', (e) =>
			events.push(e.detail),
		);

		expect(root.getAttribute('aria-orientation')).toBe('vertical');

		controls[0].focus();
		controls[0].dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowDown',
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(events).toEqual([{ index: '1' }]);
		expect(document.activeElement).toBe(controls[1]);

		events.length = 0;
		controls[1].dispatchEvent(
			new KeyboardEvent('keydown', {
				key: 'ArrowRight',
				bubbles: true,
				cancelable: true,
			}),
		);
		expect(events).toEqual([]);
	});

	it('stays a plain group when there are no numeric controls', () => {
		const { root, controls } = mountMode(null, ['prev', 'next']);

		expect(root.getAttribute('role')).toBe('group');
		controls.forEach((c) => expect(c.hasAttribute('tabindex')).toBe(false));
	});
});
