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
 * Positioning is CSS-driven: placeTarget computes placement and shift,
 * written to --shift-x/--shift-y CSS vars
 *
 * Offsets are refracted to --offset-x/y, applied in positioning.css
 * Show/hide delays use CSS transition-delay which means no JS timers
 *
 * Config attrs:
 *   data-placement     - top | right | bottom | left, or a corner
 *                        (top-left, bottom-right, ...) (default: top)
 *   data-offset-x/y    - px gap from trigger
 *   data-show-delay    - ms before showing
 *   data-hide-delay    - ms before hiding
 */

import '../base.css';
import '../positioning.css';
import './tooltip.css';

import {
	Barely,
	listen,
	el,
	setAttrs,
	ensureAttr,
	describeAria,
	unitize,
	placeTarget,
} from '@justbarely/engine';

export const Tooltip = Barely.register('tooltip', {
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

Tooltip.onMount((root) => {
	// Strip native title to prevent the default browser tooltip
	const title = root.getAttribute('title');
	if (title) {
		root.setAttribute('aria-label', title);
		root.removeAttribute('title');
	}

	// Trigger is [data-trigger] child, or root itself
	const trigger = el(root, '[data-trigger]') || root;

	// Tooltip is [data-target] child, or built from title/data-content
	let tooltip = el(root, '[data-target]');

	if (!tooltip) {
		if (!title) return;

		tooltip = document.createElement('div');
		tooltip.setAttribute('data-target', '');
		tooltip.setAttribute('role', 'tooltip');
		tooltip.textContent = title;
		root.appendChild(tooltip);
	}

	// Tooltip describes the trigger
	// Authored [data-target] markup needs the role too, not just generated ones.
	ensureAttr(tooltip, 'role', 'tooltip');
	describeAria(trigger, tooltip, { prefix: 'tooltip' });

	const show = () => {
		placeTarget(root, trigger, tooltip, root.dataset.placement ?? 'top');
		setAttrs(tooltip, { 'data-open': true });
	};

	const hide = () => tooltip.removeAttribute('data-open');

	listen(trigger, ['mouseenter', 'focus'], show);
	listen(trigger, ['mouseleave', 'blur'], hide);
	listen(window, 'scroll', hide);

	// Dismissible. On the document because the tooltip can be opened via hover
	// while focus is somewhere else.
	listen(document, 'keydown', (e) => {
		if (e.key === 'Escape' && tooltip.hasAttribute('data-open')) hide();
	});
});
