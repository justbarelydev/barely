/**
 * @justbarely/components - Popover
 *
 * There are a few ways to implement this:
 *
 *   <!-- title only -->
 *   <button data-component="popover" title="Save changes">
 *     Save
 *   </button>
 *
 *   <!-- title + data-content -->
 *   <button data-component="popover" title="Delete" data-content="Are you sure?">
 *     Delete
 *   </button>
 *
 *   <!-- existing element -->
 *   <button data-component="popover" data-trigger="custom">
 *     Open
 *   </button>
 *   <div data-popover="custom">...</div>
 *
 *   <!-- <template> for full HTML -->
 *   <button data-component="popover" data-trigger="menu">
 *     Actions
 *   </button>
 *   <template data-popover="menu">
 *     <div role="dialog" aria-label="Menu">...</div>
 *   </template>
 *
 * Key ties a trigger to its content. Barely looks for content document-wide,
 * but you can scope it to a container with [data-container=".selector"].
 *
 * Config attrs:
 *   data-placement         - top | right | bottom | left (default: bottom)
 *   data-offset-x/y        - px gap from trigger (refracted to CSS vars)
 *   data-mode="persistent" - no light dismiss, must use data-close
 *   data-container         - portal container - scopes target lookup
 *   data-close             - button inside popover that closes it
 *   data-focus             - element inside popover to focus on open
 *
 * Events:
 *   barely:beforechange -> { open, target }
 *   barely:afterchange  -> { open, target }
 */

import './base.css';
import './popover.css';

import {
	Barely,
	ensureAttr,
	fitToViewport,
	hasMode,
	popupCoords,
	setAttrs,
	listen,
	emit,
	unitize,
	waitForAnimation,
} from '@justbarely/engine';

const Popover = Barely.register('popover', {
	refract: ['data-offset-x', 'data-offset-y'],
});

// Add px to refracted vars if no unit is provided
Popover.onRefract('data-offset-x', unitize('px'));
Popover.onRefract('data-offset-y', unitize('px'));

let popoverId = 0;

const isOpen = (target) => target.hasAttribute('data-open');

/**
 * Create or find the target for a trigger. Returns the element and
 * whether Barely owns (generated) it. If owned it will remove on hide.
 */
const getTarget = (root) => {
	const targetKey = root.dataset.trigger;

	if (targetKey) {
		// Look for data-container, otherwise scope to document
		const scope = root.dataset.container
			? document.querySelector(root.dataset.container)
			: document;

		// Skip if container is declared but not found
		if (!scope) return { target: null, owns: false };

		// Warn for duplicate keys so two popovers can't silently point to the same
		// target. Ignore open/in-flight keys (Barely clones for templates).
		const matches = scope.querySelectorAll(
			`[data-popover="${targetKey}"]:not([data-open])`,
		);
		if (matches.length > 1)
			console.warn(`[barely] duplicate data-popover key "${targetKey}"`);

		// Templates are cloned
		const template = scope.querySelector(
			`template[data-popover="${targetKey}"]`,
		);
		if (template) {
			const clone = template.content.cloneNode(true).firstElementChild;
			if (clone) {
				clone.setAttribute('data-popover', targetKey);
				return { target: clone, owns: true };
			}
		}

		// Live elements are used as-is
		const live = scope.querySelector(`[data-popover="${targetKey}"]`);
		if (live) return { target: live, owns: false };
	}

	// String content: title + data-content
	const title = root._barelyTitle;
	const content = root.dataset.content;
	if (title || content) {
		const el = document.createElement('div');
		el.setAttribute('data-popover', '');
		el.setAttribute('role', 'dialog');

		if (title) {
			const titleEl = document.createElement('div');
			titleEl.setAttribute('data-popover-title', '');
			titleEl.textContent = title;
			el.appendChild(titleEl);
		}

		if (content) {
			const contentEl = document.createElement('div');
			contentEl.setAttribute('data-popover-content', '');
			contentEl.textContent = content;
			el.appendChild(contentEl);
		}

		return { target: el, owns: true };
	}

	return { target: null, owns: false };
};

const show = (root) => {
	const { target, owns } = getTarget(root);
	if (!target) return;
	if (target.hasAttribute('data-open')) return;

	target._barelyOwns = owns;
	root._barelyTarget = target;

	// ARIA: link trigger to content
	const contentId = root._barelyContentId;
	ensureAttr(target, 'id', contentId);
	root.setAttribute('aria-controls', contentId);

	// ARIA: dialog label - copy from trigger if the target doesn't have one
	if (
		!target.hasAttribute('aria-label') &&
		!target.hasAttribute('aria-labelledby')
	) {
		const label = root.getAttribute('aria-label') || root._barelyTitle;
		if (label) ensureAttr(target, 'aria-label', label);
	}

	// Close button - listen once
	if (!target._barelyHasClose) {
		target._barelyHasClose = true;
		listen(target, 'click', () => hide(root), '[data-close]');
	}

	// Plop it in layout so we can measure it, then position it
	Object.assign(target.style, {
		position: 'absolute',
	});

	// If barely created the target, append it to the container (or body)
	let container = null;
	if (owns) {
		container = root.dataset.container
			? document.querySelector(root.dataset.container) || document.body
			: document.body;
		if (container !== document.body) {
			const wrapper = document.createElement('div');
			wrapper.style.position = 'relative';
			wrapper.appendChild(target);
			container.appendChild(wrapper);
		} else {
			container.appendChild(target);
		}
	}

	const preferred = root.dataset.placement ?? 'bottom';
	const offsetX = parseFloat(root.style.getPropertyValue('--offset-x')) || 0;
	const offsetY = parseFloat(root.style.getPropertyValue('--offset-y')) || 0;
	const fit = fitToViewport(root, target, preferred);
	const { top, left } = popupCoords(
		root.getBoundingClientRect(),
		target.getBoundingClientRect(),
		fit,
		offsetX,
		offsetY,
	);

	if (container && container !== document.body) {
		const wrapper = target.parentElement.getBoundingClientRect();
		Object.assign(target.style, {
			top: `${top - wrapper.top}px`,
			left: `${left - wrapper.left}px`,
		});
	} else {
		Object.assign(target.style, {
			top: `${top + scrollY}px`,
			left: `${left + scrollX}px`,
		});
	}

	emit(root, 'barely:beforechange', { open: true, target });

	// Fresh targets need a reflow + frame before [data-open], or the enter
	// transition has no starting point.
	target.offsetHeight;
	requestAnimationFrame(() => {
		setAttrs(target, {
			'data-placement': fit.placement,
			'data-open': true,
			'aria-hidden': false,
		});
		setAttrs(root, { 'aria-expanded': 'true' });

		const el = target.querySelector('[data-focus]') || target;
		if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
		el.focus();

		emit(root, 'barely:afterchange', { open: true, target });
	});
};

const hide = (root, returnFocus = true) => {
	const target = root._barelyTarget;
	if (!target) return;
	if (!target.hasAttribute('data-open')) return;

	emit(root, 'barely:beforechange', { open: false, target });
	setAttrs(target, { 'data-open': false, 'aria-hidden': true });
	setAttrs(root, { 'aria-expanded': 'false' });
	emit(root, 'barely:afterchange', { open: false, target });

	if (returnFocus) root.focus();

	if (!target._barelyOwns) return;

	// Clean up nested popovers before removing the container
	const nested = target.querySelectorAll('[data-component="popover"]');
	for (const n of nested) {
		if (n._barelyTarget && isOpen(n._barelyTarget)) hide(n, false);
	}

	// Wait for the fade-out, then remove.
	waitForAnimation(target, () => {
		const wrapper = target.parentElement;
		if (wrapper && wrapper !== document.body) wrapper.remove();
		else target.remove();
	});
};

Popover.onMount((root) => {
	// Strip native title to prevent the default browser tooltip
	const title = root.getAttribute('title');
	if (title) {
		root.setAttribute('aria-label', title);
		root.removeAttribute('title');
		root._barelyTitle = title;
	}

	// ARIA: popover content id
	const triggerId =
		root.getAttribute('id') || `popover-trigger-${popoverId++}`;
	setAttrs(root, { id: triggerId, 'aria-expanded': 'false' });
	ensureAttr(root, 'aria-haspopup', 'dialog');
	root._barelyContentId = `${triggerId}-content`;

	// Toggle on click
	listen(root, 'click', () => {
		const target = root._barelyTarget;
		target && isOpen(target) ? hide(root) : show(root);
	});

	// Dismiss if not persistent
	if (hasMode(root, 'persistent')) return;

	// Dismiss on Escape key
	listen(document, 'keydown', (e) => {
		if (
			e.key === 'Escape' &&
			root._barelyTarget &&
			isOpen(root._barelyTarget)
		)
			hide(root);
	});

	// Dismiss on click outside trigger + popover
	listen(document, 'click', (e) => {
		const target = root._barelyTarget;
		if (!target || !isOpen(target)) return;
		if (root.contains(e.target)) return;
		if (target.contains(e.target)) return;
		// Don't dismiss if the click is inside any popover, open or closing
		// (a nested close already removed [data-open] before this bubbles here)
		if (e.target.closest('[data-popover]')) return;
		hide(root);
	});
});
