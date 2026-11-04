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
		expect(root.scrollTo).toHaveBeenLastCalledWith({ left: 100 });
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
