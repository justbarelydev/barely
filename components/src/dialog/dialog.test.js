// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { initElement } from '../../../engine/src/registry.js';
import './dialog.js';

afterEach(() => {
	document.body.replaceChildren();
});

const frame = () => new Promise((r) => requestAnimationFrame(r));

const mount = (inner) => {
	const root = document.createElement('div');
	root.setAttribute('data-component', 'dialog');
	root.innerHTML = inner;
	document.body.appendChild(root);
	initElement(root);

	const dialog = root.querySelector('dialog');
	const changes = [];
	root.addEventListener('barely:beforechange', (e) =>
		changes.push(e.detail.open),
	);
	return { root, dialog, changes };
};

const open = async (root, dialog) => {
	root.querySelector('[data-trigger]').click();
	await frame();
	expect(dialog.open).toBe(true);
};

describe('dialog [data-close]', () => {
	it('closes the dialog and emits one beforechange', async () => {
		const { root, dialog, changes } = mount(`
			<button data-trigger="k">open</button>
			<dialog data-target="k">
				<button data-close>Close</button>
			</dialog>
		`);
		await open(root, dialog);

		dialog.querySelector('[data-close]').click();
		await frame();

		expect(dialog.hasAttribute('data-open')).toBe(false);
		expect(changes).toEqual([true, false]);
	});

	it('carries the button value to dialog.returnValue', async () => {
		const { root, dialog } = mount(`
			<button data-trigger="k">open</button>
			<dialog data-target="k">
				<button data-close value="dismiss">Close</button>
			</dialog>
		`);
		await open(root, dialog);

		dialog.querySelector('[data-close]').click();
		expect(dialog.returnValue).toBe('dismiss');
	});

	it('leaves returnValue alone when the button has no value', async () => {
		const { root, dialog } = mount(`
			<button data-trigger="k">open</button>
			<dialog data-target="k">
				<button data-close>Close</button>
			</dialog>
		`);
		await open(root, dialog);
		dialog.returnValue = 'prior';

		dialog.querySelector('[data-close]').click();
		expect(dialog.returnValue).toBe('prior');
	});

	it('works from a descendant of the close button', async () => {
		const { root, dialog, changes } = mount(`
			<button data-trigger="k">open</button>
			<dialog data-target="k">
				<button data-close><span>Close</span></button>
			</dialog>
		`);
		await open(root, dialog);

		dialog.querySelector('[data-close] span').click();
		await frame();

		expect(changes).toEqual([true, false]);
	});

	it('does not close on a plain click inside the dialog', async () => {
		const { root, dialog, changes } = mount(`
			<button data-trigger="k">open</button>
			<dialog data-target="k">
				<p>content</p>
			</dialog>
		`);
		await open(root, dialog);

		dialog.querySelector('p').click();
		await frame();

		expect(changes).toEqual([true]);
		expect(dialog.hasAttribute('data-open')).toBe(true);
	});

	it('does not let a nested dialog close its parent', async () => {
		const { root, dialog, changes } = mount(`
			<button data-trigger="outer">open</button>
			<dialog data-target="outer">
				<button data-trigger="inner">open inner</button>
				<dialog data-target="inner">
					<button data-close>Close inner</button>
				</dialog>
			</dialog>
		`);
		await open(root, dialog);

		root.querySelector('[data-target="inner"] [data-close]').click();
		await frame();

		// Outer stays open; only the inner dialog's close attempt is emitted.
		expect(dialog.hasAttribute('data-open')).toBe(true);
		expect(changes).toContain(true);
		expect(
			root.querySelector('[data-target="inner"]').hasAttribute('data-open'),
		).toBe(false);
	});
});
