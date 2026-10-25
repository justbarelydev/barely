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
		Barely.register('init-pass', { watch: ['data-open'] }).onChange(
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
		Barely.register('appears', { watch: ['data-open'] }).onChange(
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

	it('merges watch config when re-registering instead of replacing', () => {
		Barely.register('merged', { watch: ['data-a'] });
		Barely.register('merged', { watch: ['data-b'] });
		const blueprint = Registry.get('merged');
		expect(blueprint.watch).toContain('data-a');
		expect(blueprint.watch).toContain('data-b');
	});

	it('appends onMount handlers instead of overwriting', () => {
		const a = vi.fn();
		const b = vi.fn();
		Barely.register('multi-mount').onMount(a);
		Barely.register('multi-mount').onMount(b);
		initElement(makeEl('multi-mount'));
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});

	it('appends onChange handlers instead of overwriting', async () => {
		const a = vi.fn();
		const b = vi.fn();
		Barely.register('multi-effect', { watch: ['data-x'] }).onChange(
			'data-x',
			a,
		);
		Barely.register('multi-effect').onChange('data-x', b);
		const el = makeEl('multi-effect');
		initElement(el);
		attachAttrMO(el, Registry.get('multi-effect'));
		el.setAttribute('data-x', '1');
		await new Promise((r) => setTimeout(r, 0));
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});

	it('appends onChildUpdate handlers instead of overwriting', async () => {
		const a = vi.fn();
		const b = vi.fn();
		Barely.register('multi-children', {
			watchChildren: true,
		}).onChildUpdate(a);
		Barely.register('multi-children').onChildUpdate(b);
		const el = makeEl('multi-children');
		initElement(el);
		el.appendChild(document.createElement('span'));
		await new Promise((r) => setTimeout(r, 0));
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});

	it('onChildUpdate alone observes the root child list', async () => {
		const cb = vi.fn();
		Barely.register('child-root').onChildUpdate(cb);
		const el = makeEl('child-root');
		initElement(el);
		el.appendChild(document.createElement('span'));
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('watchChildren selector scopes to that element', async () => {
		const cb = vi.fn();
		Barely.register('child-scoped', {
			watchChildren: '[data-track]',
		}).onChildUpdate(cb);
		const el = makeEl('child-scoped');
		const track = document.createElement('div');
		track.setAttribute('data-track', '');
		el.appendChild(track);
		initElement(el);
		// a child added to the root is not the track's child list
		el.appendChild(document.createElement('span'));
		track.appendChild(document.createElement('span'));
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).toHaveBeenCalledTimes(1);
	});

	it('async onMount resolves to a teardown and tracks data-status', async () => {
		const teardown = vi.fn();
		Barely.register('async-mount').onMount(async () => {
			await Promise.resolve();
			return teardown;
		});
		const el = makeEl('async-mount');
		document.body.appendChild(el);
		initElement(el);
		expect(el.getAttribute('data-status')).toBe('loading');
		await new Promise((r) => setTimeout(r, 0));
		expect(el.getAttribute('data-status')).toBe('success');
		runCleanup(el);
		expect(teardown).toHaveBeenCalledTimes(1);
	});

	it('async onMount rejection tracks data-status error', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		Barely.register('async-fail').onMount(async () => {
			throw new Error('nope');
		});
		const el = makeEl('async-fail');
		document.body.appendChild(el);
		initElement(el);
		await new Promise((r) => setTimeout(r, 0));
		expect(el.getAttribute('data-status')).toBe('error');
		error.mockRestore();
	});
});
