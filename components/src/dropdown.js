/**
 * @justbarely/components - Dropdown / Menu
 *
 * Click-triggered menu with keyboard navigation and multi-open/nesting support.
 * Dropdowns are added as a sibling to the trigger element and are positioned
 * in-tree which has a few benefits:
 * - no scroll listener needed to keep it's relative position
 * - target gets properly clipped by overflow:hidden parents (scroll containers)
 * - no portal needed
 *
 *   <div data-component="dropdown">
 *     <button data-trigger>Actions</button>
 *     <div data-target role="menu">
 *       <button role="menuitem" data-value="edit">Edit</button>
 *       <button role="menuitem" data-value="delete">Delete</button>
 *     </div>
 *   </div>
 *
 * Config attrs (on root wrapper):
 *   data-placement   - top | right | bottom | left (default: bottom)
 *   data-offset-x/y  - px gap from trigger (refracted to CSS vars)
 *   data-focus       - item to focus on open: "last", a data-value, or first
 *
 * Events:
 *   barely:beforechange   -> { open, trigger, target }
 *   barely:afterchange    -> { open, trigger, target }
 *   barely:dropdownselect -> { item, value }
 */

import './base.css';
import './positioning.css';
import './dropdown.css';

import { wrap } from '@justbarely/core';
import {
	Barely,
	child,
	children,
	ensureAttr,
	fitToViewport,
	adjustForWrapper,
	setAttrs,
	listen,
	emit,
	unitize,
	setCssVar,
} from '@justbarely/engine';

const Dropdown = Barely.register('dropdown', {
	refract: ['data-offset-x', 'data-offset-y'],
});

Dropdown.onRefract('data-offset-x', unitize('px'));
Dropdown.onRefract('data-offset-y', unitize('px'));

let dropdownId = 0;

// Get all menu items (buttons or [role^="menuitem"]) inside a menu
const menuItems = (menu) => children(menu, 'button, [role^="menuitem"]');

// Roving (cool word) tabindex - only the active item is tabbable
const focusItem = (menu, item) => {
	menuItems(menu).forEach((el) =>
		setAttrs(el, { tabindex: el === item ? '0' : '-1' }),
	);
	item.focus();
};

// Set focus on provided data-focus selector, first item, or last item if
// data-focus="last"
const initialItem = (root, menu) => {
	const items = menuItems(menu);
	if (!items.length) return null;
	const focus = root.dataset.focus;
	if (focus === 'last') return items[items.length - 1];
	if (focus)
		return items.find((el) => el.dataset.value === focus) || items[0];
	return items[0];
};

// Select an item and close the menu
const select = (root, item) => {
	emit(root, 'barely:dropdownselect', {
		item,
		value: item.dataset.value || item.textContent.trim(),
	});
	root._barelyClose?.();
};

// Keyboard navigation
const onMenuKeydown = (e, item, root) => {
	const menu = root._barelyMenu;
	if (!menu) return;
	const items = menuItems(menu);
	const i = items.indexOf(item);
	if (i === -1) return;

	switch (e.key) {
		case 'ArrowDown':
			e.preventDefault();
			focusItem(menu, items[wrap(i + 1, items.length)]);
			return;
		case 'ArrowUp':
			e.preventDefault();
			focusItem(menu, items[wrap(i - 1, items.length)]);
			return;
		case 'Home':
			e.preventDefault();
			focusItem(menu, items[0]);
			return;
		case 'End':
			e.preventDefault();
			focusItem(menu, items[items.length - 1]);
			return;
		case 'Enter':
		case ' ':
			e.preventDefault();
			select(root, item);
			return;
		case 'Escape':
			e.preventDefault();
			root._barelyClose?.();
			return;
		default:
			// Default to first character match
			if (e.key.length === 1) {
				const char = e.key.toLowerCase();
				const match = items.find(
					(el) =>
						el.textContent.trim().charAt(0).toLowerCase() === char,
				);
				if (match) {
					e.preventDefault();
					focusItem(menu, match);
				}
			}
			return;
	}
};

Dropdown.onMount((root) => {
	// `_barely*` props are private to the component, namespaced so they never
	// interfere with user-set properties on the same node.

	// Trigger: explicit [data-trigger], or the first <button>
	const trigger = child(root, '[data-trigger]') || child(root, 'button');
	if (!trigger) return;

	// Menu: scoped sibling [data-target]
	const menu = child(root, '[data-target]');
	if (!menu) return;
	root._barelyMenu = menu;

	// ARIA on trigger and menu
	const triggerId =
		root.getAttribute('id') || `dropdown-trigger-${dropdownId++}`;
	setAttrs(root, { id: triggerId });
	setAttrs(trigger, { 'aria-expanded': 'false' });
	ensureAttr(trigger, 'aria-haspopup', 'menu');
	root._barelyMenuId = `${triggerId}-menu`;

	// ARIA - inject role="menu" and role="menuitem" if absent
	ensureAttr(menu, 'role', 'menu');
	setAttrs(menu, { 'aria-hidden': true }); // closed by default
	menuItems(menu).forEach((el) => {
		if (!el.hasAttribute('role')) setAttrs(el, { role: 'menuitem' });
	});

	// Open/close lifecycle. The menu is technically always rendered
	// (opacity: 0; visibility: hidden), so it's measurable for positioning
	// and CSS fades it in on [data-open]. Visually hidden and removed from
	// the a11y tree.
	const isOpen = () => menu.hasAttribute('data-open');

	const openMenu = () => {
		if (menu.hasAttribute('data-open')) return;

		// ARIA
		const menuId = root._barelyMenuId;
		ensureAttr(menu, 'id', menuId);
		setAttrs(trigger, {
			'aria-expanded': 'true',
			'aria-controls': menuId,
		});

		// Position while closed - visibility:hidden keeps layout intact, so the
		// menu is measurable without unhiding.
		const preferred = root.dataset.placement ?? 'bottom';
		const { placement, shiftX, shiftY } = fitToViewport(
			trigger,
			menu,
			preferred,
		);
		const { adjustX, adjustY } = adjustForWrapper(root, trigger);
		setAttrs(menu, { 'data-placement': placement });
		setCssVar(menu, 'shift-x', shiftX + adjustX, 'px');
		setCssVar(menu, 'shift-y', shiftY + adjustY, 'px');
		menu._barelyReturnFocus = trigger; // focus target restored on close

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
		setAttrs(trigger, { 'aria-expanded': 'false' });
		setAttrs(menu, { 'data-open': false, 'aria-hidden': true });

		const returnTo = menu._barelyReturnFocus;
		if (returnTo) {
			menu._barelyReturnFocus = null;
			returnTo.focus();
		}
		emit(root, 'barely:afterchange', {
			open: false,
			trigger,
			target: menu,
		});
	};

	root._barelyClose = closeMenu; // exposed so we can dismiss

	// Toggle on trigger click
	listen(trigger, 'click', () => (isOpen() ? closeMenu() : openMenu()));

	// Menu keyboard nav + item click select (one listener pass per menu)
	listen(
		menu,
		'keydown',
		(e, item) => onMenuKeydown(e, item, root),
		'[role="menuitem"]',
	);

	// Menu item click
	listen(menu, 'click', (_, item) => select(root, item), '[role="menuitem"]');

	// Dismiss on Escape (catches trigger-focus when keydown is not on a menuitem)
	listen(document, 'keydown', (e) => {
		if (e.key === 'Escape' && isOpen()) closeMenu();
	});

	// Dismiss on click
	listen(document, 'click', (e) => {
		if (!isOpen()) return;
		if (root.contains(e.target)) return;
		if (menu.contains(e.target)) return;
		// Don't dismiss if the click is inside another open menu
		if (
			e.target.closest(
				'[data-component="dropdown"] [data-target][data-open]',
			)
		)
			return;
		closeMenu();
	});
});
