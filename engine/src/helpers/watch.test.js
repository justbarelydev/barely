// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { Barely, watch } from '@justbarely/engine';
import { Registry, initElement } from '../registry.js';
import { attachAttrMO } from '../mutation.js';

const makeEl = (name) => {
	const el = document.createElement('div');
	el.setAttribute('data-component', name);
	return el;
};

describe('watch', () => {
	it('reacts to an attr not declared in the blueprint', async () => {
		const cb = vi.fn();
		Barely.register('watch-dynamic').onMount((root) => {
			watch(root, 'data-x', cb);
		});
		const el = makeEl('watch-dynamic');
		initElement(el);
		attachAttrMO(el, Registry.get('watch-dynamic'));
		el.setAttribute('data-x', 'hello');
		await new Promise((r) => setTimeout(r, 0));
		expect(cb).toHaveBeenCalledWith(el, 'hello', null);
	});

	it('runs multiple callbacks for one attr', async () => {
		const a = vi.fn();
		const b = vi.fn();
		Barely.register('watch-multi').onMount((root) => {
			watch(root, 'data-y', a);
			watch(root, 'data-y', b);
		});
		const el = makeEl('watch-multi');
		initElement(el);
		attachAttrMO(el, Registry.get('watch-multi'));
		el.setAttribute('data-y', '1');
		await new Promise((r) => setTimeout(r, 0));
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});
});
