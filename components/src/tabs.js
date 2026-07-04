/**
 * @justbarely/components — Tabs
 *
 *	<div data-component="tabs">
 *		<button data-trigger="tab1" data-active>Tab 1</button>
 *		<button data-trigger="tab2">Tab 2</button>
 *		<div data-target="tab1" data-active>Content 1</div>
 *		<div data-target="tab2">Content 2</div>
 *	</div>
 *
 * data-mode:
 *   "vertical" — tabs on the left, panels on the right. Keyboard nav
 *                switches to ArrowUp / ArrowDown. Wrap controls in a
 *                container for the side-by-side CSS layout.
 *
 *	<div data-component="tabs" data-active="tab1" data-mode="vertical">
 *		<div>
 *			<button data-trigger="tab1" data-active></button>
 *			...
 *		</div>
 *		<div data-target="tab1" data-active>Content 1</div>
 * 		...
 *	</div>
 *
 * Note: You can add data-active to the root if you don't want to add it to the
 * active control/content, but you might see FOUC onMount
 * 	<div data-component="tabs" data-active="tab1">...</div>
 *
 * Events:
 *   barely:tabchange -> { active: key }
 */

import {
	Barely,
	listen,
	emit,
	children,
	updateAria,
	ariaBool,
	hasMode,
} from '@justbarely/engine';

/** Register the component */
const Tabs = Barely.register('tabs', { watch: ['data-active'] });

/** ARIA + behavioral attrs applied on mount and on every state change */
const TABS_ARIA = {
	root: (el) => {
		const attrs = { role: 'tablist' };
		if (hasMode(el, 'vertical')) attrs['aria-orientation'] = 'vertical';
		return attrs;
	},
	'[data-trigger]': (el) => ({
		role: 'tab',
		'aria-controls': `target-${el.dataset.trigger}`,
		id: `trigger-${el.dataset.trigger}`,
		'aria-selected': ariaBool(el, 'data-active'),
		tabindex: el.hasAttribute('data-active') ? '0' : '-1',
	}),
	'[data-target]': (el) => ({
		role: 'tabpanel',
		'aria-labelledby': `trigger-${el.dataset.target}`,
		id: `target-${el.dataset.target}`,
	}),
};

/** Toggle data-active flag on tabs and panels so CSS can hide inactive ones */
const applyActive = (root) => {
	const key = root.dataset.active;

	children(root, '[data-trigger]').forEach((tab) => {
		if (tab.dataset.trigger === key) tab.setAttribute('data-active', '');
		else tab.removeAttribute('data-active');
	});

	children(root, '[data-target]').forEach((panel) => {
		if (panel.dataset.target === key) panel.setAttribute('data-active', '');
		else panel.removeAttribute('data-active');
	});
};

/**
 * Keyboard: arrows cycle and activate, Enter/Space activate
 * Axis flips based on data-vertical:
 *	- Left/Right for horizontal
 * 	- Up/Down for vertical.
 */
const onKeydown = (e, tab, root) => {
	const tabs = children(root, '[data-trigger]');
	const i = tabs.indexOf(tab);
	if (i === -1) return;

	const vertical = hasMode(root, 'vertical');
	const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
	const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';

	let next;
	switch (e.key) {
		case nextKey:
			next = (i + 1) % tabs.length;
			break;
		case prevKey:
			next = (i - 1 + tabs.length) % tabs.length;
			break;
		case 'Home':
			next = 0;
			break;
		case 'End':
			next = tabs.length - 1;
			break;
		case 'Enter':
		case ' ':
			e.preventDefault();
			root.setAttribute('data-active', tab.dataset.trigger);
			return;
		default:
			return;
	}

	e.preventDefault();
	tabs[next].focus();
	root.setAttribute('data-active', tabs[next].dataset.trigger);
};

Tabs.onMount((root) => {
	/** If no data-active on root, pull from the first active child */
	if (!root.hasAttribute('data-active')) {
		const activeChild = children(root, '[data-trigger][data-active]')[0];
		if (activeChild) {
			root.setAttribute('data-active', activeChild.dataset.trigger);
		}
	}

	applyActive(root);
	updateAria(root, TABS_ARIA);

	listen(
		root,
		'click',
		(e, tab) => root.setAttribute('data-active', tab.dataset.trigger),
		'[data-trigger]',
	);

	listen(root, 'keydown', onKeydown, '[data-trigger]');
});

Tabs.onEffect('data-active', (root, _new, oldValue) => {
	applyActive(root);
	updateAria(root, TABS_ARIA);
	emit(root, 'barely:tabchange', {
		active: root.dataset.active,
		previous: oldValue,
	});
});
