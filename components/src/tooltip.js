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
 *     <div data-target><strong>Bold</strong> tooltip</div>
 *   </div>
 *
 * Positioning is CSS-driven: fitToViewport computes placement and shift,
 * written to --shift-x/--shift-y CSS vars
 *
 * Offsets are refracted to --offset-x/y, applied in positioning.css
 * Show/hide delays use CSS transition-delay which means no JS timers
 *
 * Config attrs:
 *   data-placement     - top | right | bottom | left (default: top)
 *   data-offset-x/y    - px gap from trigger
 *   data-show-delay    - ms before showing
 *   data-hide-delay    - ms before hiding
 */

import './base.css';
import './positioning.css';
import './tooltip.css';

import {
	Barely,
	listen,
	child,
	setAttrs,
	ensureAttr,
	unitize,
	fitToViewport,
	adjustForWrapper,
	setCssVar,
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

		// fitToViewport shifts are trigger-relative. CSS left:50% centers on
		// the wrapper - adjust when trigger ≠ root (wrapper + trigger sibling pattern).
		const { adjustX, adjustY } = adjustForWrapper(root, trigger);

		setAttrs(tooltip, {
			'data-placement': placement,
			'data-open': true,
		});
		setCssVar(tooltip, 'shift-x', shiftX + adjustX, 'px');
		setCssVar(tooltip, 'shift-y', shiftY + adjustY, 'px');
	};

	const hide = () => tooltip.removeAttribute('data-open');

	listen(trigger, ['mouseenter', 'focus'], show);
	listen(trigger, ['mouseleave', 'blur'], hide);
	listen(window, 'scroll', hide);
});
