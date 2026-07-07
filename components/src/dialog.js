/**
 * @justbarely/components — Dialog
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
 *   barely:dialogchange -> { open: boolean }
 */

import { Barely, listen, emit, children } from '@justbarely/engine';

const Dialog = Barely.register('dialog');

const show = (root, dialog) => {
	/**
	 * Cancel any pending close transition so it doesn't fire when re-opening the
	 * dialog too quickly
	 */
	if (dialog._barelyTransitionEnd) {
		dialog.removeEventListener(
			'transitionend',
			dialog._barelyTransitionEnd,
		);
		dialog._barelyTransitionEnd = null;
	}
	dialog.removeAttribute('data-closing');
	dialog.showModal();
	dialog.setAttribute('data-open', '');
	emit(root, 'barely:dialogchange', { open: true });
};

const hide = (root, dialog) => {
	if (dialog.hasAttribute('data-closing')) return;
	dialog.setAttribute('data-closing', '');

	const finish = () => {
		dialog._barelyTransitionEnd = null;
		dialog.close();
		dialog.removeAttribute('data-open');
		dialog.removeAttribute('data-closing');
		emit(root, 'barely:dialogchange', { open: false });
	};

	const hasTransition = getComputedStyle(dialog).transitionDuration !== '0s';
	if (hasTransition) {
		dialog._barelyTransitionEnd = finish;
		dialog.addEventListener('transitionend', finish, { once: true });
	} else {
		finish();
	}
};

Dialog.onMount((root) => {
	/** Close overlay on click (filtered and delegated with listen()) */
	listen(
		root,
		'click',
		(e, dialog) => {
			if (e.target === dialog) hide(root, dialog);
		},
		'dialog[data-target]',
	);

	/** Native close doesn't bubble, so we have to bind it */
	children(root, 'dialog[data-target]').forEach((dialog) => {
		dialog.addEventListener('close', () => hide(root, dialog));
	});

	/** Triggers (Barely optimized addEventListener) */
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
