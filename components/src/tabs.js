/**
 * @justbarely/components - Tabs
 *
 *   <div data-component="tabs" data-active="tab1">
 *     <button data-trigger="tab1" data-active>Tab 1</button>
 *     <button data-trigger="tab2">Tab 2</button>
 *     <div data-target="tab1" data-active>Content 1</div>
 *     <div data-target="tab2">Content 2</div>
 *   </div>
 *
 * [data-active] on root is the source of truth. Children sync from it, and you
 * can set [data-active] on root to switch tabs programmatically.
 *
 * [data-active] on individual triggers/targets is also supported for initial
 * state when no root attr is present.
 *
 * Tab changes are paint-only. To animate container dimensions, listen for
 * barely:beforechange/afterchange and measure with setSize().
 *
 * Config attrs:
 *   data-mode="vertical" - tabs on left, panels on right
 *   	- for panels on left/tabs on right use CSS flex-direction: row-reverse
 *
 * Events:
 *   barely:beforechange -> { active: key, previous }   (before sync)
 *   barely:afterchange  -> { active: key, previous }   (after sync)
 */

import './base.css';
import './tabs.css';

import { wrap } from '@justbarely/core';
import {
	Barely,
	listen,
	emit,
	children,
	setAttrs,
	hasMode,
} from '@justbarely/engine';

const Tabs = Barely.register('tabs', { watch: ['data-active'] });

// Auto-inject a11y on mount/change
const syncAria = (root) => {
	const rootAttrs = { role: 'tablist' };
	if (hasMode(root, 'vertical')) rootAttrs['aria-orientation'] = 'vertical';
	setAttrs(root, rootAttrs);

	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, {
			role: 'tab',
			'aria-selected': el.hasAttribute('data-active'),
			'aria-controls': 'target-' + el.dataset.trigger,
			id: 'trigger-' + el.dataset.trigger,
			tabindex: el.hasAttribute('data-active') ? '0' : '-1',
		}),
	);

	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, {
			role: 'tabpanel',
			'aria-labelledby': 'trigger-' + el.dataset.target,
			id: 'target-' + el.dataset.target,
		}),
	);
};

// Sync child [data-active] attrs and ARIA from root's [data-active] value.
const sync = (root, key) => {
	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.trigger === key }),
	);
	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.target === key }),
	);
	syncAria(root);
};

// Set root attr, onEffect handles child sync/emit (MO fires before next paint).
const activate = (root, key) => {
	setAttrs(root, { 'data-active': key });
};

// Skip initial onEffect call with previous === null, emit before/after change
Tabs.onEffect('data-active', (root, key, previous) => {
	if (previous === null) return;
	emit(root, 'barely:beforechange', { active: key, previous });
	sync(root, key);
	emit(root, 'barely:afterchange', { active: key, previous });
});

// a11y keyboard navigation - arrow keys, home/end, enter/space
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
			next = wrap(i + 1, tabs.length);
			break;
		case prevKey:
			next = wrap(i - 1, tabs.length);
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
			activate(root, tab.dataset.trigger);
			return;
		default:
			return;
	}

	e.preventDefault();
	tabs[next].focus();
	activate(root, tabs[next].dataset.trigger);
};

Tabs.onMount((root) => {
	// Set initial state. Root [data-active] takes precedence, otherwise the first
	// child. With a key, hoist it to root and sync children/ARIA. Without a
	// key, inject ARIA only.
	const key =
		root.dataset.active ||
		children(root, '[data-trigger][data-active]')[0]?.dataset.trigger;

	if (key) {
		setAttrs(root, { 'data-active': key });
		sync(root, key); // MO not attached yet, onEffect won't fire
	} else {
		syncAria(root);
	}

	listen(
		root,
		'click',
		(e, tab) => activate(root, tab.dataset.trigger),
		'[data-trigger]',
	);

	listen(root, 'keydown', onKeydown, '[data-trigger]');
});
