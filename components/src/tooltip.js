/**
 * @justbarely/components - Tooltip
 *
 * A transient little label that appears on hover/focus and hides on scroll
 *
 *   <!-- title attribute: root is the trigger -->
 *   <button data-component="tooltip" title="Save changes">
 *     Save
 *   </button>
 *
 *   <!-- wrapper + [data-trigger]/[data-target]: siblings for rich HTML -->
 *   <div data-component="tooltip">
 *     <button data-trigger>Save</button>
 *     <div data-target hidden><strong>Bold</strong> tooltip</div>
 *   </div>
 *
 * Positioning is CSS-driven: fitToViewport computes placement and shift,
 * which is then written to --tooltip-shift CSS vars
 *
 * Offsets are refracted and calculated in translate()
 * Show/hide delays use CSS transition-delay which means no JS timers
 *
 * Config attrs:
 *   data-placement     - top | right | bottom | left (default: top)
 *   data-offset-x/y    - px gap from trigger
 *   data-show-delay    - ms before showing
 *   data-hide-delay    - ms before hiding
 */

import {
	Barely,
	listen,
	child,
	setAttrs,
	ensureAttr,
	unitize,
	fitToViewport,
} from '@justbarely/engine';

const Tooltip = Barely.register('tooltip', {
	refract: [
		'data-offset-x',
		'data-offset-y',
		'data-show-delay',
		'data-hide-delay',
	],
});

Tooltip.onRefract('data-offset-x', unitize('px'));
Tooltip.onRefract('data-offset-y', unitize('px'));
Tooltip.onRefract('data-show-delay', unitize('ms'));
Tooltip.onRefract('data-hide-delay', unitize('ms'));

let tooltipId = 0;

Tooltip.onMount((root) => {
	// Strip native title to prevent the default browser tooltip
	const title = root.getAttribute('title');
	if (title) {
		root.setAttribute('aria-label', title);
		root.removeAttribute('title');
	}

	// Trigger is [data-trigger] child, or root itself
	const trigger = child(root, '[data-trigger]') || root;

	// Tooltip is [data-target] child, or built from title/data-content
	let tooltip = child(root, '[data-target]');

	if (!tooltip) {
		if (!title) return;

		tooltip = document.createElement('div');
		tooltip.setAttribute('data-target', '');
		tooltip.setAttribute('role', 'tooltip');
		tooltip.textContent = title;
		root.appendChild(tooltip);
	}

	// Remove [hidden] so CSS controls visibility.
	// Guard display:none - user may have used that instead of [hidden].
	tooltip.removeAttribute('hidden');
	if (getComputedStyle(tooltip).display === 'none') {
		tooltip.style.display = 'block';
	}

	// ARIA
	const id = tooltip.getAttribute('id') || `tooltip-${tooltipId++}`;
	setAttrs(tooltip, { id });
	ensureAttr(trigger, 'aria-describedby', id);

	const show = () => {
		const preferred = root.dataset.placement ?? 'top';
		const { placement, shiftX, shiftY } = fitToViewport(
			trigger,
			tooltip,
			preferred,
		);

		// fitToViewport shifts are viewport-relative to the trigger.
		// If using a wrapper (trigger !== root), the CSS left:50% centers on the
		// wrapper, not the trigger. Adjust shifts by the trigger→wrapper offset.
		let adjustX = 0,
			adjustY = 0;
		if (trigger !== root) {
			const rootRect = root.getBoundingClientRect();
			const triggerRect = trigger.getBoundingClientRect();

			adjustX =
				triggerRect.left +
				triggerRect.width / 2 -
				(rootRect.left + rootRect.width / 2);
			adjustY =
				triggerRect.top +
				triggerRect.height / 2 -
				(rootRect.top + rootRect.height / 2);
		}

		setAttrs(tooltip, {
			'data-placement': placement,
			'data-open': true,
		});
		tooltip.style.setProperty('--tooltip-shift', `${shiftX + adjustX}px`);
		tooltip.style.setProperty('--tooltip-shift-y', `${shiftY + adjustY}px`);
	};

	const hide = () => tooltip.removeAttribute('data-open');

	listen(trigger, ['mouseenter', 'focus'], show);
	listen(trigger, ['mouseleave', 'blur'], hide);
	listen(window, 'scroll', hide);
});
