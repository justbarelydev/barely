/**
 * @justbarely/components - Popover
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
 *   <!-- <template> for full HTML -->
 *   <button data-component="popover" data-target="menu">
 *     Actions
 *   </button>
 *   <template data-target="menu">
 *     <div role="dialog" aria-label="Menu">...</div>
 *   </template>
 *
 *   <!-- existing element (hidden by default) -->
 *   <button data-component="popover" data-target="custom">
 *     Open
 *   </button>
 *   <div data-popover data-target="custom" hidden>...</div>
 *
 * Config attrs:
 *   data-mode="persistent" - no light dismiss, must use data-close
 *   data-placement         - top | right | bottom | left (default: bottom)
 *   data-offset-x/y 		- px gap from trigger (refracted to CSS vars)
 *   data-container         - CSS selector for scrollable container
 *   data-close             - button inside popover that closes it
 *   data-focus            	- element inside popover to focus on open
 *
 * Events:
 *   barely:popoverchange -> { open: boolean }
 */

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

const isOpen = (target) =>
	target.hasAttribute('data-open') || target.hasAttribute('data-opening');

/**
 * Create or find the target for a trigger. Returns the element and
 * whether Barely owns (generates) it (if owned it will remove on hide)
 */
const getTarget = (root) => {
	const targetKey = root.dataset.target;

	if (targetKey) {
		// Template: clone
		const template = document.querySelector(
			`template[data-target="${targetKey}"]`,
		);
		if (template) {
			const clone = template.content.cloneNode(true).firstElementChild;
			if (clone) {
				clone.setAttribute('data-popover', '');
				clone.setAttribute('data-target', targetKey);
				return { target: clone, owns: true };
			}
		}

		// Live element: use
		const live = document.querySelector(
			`[data-popover][data-target="${targetKey}"]`,
		);
		if (live) return { target: live, owns: false };
	}

	// String content: build it from title + data-content
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

	if (target._barelyOpening || target._barelyClosing) return;

	target._barelyOpening = true;
	target._barelyOwns = owns;
	root._barelyTarget = target;

	// ARIA: link trigger to content
	const contentId = root._barelyContentId;
	ensureAttr(target, 'id', contentId);
	root.setAttribute('aria-controls', contentId);

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
	if (owns) {
		const container = root.dataset.container
			? document.querySelector(root.dataset.container) || document.body
			: document.body;
		root._barelyContainer = container;
		if (container !== document.body) {
			const wrapper = document.createElement('div');
			wrapper.style.position = 'relative';
			wrapper.appendChild(target);
			container.appendChild(wrapper);
		} else {
			container.appendChild(target);
		}
	}

	target.removeAttribute('hidden');

	// If display:none is used instead of [hidden], override it
	if (getComputedStyle(target).display === 'none') {
		target.style.display = 'block';
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

	const container = root._barelyContainer;
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

	// Force a reflow to let the browser catch up before we start the fade-in
	target.offsetHeight;
	requestAnimationFrame(() => {
		setAttrs(target, {
			'data-placement': fit.placement,
			'data-closing': false,
			'data-opening': true,
		});
		setAttrs(root, { 'aria-expanded': 'true' });

		target._barelyReturnFocus = root;

		waitForAnimation(target, () => {
			requestAnimationFrame(() => {
				const el = target.querySelector('[data-focus]') || target;
				if (!el.hasAttribute('tabindex'))
					el.setAttribute('tabindex', '-1');
				el.focus();

				target._barelyOpening = false;
				setAttrs(target, {
					'data-open': true,
					'data-opening': false,
				});
				emit(root, 'barely:popoverchange', { open: true });
			});
		});
	});
};

const hide = (root, returnFocus = true) => {
	const target = root._barelyTarget;
	if (!target) return;
	if (target._barelyClosing || target._barelyOpening) return;

	target._barelyClosing = true;

	setAttrs(target, { 'data-closing': true });
	setAttrs(root, { 'aria-expanded': 'false' });

	waitForAnimation(target, () => {
		target._barelyClosing = false;
		setAttrs(target, { 'data-open': false, 'data-closing': false });

		if (target._barelyOwns) {
			// Clean up nested popovers before removing the container
			const nested = target.querySelectorAll(
				'[data-component="popover"]',
			);
			for (const n of nested) {
				if (n._barelyTarget && isOpen(n._barelyTarget)) hide(n, false);
			}

			// Remove wrapper or target itself
			const wrapper = target.parentElement;
			if (wrapper && wrapper !== document.body) wrapper.remove();
			else target.remove();
		} else {
			target.setAttribute('hidden', '');
			target.style.display = '';
		}

		if (returnFocus) {
			const returnTo = target._barelyReturnFocus;
			if (returnTo) {
				target._barelyReturnFocus = null;
				returnTo.focus();
			}
		}

		emit(root, 'barely:popoverchange', { open: false });
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
		// Don't dismiss if click is inside any open popover
		if (e.target.closest('[data-popover][data-open]')) return;
		hide(root);
	});
});
