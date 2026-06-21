/**
 * @justbarely/engine - MutationObserver
 *
 * Single global MO for all components:
 * 	- attributeFilter from all registered blueprint watch lists
 *  - attribute changes: run effects, refract, forwardSync
 *  - childList additions: init new elements, bind data-sync
 *  - childList removals: runCleanup on evicted elements
 *
 * Skips style mutations to avoid loops from refract
 * Scans for existing [data-sync] elements
 */

import { COMPONENT, SYNC } from './constants';
import { bindElement } from './helpers/sync';
import { componentName, setCssVar } from './helpers/attr';
import { initElement } from './init';
import { runCleanup } from './helpers/cleanup';
import { forwardSync } from './helpers/sync';

/** Helpers */

function buildWatchedAttrSet(Registry) {
	const set = new Set();
	Registry.forEach((bp) => bp.watch.forEach((a) => set.add(`data-${a}`)));
	return set;
}

function initComponent(node, Registry) {
	if (componentName(node) && Registry.has(componentName(node))) {
		initElement(node, Registry);
	}
}

function initComponentChildren(node, Registry) {
	node.querySelectorAll(COMPONENT).forEach((el) => initElement(el, Registry));
}

function bindSyncElement(el) {
	if (el.matches?.(SYNC)) bindElement(el);
}

function bindSyncChildren(node) {
	node.querySelectorAll(SYNC).forEach((el) => bindElement(el));
}

function handleAttrChange(mutation, Registry) {
	if (mutation.attributeName === 'style') return;

	const { target, attributeName, oldValue } = mutation;
	const newValue = target.getAttribute(attributeName);
	if (newValue === oldValue) return;

	const root = target.closest(COMPONENT);
	if (!root) return;

	const blueprint = Registry.get(componentName(root));
	if (!blueprint) return;

	const key = attributeName.replace('data-', '');
	if (!blueprint.watch.includes(key)) return;

	if (blueprint.refract?.includes(key)) setCssVar(root, key, newValue);
	if (blueprint.effects[key])
		blueprint.effects[key](root, newValue, oldValue);
	forwardSync(root, key, newValue);
}

/** Init */

export const initMutation = (Registry) => {
	const mo = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'childList') {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					initComponent(node, Registry);
					initComponentChildren(node, Registry);
					bindSyncElement(node);
					bindSyncChildren(node);
				});

				mutation.removedNodes.forEach((child) => {
					if (child.nodeType !== 1) return;
					runCleanup(child);
				});
			} else {
				handleAttrChange(mutation, Registry);
			}
		}
	});

	mo.observe(document.body, {
		attributes: true,
		childList: true,
		subtree: true,
		attributeOldValue: true,
		attributeFilter: [...buildWatchedAttrSet(Registry)],
	});

	/** MO only catches dynamically added elements — bind existing ones */
	document.querySelectorAll(SYNC).forEach((el) => bindElement(el));
};
