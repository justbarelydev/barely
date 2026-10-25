// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { Barely, watchChild } from '@justbarely/engine';
import { initElement } from '../registry.js';

const makeEl = (name) => {
	const el = document.createElement('div');
	el.setAttribute('data-component', name);
	return el;
};

describe('watchChild', () => {
	it('fires when a descendant attr changes', async () => {
		const cb = vi.fn();
		Barely.register('wc-root').onMount((root) => {
			watchChild(root, 'data-open', cb);
		});
		const el = makeEl('wc-root');
		const child = document.createElement('button');
		el.appendChild(child);
		initElement(el);
		child.setAttribute('data-open', 'yes');
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).toHaveBeenCalledWith(child, 'yes', null);
	});

	it('ignores the root own attr', async () => {
		const cb = vi.fn();
		Barely.register('wc-self').onMount((root) => {
			watchChild(root, 'data-open', cb);
		});
		const el = makeEl('wc-self');
		initElement(el);
		el.setAttribute('data-open', 'yes');
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).not.toHaveBeenCalled();
	});

	it('ignores attrs inside a nested component', async () => {
		const cb = vi.fn();
		Barely.register('wc-outer').onMount((root) => {
			watchChild(root, 'data-open', cb);
		});
		const el = makeEl('wc-outer');
		const inner = document.createElement('div');
		inner.setAttribute('data-component', 'wc-inner');
		el.appendChild(inner);
		initElement(el);
		inner.setAttribute('data-open', 'yes');
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).not.toHaveBeenCalled();
	});
});
