/**
 * @justbarely/components — Tabs
 *
 *	<div data-component="tabs">
 *		<button data-tab="tab1" data-active>Tab 1</button>
 *		<button data-tab="tab2">Tab 2</button>
 *		<div data-panel="tab1" data-active>Content 1</div>
 *		<div data-panel="tab2">Content 2</div>
 *	</div>
 *
 * Vertical tabs
 * Add data-vertical to the root and wrap the controls in whatever you like.
 * Keyboard nav switches to ArrowUp / ArrowDown.
 * CSS handles the side-by-side layout.
 *
 *	<div data-component="tabs" data-active="tab1" data-vertical>
 *		<div>
 *			<button data-tab="tab1" data-active></button>
 *			...
 *		</div>
 *		<div data-panel="tab1" data-active>Content 1</div>
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

import { Barely, listen, emit, children, updateAria } from '@justbarely/engine';

/** Register the component */
const Tabs = Barely.register('tabs', { watch: ['data-active'] });

/** ARIA + behavioral attrs applied on mount and on every state change */
const TABS_ARIA = {
	root: (el) => {
		const attrs = { role: 'tablist' };
		if (el.hasAttribute('data-vertical')) {
			attrs['aria-orientation'] = 'vertical';
		}
		return attrs;
	},
	'[data-tab]': (el) => ({
		role: 'tab',
		'aria-controls': `barely-panel-${el.dataset.tab}`,
		id: `barely-tab-${el.dataset.tab}`,
		'aria-selected': el.hasAttribute('data-active') ? 'true' : 'false',
		tabindex: el.hasAttribute('data-active') ? '0' : '-1',
	}),
	'[data-panel]': (el) => ({
		role: 'tabpanel',
		'aria-labelledby': `barely-tab-${el.dataset.panel}`,
		id: `barely-panel-${el.dataset.panel}`,
	}),
};

/** Toggle data-active flag on tabs and panels so CSS can hide inactive ones */
const applyActive = (root) => {
	const key = root.dataset.active;

	children(root, '[data-tab]').forEach((tab) => {
		if (tab.dataset.tab === key) tab.setAttribute('data-active', '');
		else tab.removeAttribute('data-active');
	});

	children(root, '[data-panel]').forEach((panel) => {
		if (panel.dataset.panel === key) panel.setAttribute('data-active', '');
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
	const tabs = children(root, '[data-tab]');
	const i = tabs.indexOf(tab);
	if (i === -1) return;

	const vertical = root.hasAttribute('data-vertical');
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
			root.setAttribute('data-active', tab.dataset.tab);
			return;
		default:
			return;
	}

	e.preventDefault();
	tabs[next].focus();
	root.setAttribute('data-active', tabs[next].dataset.tab);
};

Tabs.onMount((root) => {
	/** If no data-active on root, pull from the first active child */
	if (!root.hasAttribute('data-active')) {
		const activeChild = children(root, '[data-tab][data-active]')[0];
		if (activeChild) {
			root.setAttribute('data-active', activeChild.dataset.tab);
		}
	}

	applyActive(root);
	updateAria(root, TABS_ARIA);

	listen(
		root,
		'click',
		(e, tab) => root.setAttribute('data-active', tab.dataset.tab),
		'[data-tab]',
	);

	listen(root, 'keydown', onKeydown, '[data-tab]');
});

Tabs.onEffect('data-active', (root) => {
	applyActive(root);
	updateAria(root, TABS_ARIA);
	emit(root, 'barely:tabchange', { active: root.dataset.active });
});
