/**
 * @justbarely/engine - MutationObserver
 *
 * Since we are using MO for the "state updates", we need to be efficient about it:
 *
 * - One global MO for childList (dynamically added/removed elements)
 * - Per-component MOs for attribute changes (scoped to each component root)
 *
 * Each component MO uses attributeFilter to only update when the reported
 * attributes change, which is performant and cool.
 */

import { COMPONENT, SYNC } from './constants';
import { bindSyncElement, forwardSync } from './helpers/sync';
import { getComponentName, setCssVar } from './helpers/attr';
import { children } from './helpers/children';
import { initElement } from './init';
import { runCleanup } from './helpers/cleanup';
import { emit } from './helpers/emit';

// Per-element, per-attribute write counter — catches runaway loops
const RUNAWAY_LIMIT = 25;
const _counts = new WeakMap();

/**
 * Catch infinite loops in onEffect - 25 writes to the same attr in one frame
 * (~16ms) and we eject and log the culprit.
 */
const isRunaway = (el, attr) => {
	const bucket = (performance.now() / 16) | 0;
	let counts = _counts.get(el);
	if (!counts) _counts.set(el, (counts = new Map()));

	const entry = counts.get(attr);
	if (!entry || entry.bucket !== bucket) {
		counts.set(attr, { bucket, count: 1 });
		return false;
	}

	if (++entry.count === RUNAWAY_LIMIT) {
		console.error(
			`barely: runaway update on [${attr}] — halting. ` +
				`Check onEffect for infinite loops.`,
			el,
		);
	}

	return entry.count >= RUNAWAY_LIMIT;
};

/**
 * Per-component attribute observers — WeakMap for automatic cleanup if the
 * component element is removed from the DOM
 */
const AttrObservers = new WeakMap();

/**
 * This factory pumps out per-component MOs that only watch the attrs that this
 * component cares about.
 */
function createAttrObserver(blueprint) {
	return new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			/** Playing defense: refract writes to el.style.setProperty, which
			 *  mutates the `style` attribute. If someone puts `style` in
			 *  watch or refract, this prevents the infinite loop. */
			if (mutation.attributeName === 'style') {
				console.warn(
					'Ignoring mutations to the [style] attr to prevent infinite loops',
				);
				continue;
			}

			const { target, attributeName, oldValue } = mutation;
			const newValue = target.getAttribute(attributeName);
			if (newValue === oldValue) continue;
			if (isRunaway(target, attributeName)) continue;

			// target is the component root — observed directly
			if (
				blueprint.refract?.includes(attributeName) ||
				target._barelyRefract?.includes(attributeName)
			)
				setCssVar(target, attributeName, newValue);
			if (blueprint.effects[attributeName])
				blueprint.effects[attributeName](target, newValue, oldValue);
			forwardSync(target, attributeName, newValue);

			// Emit event for non-component data-watch attrs
			if (target._barelyWatch?.includes(attributeName))
				emit(target, 'barely:attrchange', {
					name: attributeName,
					value: newValue,
					oldValue,
				});
		}
	});
}

// Creates and starts MO per component and stores it in a weakmap for auto GC
export const attachAttrMO = (el, blueprint) => {
	// Non-component watch/refract — space-separated literal attribute names
	const instanceWatch = el.dataset.watch?.split(/\s+/) ?? [];
	const instanceRefract = el.dataset.refract?.split(/\s+/) ?? [];

	// Store element refract so the MO callback can check it
	if (instanceRefract.length) el._barelyRefract = instanceRefract;
	// Store element watch so the MO callback can emit events
	if (instanceWatch.length) el._barelyWatch = instanceWatch;

	// Merge blueprint and element attrs for the MO filter
	const allWatch = [
		...new Set([...blueprint.watch, ...instanceWatch, ...instanceRefract]),
	];

	const mo = createAttrObserver(blueprint);
	mo.observe(el, {
		attributes: true,
		attributeFilter: allWatch,
		attributeOldValue: true,
	});
	AttrObservers.set(el, mo);
};

/**
 * Walk the entire removed subtree and run cleanup + disconnect MOs.
 * MutationRecord.removedNodes is top-level only (descendants aren't listed),
 * so we crawl every element to catch and cleanup nested components.
 */
function teardownTree(root) {
	const all = [root, ...(root.querySelectorAll?.('*') ?? [])];
	for (const el of all) {
		runCleanup(el);
		// Clean up runaway counters too — GC handles the rest
		_counts.delete(el);
		if (el.matches?.(COMPONENT)) {
			emit(el, 'barely:unmount', { name: getComponentName(el) });
			const mo = AttrObservers.get(el);
			if (mo) {
				mo.disconnect();
				AttrObservers.delete(el);
			}
		}
	}
}

// Init and attach MO to dynamically added registered components
function initComponent(node, Registry) {
	const name = getComponentName(node);
	if (name && Registry.has(name)) {
		const blueprint = Registry.get(name);
		attachAttrMO(node, blueprint);
		initElement(node, Registry);
	}
}

// Init and slap MO on dynamically added components' children
function initComponentChildren(node, Registry) {
	children(node, COMPONENT).forEach((el) => initComponent(el, Registry));
}

// Bind dynamically added [data-sync] elements
function tryBindSync(el) {
	if (el.matches?.(SYNC)) bindSyncElement(el);
}

// Bind dynamically added [data-sync] children
function bindSyncChildren(node) {
	children(node, SYNC).forEach((el) => bindSyncElement(el));
}

/**
 * This MO watches for HTML being added or removed (childList only)
 * Attribute changes are handled per-component (thanks, attachAttrMO()!)
 * It also catches any existing [data-sync] elements the MO would miss
 */
export const initMutation = (Registry) => {
	const mo = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== 'childList') continue;

			mutation.addedNodes.forEach((node) => {
				if (node.nodeType !== 1) return;
				initComponent(node, Registry);
				initComponentChildren(node, Registry);
				tryBindSync(node);
				bindSyncChildren(node);
				// Attach MO to ad-hoc data-watch/refract on non-components
				if (
					(node.dataset.watch || node.dataset.refract) &&
					!node.hasAttribute('data-component')
				) {
					attachAttrMO(node, { watch: [], refract: [], effects: {} });
				}
			});

			mutation.removedNodes.forEach((child) => {
				if (child.nodeType !== 1) return;
				teardownTree(child);
			});
		}
	});

	mo.observe(document.body, {
		childList: true,
		subtree: true,
	});

	// MO only catches dynamically added elements — bind existing ones
	children(document, SYNC).forEach((el) => bindSyncElement(el));

	// Bind existing ad-hoc [data-watch] / [data-refract] on non-components
	children(document, '[data-watch], [data-refract]').forEach((el) => {
		if (!el.hasAttribute('data-component')) {
			attachAttrMO(el, { watch: [], refract: [], effects: {} });
			// Set initial CSS vars + forward sync for refracted attrs
			const refract = el.dataset.refract?.split(/\s+/) ?? [];
			refract.forEach((attr) => {
				const val = el.getAttribute(attr);
				if (val != null) {
					setCssVar(el, attr, val);
					forwardSync(el, attr, val);
				}
			});
			el.setAttribute('data-ready', '');
		}
	});

	// Catch dynamically added data-watch / data-refract / data-sync attrs
	const attrMo = new MutationObserver((mutations) => {
		for (const { target, attributeName } of mutations) {
			if (attributeName === 'data-sync') {
				bindSyncElement(target);
			} else if (!target.hasAttribute('data-component')) {
				attachAttrMO(target, { watch: [], refract: [], effects: {} });
				const refract = target.dataset.refract?.split(/\s+/) ?? [];
				refract.forEach((attr) => {
					const val = target.getAttribute(attr);
					if (val != null) {
						setCssVar(target, attr, val);
						forwardSync(target, attr, val);
					}
				});
				target.setAttribute('data-ready', '');
			}
		}
	});
	attrMo.observe(document.body, {
		attributes: true,
		subtree: true,
		attributeFilter: ['data-watch', 'data-refract', 'data-sync'],
	});
};
