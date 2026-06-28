/**
 * @justbarely/engine - MutationObserver
 *
 * One global MO for childList (dynamically added/removed elements)
 * Per-component MOs for attribute changes (scoped to each component root)
 *
 * Each component MO uses attributeFilter to only update when reported attributes
 * change which is performant and cool
 */

import { COMPONENT, SYNC } from './constants';
import { bindSyncElement, forwardSync } from './helpers/sync';
import { getComponentName, setCssVar } from './helpers/attr';
import { children } from './helpers/children';
import { initElement } from './init';
import { runCleanup } from './helpers/cleanup';

/**
 * Per-component attribute observers — WeakMap for automatic cleanup if the
 * component element is removed from the DOM
 */
const AttrObservers = new WeakMap();

/** Helpers */

/**
 * Factory for component attribute MOs. Each one observes a single component root
 * and filters so it only watches that component's watched atts
 *
 * Skips style attributes to avoid loops from refract
 */
function createAttrObserver(blueprint) {
	return new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.attributeName === 'style') continue;

			const { target, attributeName, oldValue } = mutation;
			const newValue = target.getAttribute(attributeName);
			if (newValue === oldValue) continue;

			/** target is the component root — observed directly */
			if (blueprint.refract?.includes(attributeName))
				setCssVar(target, attributeName, newValue);
			if (blueprint.effects[attributeName])
				blueprint.effects[attributeName](target, newValue, oldValue);
			forwardSync(target, attributeName, newValue);
		}
	});
}

/** Creates and starts MO per component and stores it in a weakmap for auto GC */
export const attachAttrMO = (el, blueprint) => {
	const mo = createAttrObserver(blueprint);
	mo.observe(el, {
		attributes: true,
		attributeFilter: [...blueprint.watch],
		attributeOldValue: true,
	});
	AttrObservers.set(el, mo);
};

/** Tears down all a component's MOs and handles nested components with children() */
function disconnectAttrMO(root) {
	if (root.matches?.(COMPONENT)) {
		const mo = AttrObservers.get(root);
		if (mo) {
			mo.disconnect();
			AttrObservers.delete(root);
		}
	}

	children(root, COMPONENT).forEach((el) => {
		const mo = AttrObservers.get(el);
		if (mo) {
			mo.disconnect();
			AttrObservers.delete(el);
		}
	});
}

/** Init and attach MO to dynamically added registered components */
function initComponent(node, Registry) {
	const name = getComponentName(node);
	if (name && Registry.has(name)) {
		const blueprint = Registry.get(name);
		initElement(node, Registry);
		attachAttrMO(node, blueprint);
	}
}

/** Init and slap MO on dynamically added components' children */
function initComponentChildren(node, Registry) {
	children(node, COMPONENT).forEach((el) => initComponent(el, Registry));
}

/** Bind dynamically added [data-sync] elements */
function tryBindSync(el) {
	if (el.matches?.(SYNC)) bindSyncElement(el);
}

/** Bind dynamically added [data-sync] children */
function bindSyncChildren(node) {
	children(node, SYNC).forEach((el) => bindSyncElement(el));
}

/**
 * This MO watches for HTML being added or removed (childList only)
 * Attribute changes are handled per-component (thanks attachAttrMO())
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
			});

			mutation.removedNodes.forEach((child) => {
				if (child.nodeType !== 1) return;
				runCleanup(child);
				disconnectAttrMO(child);
			});
		}
	});

	mo.observe(document.body, {
		childList: true,
		subtree: true,
	});

	/** MO only catches dynamically added elements — bind existing ones */
	children(document, SYNC).forEach((el) => bindSyncElement(el));
};
