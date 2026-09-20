/**
 * @justbarely/components - Modal
 *
 * Native <dialog> - the browser handles backdrop, Esc, focus trap, and ARIA.
 * Barely adds [data-open] for CSS transitions and overlay click-to-close.
 *
 *   <button data-trigger="newsletter">Subscribe</button>
 *   <dialog data-target="newsletter">
 *     <h2>Stay in touch</h2>
 *     <form method="dialog">
 *       <button value="cancel">No thanks</button>
 *       <button value="yes">Subscribe</button>
 *     </form>
 *   </dialog>
 *
 * Events:
 *   barely:beforechange -> { open, dialog }
 *   barely:afterchange  -> { open, dialog }
 */

import './base.css';
import './modal.css';

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

Modal.onMount((root) => {
	children(root, 'dialog[data-target]').forEach((dialog) => {
		// Intercept Esc press before the browser closes the dialog
		dialog.addEventListener('cancel', (e) => {
			e.preventDefault();
			hide(root, dialog);
		});

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
