/**
 * @justbarely/components - Accordion
 *
 * Native: <details>/<summary>
 * Add the same [name] attr to every <details> element for exclusive.
 * The browser does everything for you here, Barely just emits an event.
 *
 *	<div data-component="accordion">
 *		<details open>
 *			<summary>Section 1</summary>
 *			<p>Content 1</p>
 *		</details>
 *	</div>
 *
 * Custom: [data-trigger]/[data-target] for when <details> won't work.
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
 *   [hidden]    - panel is fully closed (set after the close animation ends)
 *
 * Animation-capable, not animated: the component measures --panel-height and
 * toggles state; CSS supplies the transition. For height animation add:
 *   [data-component='accordion'][data-ready] [data-target] {
 *       transition: height 0.3s ease;
 *   }
 *
 * Config attrs:
 *   data-mode - "exclusive" (one open at a time) | "horizontal" (side-by-side)
 *
 * Events:
 *   barely:accordionchange -> { open: number[], keys: string[] }
 */

import {
	Barely,
	listen,
	emit,
	children,
	hasMode,
	setAttrs,
	measureHeight,
	waitForAnimation,
	resize,
} from '@justbarely/engine';

// Measure available width for horizontal - container minus triggers
const measurePanelWidth = (root) => {
	const triggers = children(root, '[data-trigger]');
	const used = triggers.reduce((sum, t) => sum + t.offsetWidth, 0);
	return root.clientWidth - used;
};

// Register
const Accordion = Barely.register('accordion');

// ARIA
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
		}),
	);
};

// State
const emitState = (root) => {
	const all = children(root, '[data-target]');
	const open = all.filter((el) => el.hasAttribute('data-open'));
	emit(root, 'barely:accordionchange', {
		open: open.map((el) => all.indexOf(el)),
		keys: open.map((el) => el.dataset?.target || ''),
	});
};

// Toggle a single panel and measure --panel-height so CSS can animate.
const setOpen = (root, panel, trigger, open) => {
	if (open) {
		panel.removeAttribute('hidden');
		if (!hasMode(root, 'horizontal'))
			measureHeight(panel, '--panel-height');
		panel.setAttribute('data-open', '');
		if (trigger) trigger.setAttribute('data-open', '');
	} else {
		panel.removeAttribute('data-open');
		if (trigger) trigger.removeAttribute('data-open');
		waitForAnimation(panel, () => {
			if (!panel.hasAttribute('data-open'))
				panel.setAttribute('hidden', '');
		});
	}
};

// Build a lookup of key { panel, trigger } used by click/key handlers
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

	if (hasMode(root, 'exclusive') && opening) {
		panels.forEach((e) => {
			if (e !== entry && e.panel.hasAttribute('data-open'))
				setOpen(root, e.panel, e.trigger, false);
		});
	}

	setOpen(root, panel, trigger, opening);
	syncAria(root);
	emitState(root);
};

// Event handlers
const onTriggerClick = (e, trigger, root) =>
	toggle(root, trigger.dataset.trigger);

const onTriggerKeydown = (e, trigger, root) => {
	if (e.key === 'Enter' || e.key === ' ') {
		e.preventDefault();
		toggle(root, trigger.dataset.trigger);
	}
};

// Custom: [data-trigger]/[data-target]
const initCustom = (root) => {
	// Auto-add [hidden] to closed panels
	children(root, '[data-target]').forEach((panel) => {
		if (!panel.hasAttribute('data-open') && !panel.hasAttribute('hidden'))
			panel.setAttribute('hidden', '');
	});

	if (hasMode(root, 'horizontal')) {
		const setWidth = () =>
			root.style.setProperty(
				'--panel-width',
				measurePanelWidth(root) + 'px',
			);
		setWidth();
		resize(root, setWidth);
	}

	if (!hasMode(root, 'horizontal'))
		children(root, '[data-target][data-open]').forEach((panel) =>
			panel.style.setProperty(
				'--panel-height',
				panel.scrollHeight + 'px',
			),
		);

	syncAria(root);

	listen(root, 'click', onTriggerClick, '[data-trigger]');
	listen(root, 'keydown', onTriggerKeydown, '[data-trigger]');
};

// Native: <details>/<summary> - browser handles toggle, name attr for exclusive
const initNative = (root) => {
	const items = children(root, 'details');

	const measurePanel = (detail) => {
		const panel = detail.querySelector(':scope > :not(summary)');
		if (panel)
			detail.style.setProperty(
				'--panel-height',
				panel.scrollHeight + 'px',
			);
	};

	if (hasMode(root, 'horizontal')) {
		const setWidth = () =>
			root.style.setProperty(
				'--panel-width',
				measurePanelWidth(root) + 'px',
			);
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
			emit(root, 'barely:accordionchange', {
				open: open.map((el) => items.indexOf(el)),
				keys: open.map(
					(el) => el.querySelector('summary')?.textContent || '',
				),
			});
		},
		true,
	);
};

// Mount
Accordion.onMount((root) => {
	children(root, 'details').length > 0 ? initNative(root) : initCustom(root);
});
