/**
 * @justbarely/components - Tabs
 *
 *   <div data-component="tabs">
 *     <button data-trigger="tab1" data-active>Tab 1</button>
 *     <button data-trigger="tab2">Tab 2</button>
 *     <div data-target="tab1" data-active>Content 1</div>
 *     <div data-target="tab2">Content 2</div>
 *   </div>
 *
 * Config attrs:
 *   data-mode="vertical" - tabs on left, panels on right
 *   	- for panels on left/tabs on right use CSS flex-direction: row-reverse
 *
 * Events:
 *   barely:tabchange -> { active: key }
 */

import { wrap } from '@justbarely/core';
import {
	Barely,
	listen,
	emit,
	children,
	setAttrs,
	hasMode,
} from '@justbarely/engine';

const Tabs = Barely.register('tabs');

const syncAria = (root) => {
	const rootAttrs = { role: 'tablist' };
	if (hasMode(root, 'vertical')) rootAttrs['aria-orientation'] = 'vertical';
	setAttrs(root, rootAttrs);

	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, {
			role: 'tab',
			'aria-selected': el.hasAttribute('data-active'),
			'aria-controls': `target-${el.dataset.trigger}`,
			id: `trigger-${el.dataset.trigger}`,
			tabindex: el.hasAttribute('data-active') ? '0' : '-1',
		}),
	);

	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, {
			role: 'tabpanel',
			'aria-labelledby': `trigger-${el.dataset.target}`,
			id: `target-${el.dataset.target}`,
		}),
	);
};

const activate = (root, key) => {
	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.trigger === key }),
	);

	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, { 'data-active': el.dataset.target === key }),
	);

	syncAria(root);
	emit(root, 'barely:tabchange', { active: key });
};

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
			// Prevent default behavior (space scrolling, enter submitting, etc)
			e.preventDefault();
			activate(root, tab.dataset.trigger);
			return;
		default:
			return;
	}

	// Prevent arrow keys from scrolling
	e.preventDefault();
	tabs[next].focus();
	activate(root, tabs[next].dataset.trigger);
};

Tabs.onMount((root) => {
	syncAria(root);

	listen(
		root,
		'click',
		(e, tab) => activate(root, tab.dataset.trigger),
		'[data-trigger]',
	);

	listen(root, 'keydown', onKeydown, '[data-trigger]');
});
