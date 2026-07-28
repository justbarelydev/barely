/**
 * @justbarely/components — Modal
 *
 * Native <dialog> - The browser handles backdrop, Esc, focus trap, and ARIA for
 * us. Barely adds data-open/data-closing for CSS transitions and overlay click.
 *
 *	<button data-trigger="newsletter">Subscribe</button>
 *	<dialog data-target="newsletter">
 *		<h2>Stay in touch</h2>
 *		<form method="dialog">
 *			<button value="cancel">No thanks</button>
 *			<button value="yes">Subscribe</button>
 *		</form>
 *	</dialog>
 *
 * Events:
 *   barely:modalchange -> { open: boolean }
 */

import {
	Barely,
	listen,
	emit,
	children,
	setAttrs,
	waitForAnimation,
} from '@justbarely/engine';

const Modal = Barely.register('modal');

const show = (root, dialog) => {
	if (dialog._barelyOpening || dialog._barelyClosing) return;
	dialog._barelyOpening = true;
	setAttrs(dialog, { 'data-closing': false, 'data-opening': true });
	dialog.showModal();

	waitForAnimation(dialog, () => {
		// Defer one frame so the browser paints the animation's final
		// frame before we swap attributes. Without this, removing
		// data-opening cancels the animation before the final frame
		// is committed, causing a visual snap.
		requestAnimationFrame(() => {
			dialog._barelyOpening = false;
			setAttrs(dialog, { 'data-open': true, 'data-opening': false });
			emit(root, 'barely:modalchange', { open: true });
		});
	});
};

const hide = (root, dialog) => {
	if (dialog._barelyClosing || dialog._barelyOpening) return;
	dialog._barelyClosing = true;
	dialog.setAttribute('data-closing', '');

	waitForAnimation(dialog, () => {
		dialog._barelyClosing = false;
		dialog.close();
		setAttrs(dialog, { 'data-open': false, 'data-closing': false });
		emit(root, 'barely:modalchange', { open: false });
	});
};

Modal.onMount((root) => {
	children(root, 'dialog[data-target]').forEach((dialog) => {
		// Esc key — intercept before the browser closes the dialog
		dialog.addEventListener('cancel', (e) => {
			e.preventDefault();
			hide(root, dialog);
		});

		// Form submit (method="dialog") — intercept before native close
		const form = dialog.querySelector('form[method="dialog"]');
		if (form) {
			form.addEventListener('submit', (e) => {
				e.preventDefault();
				hide(root, dialog);
			});
		}
	});

	// Close overlay on click
	listen(
		root,
		'click',
		(e, dialog) => {
			if (e.target === dialog) hide(root, dialog);
		},
		'dialog[data-target]',
	);

	// Triggers
	listen(
		root,
		'click',
		(e, trigger) => {
			const key = trigger.dataset.trigger;
			const dialog = children(root, `[data-target="${key}"]`)[0];
			if (!dialog || dialog.tagName !== 'DIALOG') return;
			show(root, dialog);
		},
		'[data-trigger]',
	);
});
