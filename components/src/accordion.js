/**
 * @justbarely/components - Accordion
 *
 * Native - <details>/<summary>. The browser owns the toggle; same [name] attr on
 * every details for exclusive.
 *
 *	<div data-component="accordion">
 *		<details open>
 *			<summary>Section 1</summary>
 *			<p>Content 1</p>
 *		</details>
 *	</div>
 *
 * Animating native details needs @starting-style + ::details-content with
 * transition-behavior: allow-discrete. Both are newly baseline, not widely
 * supported yet.
 *
 * ---
 *
 * Custom - [data-trigger]/[data-target]. Barely owns toggle, keyboard, ARIA.
 *
 *	<div data-component="accordion" data-mode="exclusive">
 *		<button data-trigger="a1" data-open>Section 1</button>
 *		<div data-target="a1" data-open>Content 1</div>
 *		<button data-trigger="a2">Section 2</button>
 *		<div data-target="a2">Content 2</div>
 *	</div>
 *
 * State: [data-open] on the trigger and the panel.
 *
 * Animation: closed panels stay rendered and clipped (height:0 vertically,
 * max-width:0 horizontally), because display:none can't transition (yet).
 * Opening measures the size and writes it as a CSS var to animate to. Horizontal
 * measures --panel-width instead, and re-measures on resize.
 *
 * Config attrs:
 *   data-mode - "exclusive" (one open at a time) | "horizontal" (side-by-side)
 *     - horizontal is always exclusive (the width math assumes one open panel)
 *     - data-mode=exclusive is only needed for the custom implementation,
 *       native <details> handles it automatically with the [name] attr
 *
 * Events:
 *   barely:beforechange -> { key, open, trigger, target }                    (custom)
 *   barely:afterchange  -> { key, open, trigger, target, openPanels }        (custom)
 *                          { open, detail, summary, openDetails }            (native)
 */

import './base.css';
import './accordion.css';

import {
	Barely,
	listen,
	emit,
	children,
	hasMode,
	setAttrs,
	setCssVar,
	setSize,
	resize,
} from '@justbarely/engine';

const Accordion = Barely.register('accordion');

// Container width minus the triggers, padding and column gaps
const measurePanelWidth = (root) => {
	const cs = getComputedStyle(root);
	const padding =
		(parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
	const gap = parseFloat(cs.columnGap) || 0;
	const gaps = gap * Math.max(0, root.children.length - 1);
	const strip = children(root, '[data-trigger]').reduce(
		(sum, t) => sum + t.offsetWidth,
		0,
	);
	return root.clientWidth - padding - gaps - strip;
};

// Write the width on every panel, closed ones included: the pinned inner width
// stops a 0-width panel wrapping and ballooning the container height.
const setPanelWidth = (root) => {
	const width = measurePanelWidth(root);
	children(root, '[data-target]').forEach((panel) =>
		setCssVar(panel, 'panel-width', width, 'px'),
	);
};

// Inject ARIA attributes
const syncAria = (root) => {
	children(root, '[data-trigger]').forEach((el) =>
		setAttrs(el, {
			'aria-expanded': el.hasAttribute('data-open'),
			'aria-controls': `target-${el.dataset.trigger}`,
			id: `trigger-${el.dataset.trigger}`,
		}),
	);

	children(root, '[data-target]').forEach((el) =>
		setAttrs(el, {
			role: 'region',
			'aria-labelledby': `trigger-${el.dataset.target}`,
			id: `target-${el.dataset.target}`,
			'aria-hidden': !el.hasAttribute('data-open'),
		}),
	);
};

// Open/close a panel and mirror data-open on the trigger. Opening measures first
// (--height vertical, --panel-width horizontal) so the transition starts fresh.
const setPanelOpen = (root, panel, trigger, open) => {
	if (open) {
		if (hasMode(root, 'horizontal')) setPanelWidth(root);
		else setSize(panel);
		setAttrs(panel, { 'data-open': true });
		if (trigger) setAttrs(trigger, { 'data-open': true });
	} else {
		setAttrs(panel, { 'data-open': false });
		if (trigger) setAttrs(trigger, { 'data-open': false });
	}
};

// Map of key -> { panel, trigger } for the handlers
const panelMap = (root) => {
	const triggers = children(root, '[data-trigger]');
	const map = new Map();
	children(root, '[data-target]').forEach((panel) => {
		const key = panel.dataset.target;
		map.set(key, {
			panel,
			trigger: triggers.find((t) => t.dataset.trigger === key),
		});
	});
	return map;
};

// Toggle a panel by key and close siblings if exclusive
const toggle = (root, key) => {
	const panels = panelMap(root);
	const entry = panels.get(key);
	if (!entry) return;

	const { panel, trigger } = entry;
	const open = !panel.hasAttribute('data-open');

	emit(root, 'barely:beforechange', { key, open, trigger, target: panel });

	if ((hasMode(root, 'exclusive') || hasMode(root, 'horizontal')) && open) {
		panels.forEach((e) => {
			if (e !== entry && e.panel.hasAttribute('data-open'))
				setPanelOpen(root, e.panel, e.trigger, false);
		});
	}

	setPanelOpen(root, panel, trigger, open);
	syncAria(root);
	emit(root, 'barely:afterchange', {
		key,
		open,
		trigger,
		target: panel,
		openPanels: children(root, '[data-target][data-open]'),
	});
};

const onTriggerClick = (_, trigger, root) =>
	toggle(root, trigger.dataset.trigger);

const onTriggerKeydown = (e, trigger, root) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		toggle(root, trigger.dataset.trigger);
	}
};

// Custom: [data-trigger]/[data-target]
const initCustom = (root) => {
	if (hasMode(root, 'horizontal')) {
		setPanelWidth(root);
		// Re-measure on resize: the container width changes
		resize(root, () => setPanelWidth(root));
	} else {
		// Set --height for any open panels so they can animate closed
		children(root, '[data-target][data-open]').forEach((panel) =>
			setSize(panel),
		);
	}

	syncAria(root);

	listen(root, 'click', onTriggerClick, '[data-trigger]');
	listen(root, 'keydown', onTriggerKeydown, '[data-trigger]');
};

// Native: the browser handles the toggle, [name] for exclusive
const initNative = (root) => {
	root.addEventListener(
		'toggle',
		(e) => {
			const detail = e.target;
			if (detail.tagName !== 'DETAILS') return;

			emit(root, 'barely:afterchange', {
				open: detail.open,
				detail,
				summary: detail.querySelector(':scope > summary'),
				openDetails: children(root, 'details[open]'),
			});
		},
		true,
	);
};

Accordion.onMount((root) => {
	children(root, 'details').length > 0 ? initNative(root) : initCustom(root);
});
