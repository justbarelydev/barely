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
 * [data-triggers] (required for proper a11y) - becomes the tablist. If it's
 * missing it warns and falls back to the root.
 *
 * It's also recommended to wrap the panels in a container. It's required to make
 * vertical tabs work properly, and it's also just good practice. Styling and
 * animating are both easier with a wrapper.
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

import '../base.css';
import './tabs.css';

import {
	Barely,
	listen,
	emit,
	els,
	setAttrs,
	hasMode,
	linkTriggers,
	rovingTabindex,
	bindKeynav,
} from '@justbarely/engine';

export const Tabs = Barely.register('tabs', { watch: ['data-active'] });

// Auto-inject a11y on mount/change
const syncAria = (root) => {
	// Missing strip: fall back to the root, and warn in onMount
	const strip = els(root, '[data-triggers]')[0];
	const listAttrs = { role: 'tablist' };
	if (hasMode(root, 'vertical')) listAttrs['aria-orientation'] = 'vertical';
	setAttrs(strip ?? root, listAttrs);
	// Drop it from the root if a strip appeared later
	if (strip) setAttrs(root, { role: false, 'aria-orientation': null });

	// ids and aria-controls/aria-labelledby for each set of trigger/target
	const { triggers, targets: panels } = linkTriggers(root, {
		prefix: 'tabs',
	});

	panels.forEach((el) => setAttrs(el, { role: 'tabpanel' }));
	triggers.forEach((el) =>
		setAttrs(el, {
			role: 'tab',
			'aria-selected': el.hasAttribute('data-active'),
		}),
	);

	rovingTabindex(
		triggers,
		triggers.findIndex((el) => el.hasAttribute('data-active')),
	);
};

// Sync children and ARIA from the root value
const sync = (root, key) => {
	els(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.trigger === key }),
	);
	els(root, '[data-target]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.target === key }),
	);
	syncAria(root);
};

// Only the root attr - onChange does the rest (the MO fires before paint)
const activate = (root, key) => {
	setAttrs(root, { 'data-active': key });
};

// undefined previous is init; null means the attr just appeared
Tabs.onChange('data-active', (root, key, previous) => {
	if (previous === undefined) return;
	const trigger = els(root, '[data-trigger]').find(
		(el) => el.dataset.trigger === key,
	);
	const target = els(root, '[data-target]').find(
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

Tabs.onMount((root) => {
	// Failure is invisible otherwise. With no strip, the tablist ends up on the
	// root and the panels end up inside it, which only shows up in the a11y tree.
	if (!els(root, '[data-triggers]').length)
		console.warn(
			'[barely] tabs: no [data-triggers] container. The panels end up inside the tablist; wrap the triggers.',
			'[barely] tabs: no [data-triggers] container. For propery a11y, wrap the triggers in an element with [data-triggers]',
			root,
		);

	// A tablist always has a selection, so never start empty.
	const key =
		root.dataset.active ||
		els(root, '[data-trigger][data-active]')[0]?.dataset.trigger ||
		els(root, '[data-trigger]')[0]?.dataset.trigger;

	if (key) {
		setAttrs(root, { 'data-active': key });
		sync(root, key); // onChange skips init, so sync directly
	} else {
		syncAria(root); // no triggers at all
	}

	listen(
		root,
		'click',
		(e, tab) => activate(root, tab.dataset.trigger),
		'[data-trigger]',
	);

	// keyboard nav
	bindKeynav(root, {
		items: '[data-trigger]',
		delegate: '[data-trigger]',
		orientation: hasMode(root, 'vertical') ? 'vertical' : 'horizontal',
		active: () =>
			els(root, '[data-trigger]').findIndex((el) =>
				el.hasAttribute('data-active'),
			),
		activate: (i, trigger) => activate(root, trigger.dataset.trigger),
		activateOnArrow: true,
	});
});
