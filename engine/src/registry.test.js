// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { Barely, listen, runCleanup } from '@justbarely/engine';
import { Registry, initElement } from '../../engine/src/registry.js';
import { attachAttrMO } from '../../engine/src/mutation.js';

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

	it('passes undefined as previous on the init pass', () => {
		const effect = vi.fn();
		Barely.register('init-pass', { watch: ['data-open'] }).onEffect(
			'data-open',
			effect,
		);
		const el = makeEl('init-pass');
		el.setAttribute('data-open', 'yes');
		initElement(el);
		expect(effect).toHaveBeenCalledTimes(1);
		// toBe, not toBeUndefined: null must NOT pass here
		expect(effect.mock.calls[0][2]).toBe(undefined);
	});

	it('passes null as previous when a watched attr appears after init', async () => {
		const effect = vi.fn();
		Barely.register('appears', { watch: ['data-open'] }).onEffect(
			'data-open',
			effect,
		);
		const el = makeEl('appears');
		// init first, then watch - the order initIntersection now uses
		initElement(el);
		attachAttrMO(el, Registry.get('appears'));
		el.setAttribute('data-open', 'yes');
		await new Promise((r) => setTimeout(r, 0));
		expect(effect).toHaveBeenCalledTimes(1);
		expect(effect.mock.calls[0][2]).toBe(null);
	});
});
