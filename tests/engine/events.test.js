// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { listen, setCleanupOwner, runCleanup } from '@justbarely/engine';

const makeRoot = () => ({
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
});

describe('listen', () => {
	it('attaches to the target and returns an off()', () => {
		const root = makeRoot();
		const off = listen(root, 'click', vi.fn());
		expect(root.addEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
		);
		off();
		expect(root.removeEventListener).toHaveBeenCalledWith(
			'click',
			expect.any(Function),
		);
	});

	it('keys cleanup to the component root when inside a mount', () => {
		const root = makeRoot();
		const owner = {};
		setCleanupOwner(owner, () => listen(root, 'click', vi.fn()));
		runCleanup(owner);
		expect(root.removeEventListener).toHaveBeenCalledTimes(1);
	});

	it('delegates to matching targets and ignores nested components', () => {
		document.body.innerHTML = `
			<div id="root" data-component="tabs">
				<button data-nav="a">A</button>
				<div data-component="accordion"><button data-nav="b">B</button></div>
			</div>`;
		const root = document.querySelector('#root');
		const handler = vi.fn();
		listen(root, 'click', handler, '[data-nav]');
		root.querySelector('[data-nav="a"]').click();
		expect(handler).toHaveBeenCalledTimes(1);
		document.querySelector('[data-nav="b"]').click();
		expect(handler).toHaveBeenCalledTimes(1);
	});
});
