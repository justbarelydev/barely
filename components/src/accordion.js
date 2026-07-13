/**
 * @justbarely/components — Accordion
 *
 * Native: <details>/<summary>
 * Add the same [name] attr to every <details> element for exclusive.
 * The browser does everything for you here, Barely just emits an event.
 *
 *	<div data-component="accordion">
 *		<details open>
 *			<summary>Section 1</summary>
 *			<p>Content 1</p>
 *		</details>
 *	</div>
 *
 *	<div data-component="accordion">
 *		<details name="faq" open>
 *			<summary>Section 1</summary>
 *			<p>Content 1</p>
 *		</details>
 *		<details name="faq">
 *			<summary>Section 2</summary>
 *			<p>Content 2</p>
 *		</details>
 *	</div>
 *
 * Custom: [data-trigger]/[data-target] for when <details> won't work.
 * Barely controls toggle, keyboard, and ARIA.
 *
 *	<div data-component="accordion" data-mode="exclusive">
 *		<button data-trigger="a1" data-open>Section 1</button>
 *		<div data-target="a1" data-open>Content 1</div>
 *	</div>
 *
 * Events:
 *   barely:accordionchange -> { open: number[], keys: string[] }
 */

import {
	Barely,
	listen,
	emit,
	children,
	hasMode,
	setAttrs,
} from '@justbarely/engine';

// Register
const Accordion = Barely.register('accordion');

// ARIA
const syncAria = (root) => {
	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, {
			'aria-expanded': el.hasAttribute('data-open'),
			'aria-controls': `target-${el.dataset.trigger}`,
			id: `trigger-${el.dataset.trigger}`,
		}),
	);

	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, {
			role: 'region',
			'aria-labelledby': `trigger-${el.dataset.target}`,
			id: `target-${el.dataset.target}`,
		}),
	);
};

// Close all triggers and panels in the custom path
const closeAll = (root) => {
	children(root, '[data-open]').forEach((el) =>
		el.removeAttribute('data-open'),
	);
	syncAria(root);
};

// Build and emit accordion state
const emitState = (root, openItems, allItems) => {
	emit(root, 'barely:accordionchange', {
		open: openItems.map((el) => allItems.indexOf(el)),
		keys: openItems.map((el) => el.dataset?.trigger || ''),
	});
};

const onTriggerClick = (e, trigger, root) => {
	const key = trigger.dataset.trigger;
	const all = children(root, '[data-trigger]');

	if (hasMode(root, 'exclusive')) {
		const wasOpen = trigger.hasAttribute('data-open');

		closeAll(root);

		if (wasOpen) {
			emitState(root, [], all);
			return;
		}

		trigger.setAttribute('data-open', '');
		const panel = children(root, `[data-target="${key}"]`)[0];
		if (panel) panel.setAttribute('data-open', '');
		syncAria(root);
		emitState(root, [trigger], all);
	} else {
		trigger.toggleAttribute('data-open');
		const panel = children(root, `[data-target="${key}"]`)[0];
		if (panel) panel.toggleAttribute('data-open');
		syncAria(root);
		emitState(root, children(root, '[data-trigger][data-open]'), all);
	}
};

const onTriggerKeydown = (e, trigger, root) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		onTriggerClick(e, trigger, root);
	}
};

// Custom: [data-trigger]/[data-target]
const initCustom = (root) => {
	syncAria(root);
	listen(root, 'click', onTriggerClick, '[data-trigger]');
	listen(root, 'keydown', onTriggerKeydown, '[data-trigger]');
};

// Native: <details>/<summary> — browser handles toggle, name attr for exclusive
const initNative = (root) => {
	const items = children(root, 'details');

	root.addEventListener(
		'toggle',
		() => emitState(root, children(root, 'details[open]'), items),
		true,
	);
};

// Mount
Accordion.onMount((root) => {
	children(root, 'details').length > 0 ? initNative(root) : initCustom(root);
});
