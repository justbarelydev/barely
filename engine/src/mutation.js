/**
 * @justbarely/engine - MutationObserver
 *
 * Since we are using MO for state updates, we need to be efficient about it:
 * - Per-component MOs for attribute changes (scoped to each component root)
 * - One global MO for childList (dynamically added/removed elements)
 *
 * Each component MO uses attributeFilter to update only when the reported
 * attributes change, which is performant and cool.
 */

import { COMPONENT, SYNC } from './constants';
import { bindSyncElement, forwardSync } from './helpers/sync';
import { getComponentName, els } from './helpers/elements';
import { initElement, refractValue } from './registry';
import { setAttrVar } from './helpers/attr';
import { runCleanup } from './helpers/cleanup';
import { emit } from './helpers/emit';
import { observe } from './helpers/observe';
import { watchCallbacks, watchAttrs } from './helpers/watch';
import { refractTransform, refractAttrs } from './helpers/refract';

// Per-element, per-attribute counter - catches runaway write loops
const RUNAWAY_LIMIT = 25;
const _counts = new WeakMap();

/**
 * Catch infinite loops in onChange - 25 writes to the same attr in one frame
 * and we bail and log the culprit.
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
			`barely: runaway update on [${attr}] - stopping. ` +
				`Check onChange for infinite loops.`,
			el,
		);
	}

	return entry.count >= RUNAWAY_LIMIT;
};

// Per-component attribute observers, keyed by element for auto garbage collection
const AttrObservers = new WeakMap();

/**
 * This factory pumps out per-component MOs that only watch the attrs that the
 * component cares about.
 */
function createAttrObserver(blueprint) {
	return new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			// Refract writes to style, so block style mutations or this loops forever
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

			// Refract data-attr values to CSS vars (onRefract)
			if (
				blueprint.refract?.includes(attributeName) ||
				target._barelyRefract?.includes(attributeName)
			) {
				setAttrVar(
					target,
					attributeName,
					blueprint.refract?.includes(attributeName)
						? refractValue(blueprint, attributeName, newValue)
						: newValue,
				);
			}

			// refract - mirrors registration refract but scoped
			const transform = refractTransform(target, attributeName);
			if (transform)
				setAttrVar(target, attributeName, transform(newValue));

			if (blueprint.changes[attributeName])
				blueprint.changes[attributeName].forEach((fn) =>
					fn(target, newValue, oldValue),
				);
			watchCallbacks(target, attributeName)?.forEach((fn) =>
				fn(target, newValue, oldValue),
			);
			forwardSync(target, attributeName, newValue);
		}
	});
}

/**
 * Attach a per-component attribute MO that only watches what this blueprint
 * (or any data-refract element) cares about.
 *
 * @param {Element} el
 * @param {object} blueprint
 */
export const attachAttrMO = (el, blueprint) => {
	// Non-component data-refract - space-separated literal attribute names
	const instanceRefract = el.dataset.refract?.split(/\s+/) ?? [];

	// Store element refract so the MO callback can check it
	if (instanceRefract.length) el._barelyRefract = instanceRefract;

	// Merge blueprint, instance, and imperative attrs for the MO filter
	const allWatch = [
		...new Set([
			...blueprint.watch,
			...instanceRefract,
			...watchAttrs(el),
			...refractAttrs(el),
		]),
	];

	// Nothing to observe - skip the observer entirely
	if (!allWatch.length) return;

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

		// Clean up runaway counters too - GC handles the rest
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
export function initComponent(node, Registry) {
	const name = getComponentName(node);
	if (!name || !Registry.has(name)) return;

	const blueprint = Registry.get(name);

	// defer init for data-lazy until the element scrolls into view
	if (node.hasAttribute('data-lazy')) {
		observe(
			node,
			(entry) => {
				if (!entry.isIntersecting) return;
				const bp = Registry.get(getComponentName(entry.target));
				if (!bp) return;
				initElement(entry.target);
				attachAttrMO(entry.target, bp);
			},
			{ once: true },
		);
		return;
	}

	// Init, then watch - same order as intersection.js
	initElement(node);
	attachAttrMO(node, blueprint);
}

// Init and slap MO on dynamically added components' children
function initComponentChildren(node, Registry) {
	els(node, COMPONENT).forEach((el) => initComponent(el, Registry));
}

// Bind dynamically added [data-sync] elements
function tryBindSync(el) {
	if (el.matches?.(SYNC)) bindSyncElement(el);
}

// Bind dynamically added [data-sync] children
function bindSyncChildren(node) {
	els(node, SYNC).forEach((el) => bindSyncElement(el));
}

// Write CSS vars + forward sync for an element's data-refract attrs
const applyRefract = (el) => {
	const refractAttrs = el.dataset.refract?.split(/\s+/) ?? [];
	for (const attr of refractAttrs) {
		const val = el.getAttribute(attr);
		if (val != null) {
			setAttrVar(el, attr, val);
			forwardSync(el, attr, val);
		}
	}
};

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
				// Attach MO to ad-hoc data-refract on non-components and apply
				// the initial vars so they refract on mount, not just on change
				if (
					node.dataset.refract &&
					!node.hasAttribute('data-component')
				) {
					attachAttrMO(node, { watch: [], refract: [], changes: {} });
					applyRefract(node);
					node.setAttribute('data-ready', '');
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

	// MO only catches dynamically added elements - bind existing ones
	els(document, SYNC).forEach((el) => bindSyncElement(el));

	// Bind existing ad-hoc [data-refract] on non-components
	els(document, '[data-refract]').forEach((el) => {
		if (!el.hasAttribute('data-component')) {
			attachAttrMO(el, { watch: [], refract: [], changes: {} });
			applyRefract(el);
			el.setAttribute('data-ready', '');
		}
	});

	// Catch dynamically added data-refract / data-sync / data-sync-attrs attrs
	const attrMo = new MutationObserver((mutations) => {
		for (const { target, attributeName } of mutations) {
			if (
				attributeName === 'data-sync' ||
				attributeName === 'data-sync-attrs'
			) {
				bindSyncElement(target);
			} else if (!target.hasAttribute('data-component')) {
				attachAttrMO(target, { watch: [], refract: [], changes: {} });
				applyRefract(target);
				target.setAttribute('data-ready', '');
			}
		}
	});
	attrMo.observe(document.body, {
		attributes: true,
		subtree: true,
		attributeFilter: ['data-refract', 'data-sync', 'data-sync-attrs'],
	});
};
