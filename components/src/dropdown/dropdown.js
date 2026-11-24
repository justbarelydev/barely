/**
 * Dropdown - a click-triggered menu.
 *
 *   <div data-component="dropdown">
 *     <button data-trigger>Actions</button>
 *     <div data-target role="menu">
 *       <button role="menuitem" data-value="edit">Edit</button>
 *       <button role="menuitem" data-value="delete">Delete</button>
 *     </div>
 *   </div>
 *
 * The menu is not a so it stays where it is and gets clipped by scroll
 * containers and doesn't need a scroll listener for positioning while scrolling.
 */

import '../base.css';
import '../positioning.css';
import './dropdown.css';

import {
	Barely,
	el,
	els,
	ensureAttr,
	placeTarget,
	setAttrs,
	listen,
	emit,
	unitize,
	linkAria,
	rovingTabindex,
	restoreFocus,
	bindKeynav,
} from '@justbarely/engine';

export const Dropdown = Barely.register('dropdown', {
	refract: ['data-offset-x', 'data-offset-y'],
});

Dropdown.onRefract('data-offset-x', unitize('px'));
Dropdown.onRefract('data-offset-y', unitize('px'));

const menuItems = (menu) => els(menu, 'button, [role^="menuitem"]');

// Ensure only the active item is tabbable
const focusItem = (menu, item) => {
	const items = menuItems(menu);
	rovingTabindex(items, items.indexOf(item));
	item.focus();
};

// [data-focus] can be "last", a data-value, or the default.
const initialItem = (root, menu) => {
	const items = menuItems(menu);
	if (!items.length) return null;

	const focus = root.dataset.focus;
	if (focus === 'last') return items[items.length - 1];
	if (focus) {
		const match = items.find((el) => el.dataset.value === focus);
		if (match) return match;
	}

	// Default follows menu positioning. If the menu opens downward, the first el
	// gets focused. If the menu opens upward, the last item is focused.
	// Overridable with [data-focus]
	return menu.dataset.placement?.startsWith('top')
		? items[items.length - 1]
		: items[0];
};

const select = (root, item) => {
	emit(root, 'barely:dropdownselect', {
		item,
		value: item.dataset.value || item.textContent.trim(),
	});
	root._barelyClose?.();
};

Dropdown.onMount((root) => {
	// _barely* props are ours - namespaced so they can't clash with user props
	const trigger = el(root, '[data-trigger]') || el(root, 'button');
	if (!trigger) return;

	const menu = el(root, '[data-target]');
	if (!menu) return;
	root._barelyMenu = menu;

	// A menu has to have a name, and its items can't give it one so it borrows
	// the trigger's. linkAria also gives the trigger the id that it needs.
	setAttrs(trigger, { 'aria-expanded': false });
	ensureAttr(trigger, 'aria-haspopup', 'menu');
	linkAria(trigger, menu, { prefix: 'dropdown' });

	ensureAttr(menu, 'role', 'menu');
	setAttrs(menu, { 'aria-hidden': true });
	menuItems(menu).forEach((el) => {
		if (!el.hasAttribute('role')) setAttrs(el, { role: 'menuitem' });
	});

	// The menu is always in the DOM, hidden by CSS - so it stays measurable and
	// CSS can transition it against [data-open].
	const isOpen = () => menu.hasAttribute('data-open');

	const openMenu = () => {
		if (menu.hasAttribute('data-open')) return;

		setAttrs(trigger, { 'aria-expanded': true });

		placeTarget(root, trigger, menu, root.dataset.placement ?? 'bottom');
		menu._barelyReturnFocus = trigger;

		emit(root, 'barely:beforechange', {
			open: true,
			trigger,
			target: menu,
		});
		setAttrs(menu, { 'data-open': true, 'aria-hidden': false });

		const item = initialItem(root, menu);
		if (item) focusItem(menu, item);
		emit(root, 'barely:afterchange', { open: true, trigger, target: menu });
	};

	const closeMenu = () => {
		if (!menu.hasAttribute('data-open')) return;

		emit(root, 'barely:beforechange', {
			open: false,
			trigger,
			target: menu,
		});
		setAttrs(trigger, { 'aria-expanded': false });
		setAttrs(menu, { 'data-open': false, 'aria-hidden': true });

		restoreFocus(menu);

		emit(root, 'barely:afterchange', {
			open: false,
			trigger,
			target: menu,
		});
	};

	root._barelyClose = closeMenu; // so dismiss handlers can reach it

	listen(trigger, 'click', () => (isOpen() ? closeMenu() : openMenu()));

	// Arrows move, Enter/Space selects (arrows alone don't activate)
	bindKeynav(menu, {
		items: () => menuItems(menu),
		delegate: '[role="menuitem"]',
		orientation: 'vertical',
		active: () => menuItems(menu).indexOf(document.activeElement),
		activate: (i, item) => select(root, item),
		activateOnArrow: false,
		onEscape: closeMenu,
		typeahead: true,
	});

	listen(menu, 'click', (_, item) => select(root, item), '[role="menuitem"]');

	// Esc works on the menu item or the trigger
	listen(document, 'keydown', (e) => {
		if (e.key === 'Escape' && isOpen()) closeMenu();
	});

	listen(document, 'click', (e) => {
		if (!isOpen()) return;
		if (root.contains(e.target)) return;
		if (menu.contains(e.target)) return;
		// Prevent clicks inside another component from dismissing
		if (
			e.target.closest(
				'[data-component="dropdown"] [data-target][data-open]',
			)
		)
			return;
		closeMenu();
	});
});
