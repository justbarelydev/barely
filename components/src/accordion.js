/**
 * @justbarely/components - Accordion
 *
 * Two different implementations to choose from depending on your needs:
 *
 * Native - <details>/<summary>
 * The browser does everything for you here, Barely just emits an event.
 * Add the same [name] attr to every <details> element for exclusive.
 *
 *	<div data-component="accordion">
 *		<details open>
 *			<summary>Section 1</summary>
 *			<p>Content 1</p>
 *		</details>
 *	</div>
 *
 * Custom - [data-trigger]/[data-target]
 * Barely controls toggle, keyboard, and ARIA.
 *
 *	<div data-component="accordion" data-mode="exclusive">
 *		<button data-trigger="a1" data-open>Section 1</button>
 *		<div data-target="a1" data-open>Content 1</div>
 *		<button data-trigger="a2">Section 2</button>
 *		<div data-target="a2">Content 2</div>
 *	</div>
 *
 * State (set automatically - CSS or WAAPI can hook into them):
 *   [data-open] - panel is open (set on trigger + panel)
 *
 * CSS-driven animation. Since we can't animate from display:none (yet), we use
 * height: 0 + overflow:hidden + visibility:hidden for closed panels and proper
 * a11y. On open the height is measured and added as a CSS var that you can use
 * to animate to.
 *
 * Horizontal mode uses flex layout and --panel-width (container - triggers) to
 * size the panels. It relies on height: auto and the panel width to ensure text
 * wrapping doesn't leak into the animation.
 *
 * Config attrs:
 *   data-mode - "exclusive" (one open at a time,) | "horizontal" (side-by-side)
 *     - note: data-mode=exclusive is only needed for the custom implementation,
 *       native <details> handles it automatically with the [name] attr
 *
 * Events:
 *   barely:beforechange -> { key, opening }              (custom toggle)
 *   barely:afterchange  -> { open: number[], keys: string[] }
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

// Measure available width for horizontal - container minus triggers
const measurePanelWidth = (root) => {
	const triggers = children(root, '[data-trigger]');
	const used = triggers.reduce((sum, t) => sum + t.offsetWidth, 0);
	return root.clientWidth - used;
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

const emitState = (root) => {
	const all = children(root, '[data-target]');
	const open = all.filter((el) => el.hasAttribute('data-open'));
	emit(root, 'barely:afterchange', {
		open: open.map((el) => all.indexOf(el)),
		keys: open.map((el) => el.dataset?.target || ''),
	});
};

// Set a panel open or closed and mirror data-open on the trigger. Opening
// measures --height first (horizontal measure from the container).
const setPanelOpen = (root, panel, trigger, open) => {
	if (open) {
		if (!hasMode(root, 'horizontal')) setSize(panel);
		setAttrs(panel, { 'data-open': true });
		if (trigger) setAttrs(trigger, { 'data-open': true });
	} else {
		setAttrs(panel, { 'data-open': false });
		if (trigger) setAttrs(trigger, { 'data-open': false });
	}
};

// Build a map of `key: { panel, trigger }` for easy lookup with click/key handlers
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
	const opening = !panel.hasAttribute('data-open');

	emit(root, 'barely:beforechange', { key, opening });

	if (hasMode(root, 'exclusive') && opening) {
		panels.forEach((e) => {
			if (e !== entry && e.panel.hasAttribute('data-open'))
				setPanelOpen(root, e.panel, e.trigger, false);
		});
	}

	setPanelOpen(root, panel, trigger, opening);
	syncAria(root);
	emitState(root);
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
		const setWidth = () =>
			setCssVar(root, 'panel-width', measurePanelWidth(root), 'px');
		setWidth();
		resize(root, setWidth);
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

// Native: <details>/<summary> - browser handles toggle, name attr for exclusive
const initNative = (root) => {
	const items = children(root, 'details');

	const measurePanel = (detail) =>
		setSize(detail, 'height', ':scope > :not(summary)');

	if (hasMode(root, 'horizontal')) {
		const setWidth = () =>
			setCssVar(root, 'panel-width', measurePanelWidth(root), 'px');
		setWidth();
		resize(root, setWidth);
	}

	// Initially open
	children(root, 'details[open]').forEach(measurePanel);

	root.addEventListener(
		'toggle',
		(e) => {
			const detail = e.target;
			if (detail.tagName !== 'DETAILS') return;
			if (detail.open) measurePanel(detail);

			const open = children(root, 'details[open]');
			emit(root, 'barely:afterchange', {
				open: open.map((el) => items.indexOf(el)),
				keys: open.map(
					(el) => el.querySelector('summary')?.textContent || '',
				),
			});
		},
		true,
	);
};

Accordion.onMount((root) => {
	children(root, 'details').length > 0 ? initNative(root) : initCustom(root);
});
