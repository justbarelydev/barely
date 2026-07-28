import {
	Barely,
	children,
	fitToViewport,
	setAttrs,
	listen,
} from '@justbarely/engine';

export const Tooltip = Barely.register('tooltip');

let tooltipId = 0;

Tooltip.onMount((root) => {
	let trigger, tooltip;
	const target = children(root, '[data-target]')[0];

	if (target) {
		// Method 1: [data-trigger]/[data-target] for html tooltips
		trigger = children(root, '[data-trigger]')[0];
		tooltip = target;
	} else {
		// Method 2: [title] attribute - root as trigger, [title] as content
		trigger = root;
		tooltip = document.createElement('div');
		tooltip.setAttribute('role', 'tooltip');
		tooltip.setAttribute('data-target', '');
		tooltip.textContent = trigger.getAttribute('title') ?? '';
		trigger.setAttribute('aria-label', trigger.getAttribute('title') ?? '');
		trigger.removeAttribute('title');
		root.appendChild(tooltip);
	}

	// ARIA: use existing id or generate one
	const id = tooltip.getAttribute('id') || `tooltip-${tooltipId++}`;
	setAttrs(tooltip, { id });
	setAttrs(trigger, { 'aria-describedby': id });

	const show = () => {
		const preferred = root.dataset.placement ?? 'top';
		const { placement, shiftX, shiftY } = fitToViewport(
			trigger,
			tooltip,
			preferred,
		);

		setAttrs(tooltip, {
			'data-placement': placement,
			'data-open': true,
		});
		tooltip.style.setProperty('--tooltip-shift', `${shiftX}px`);
		tooltip.style.setProperty('--tooltip-shift-y', `${shiftY}px`);
	};

	const hide = () => tooltip.removeAttribute('data-open');

	listen(trigger, ['mouseenter', 'focus'], show);
	listen(trigger, ['mouseleave', 'blur'], hide);
});
