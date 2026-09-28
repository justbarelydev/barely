/**
 * @justbarely/components - Tabs
 *
 *   <div data-component="tabs" data-active="tab1">
 *     <div data-triggers>
 *       <button data-trigger="tab1" data-active>Tab 1</button>
 *       <button data-trigger="tab2">Tab 2</button>
 *     </div>
 *     <!-- Panel wrapper element: recommended but not strictly required -->
 *     <div>
 *       <div data-target="tab1" data-active>Content 1</div>
 *       <div data-target="tab2">Content 2</div>
 *     </div>
 *   </div>
 *
 * Two containers. [data-triggers] (required) - it's the tablist and the strip.
 * The panels go in a wrapper element: the wrapper is what keeps them one item
 * in the root row, which vertical needs. Flat markup still works, but you'll
 * get a warning in onMount (you can ignore it).
 *
 * [data-active] on the root is the source of truth; set it to switch tabs.
 * Marking an active child instead seeds the initial state before JS runs.
 *
 * Tab changes are paint-only. To animate container size, listen for
 * barely:beforechange/afterchange and measure with setSize().
 *
 * Config attrs:
 *   data-mode="vertical" - tabs on left, panels on right
 *   	- for panels on left/tabs on right use CSS flex-direction: row-reverse
 *
 * Events:
 *   barely:beforechange -> { active, previous, trigger, target }  (before sync)
 *   barely:afterchange  -> { active, previous, trigger, target }  (after sync)
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
	ensureId,
	uid,
} from '@justbarely/engine';

const Tabs = Barely.register('tabs', { watch: ['data-active'] });

// Auto-inject a11y on mount/change
const syncAria = (root) => {
	// Missing strip: fall back to the root, and warn in onMount
	const strip = children(root, '[data-triggers]')[0];
	const listAttrs = { role: 'tablist' };
	if (hasMode(root, 'vertical')) listAttrs['aria-orientation'] = 'vertical';
	setAttrs(strip ?? root, listAttrs);
	// Drop it from the root if a strip appeared later
	if (strip) setAttrs(root, { role: false, 'aria-orientation': false });

	const panels = children(root, '[data-target]');
	const triggers = children(root, '[data-trigger]');

	// One id per instance
	const base = ensureId(root, () => uid('tabs'));

	// Ids first: the wiring below reads them back
	panels.forEach((el) =>
		setAttrs(el, {
			role: 'tabpanel',
			id: ensureId(el, () => `${base}-panel-${el.dataset.target}`),
		}),
	);
	triggers.forEach((el) =>
		setAttrs(el, {
			role: 'tab',
			id: ensureId(el, () => `${base}-tab-${el.dataset.trigger}`),
		}),
	);

	triggers.forEach((el) => {
		const panel = panels.find(
			(p) => p.dataset.target === el.dataset.trigger,
		);
		setAttrs(el, {
			'aria-selected': el.hasAttribute('data-active'),
			'aria-controls': panel ? panel.id : false,
			tabindex: el.hasAttribute('data-active') ? '0' : '-1',
		});
		if (panel) setAttrs(panel, { 'aria-labelledby': el.id });
	});
};

// Sync children and ARIA from the root value
const sync = (root, key) => {
	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.trigger === key }),
	);
	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.target === key }),
	);
	syncAria(root);
};

// Only the root attr - onEffect does the rest (the MO fires before paint)
const activate = (root, key) => {
	setAttrs(root, { 'data-active': key });
};

// undefined previous is the init pass; null means the attr just appeared
Tabs.onEffect('data-active', (root, key, previous) => {
	if (previous === undefined) return;
	const trigger = children(root, '[data-trigger]').find(
		(el) => el.dataset.trigger === key,
	);
	const target = children(root, '[data-target]').find(
		(el) => el.dataset.target === key,
	);
	emit(root, 'barely:beforechange', {
		active: key,
		previous,
		trigger,
		target,
	});
	sync(root, key);
	emit(root, 'barely:afterchange', {
		active: key,
		previous,
		trigger,
		target,
	});
});

// Keyboard: arrows rove, Home/End jump, Enter/Space activate
const onKeydown = (e, tab, root) => {
	const tabs = children(root, '[data-trigger]');
	const i = tabs.indexOf(tab);
	if (i === -1) return;

	// Chords belong to the browser and OS (Alt+Left is Back on Windows/Linux)
	if (e.metaKey || e.ctrlKey || e.altKey) return;

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
	if (!children(root, '[data-triggers]').length)
		console.warn(
			'[barely] tabs: no [data-triggers] container. The panels end up inside the tablist; wrap the triggers.',
			root,
		);

	// A tablist always has a selection, so never start empty.
	const key =
		root.dataset.active ||
		children(root, '[data-trigger][data-active]')[0]?.dataset.trigger ||
		children(root, '[data-trigger]')[0]?.dataset.trigger;

	if (key) {
		setAttrs(root, { 'data-active': key });
		sync(root, key); // onEffect skips the init pass, so sync directly
	} else {
		syncAria(root); // no triggers at all
	}

	listen(
		root,
		'click',
		(e, tab) => activate(root, tab.dataset.trigger),
		'[data-trigger]',
	);

	listen(root, 'keydown', onKeydown, '[data-trigger]');
});
