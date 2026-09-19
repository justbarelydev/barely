// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { Barely, listen, runCleanup } from '@justbarely/engine';
import { initElement } from '../../engine/src/registry.js';

const makeEl = (name) => {
	const el = document.createElement('div');
	el.setAttribute('data-component', name);
	return el;
};

describe('initElement', () => {
	it('marks ready and emits barely:mount', () => {
		Barely.register('comp');
		const el = makeEl('comp');
		const mounted = vi.fn();
		el.addEventListener('barely:mount', mounted);
		initElement(el);
		expect(el.hasAttribute('data-ready')).toBe(true);
		expect(mounted).toHaveBeenCalledTimes(1);
	});

	it('scopes onMount document listeners to the component root', () => {
		Barely.register('owner').onMount(() => {
			listen(document, 'click', () => {});
		});
		const el = makeEl('owner');
		initElement(el);
		const remove = vi.spyOn(document, 'removeEventListener');
		runCleanup(el);
		expect(remove).toHaveBeenCalledWith('click', expect.any(Function));
	});

	it('registers the onMount return value as teardown', () => {
		const teardown = vi.fn();
		Barely.register('teardown').onMount(() => teardown);
		const el = makeEl('teardown');
		initElement(el);
		runCleanup(el);
		expect(teardown).toHaveBeenCalledTimes(1);
	});
});
