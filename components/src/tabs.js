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
 *                switches to ArrowUp / ArrowDown.
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

const Tabs = Barely.register('tabs');

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

const activate = (root, key) => {
	children(root, '[data-trigger]').forEach((el) => {
		if (el.dataset.trigger === key) el.setAttribute('data-active', '');
		else el.removeAttribute('data-active');
	});

	children(root, '[data-target]').forEach((el) => {
		if (el.dataset.target === key) el.setAttribute('data-active', '');
		else el.removeAttribute('data-active');
	});

	updateAria(root, TABS_ARIA);
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
	updateAria(root, TABS_ARIA);

	listen(
		root,
		'click',
		(e, tab) => activate(root, tab.dataset.trigger),
		'[data-trigger]',
	);

	listen(root, 'keydown', onKeydown, '[data-trigger]');
});
