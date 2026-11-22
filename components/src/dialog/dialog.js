/**
 * Dialog - native `<dialog>` with transition hooks.
 *
 *   <button data-trigger="newsletter">Subscribe</button>
 *   <dialog data-target="newsletter">
 *     <h2>Stay in touch</h2>
 *     <button data-close aria-label="Close">×</button>
 *     <form method="dialog">
 *       <button value="cancel">No thanks</button>
 *       <button value="yes">Subscribe</button>
 *     </form>
 *   </dialog>
 *
 * Browser owns the backdrop, Esc, the focus trap and the top layer, and close
 * backdrop click. Barely adds a [data-open] attribute for CSS transitions,
 * and closes with any [data-close] element.
 */

import '../base.css';
import './dialog.css';

import {
	Barely,
	listen,
	emit,
	els,
	ensureAttr,
	linkAria,
	setAttrs,
	waitForAnimation,
} from '@justbarely/engine';

const Dialog = Barely.register('dialog');

const show = (root, dialog) => {
	if (dialog.open) return;

	emit(root, 'barely:beforechange', { open: true, dialog });
	dialog.showModal();

	// Defer [data-open] a frame so the browser renders the closed state first,
	// otherwise the potential transition has no starting point.
	requestAnimationFrame(() => {
		setAttrs(dialog, { 'data-open': true });
		emit(root, 'barely:afterchange', { open: true, dialog });
	});
};

const hide = (root, dialog) => {
	if (!dialog.open) return;

	emit(root, 'barely:beforechange', { open: false, dialog });
	setAttrs(dialog, { 'data-open': false });
	emit(root, 'barely:afterchange', { open: false, dialog });

	// Wait for the transition, then close. Essentially skips when there's no
	// transition.
	waitForAnimation(dialog, () => dialog.close());
};

Dialog.onMount((root) => {
	els(root, 'dialog[data-target]').forEach((dialog) => {
		// Intercept Esc press before the browser closes the dialog
		dialog.addEventListener('cancel', (e) => {
			e.preventDefault();
			hide(root, dialog);
		});

		// [data-close] buttons close the dialog themselves. preventDefault stops
		// <form>s from submitting (a cancel button never validates)
		listen(
			dialog,
			'click',
			(e, button) => {
				// A nested dialog owns its own close buttons
				const owner = button.closest('dialog[data-target]');
				if (owner && owner !== dialog) return;

				e.preventDefault();
				if (button.hasAttribute('value'))
					dialog.returnValue = button.getAttribute('value');
				hide(root, dialog);
			},
			'[data-close]',
		);

		// Intercept form submit (method="dialog") before the native close
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

	// linkAria names the dialog based on its trigger
	els(root, '[data-trigger]').forEach((trigger) => {
		const key = trigger.dataset.trigger;
		const dialog = els(root, `[data-target="${key}"]`).find(
			(el) => el.tagName === 'DIALOG',
		);
		if (!dialog) return;
		ensureAttr(trigger, 'aria-haspopup', 'dialog');
		linkAria(trigger, dialog, { prefix: 'dialog' });
	});

	listen(
		root,
		'click',
		(e, trigger) => {
			const key = trigger.dataset.trigger;
			const dialog = els(root, `[data-target="${key}"]`)[0];
			if (!dialog || dialog.tagName !== 'DIALOG') return;
			show(root, dialog);
		},
		'[data-trigger]',
	);
});
