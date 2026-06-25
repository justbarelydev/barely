/**
 * @justbarely/engine - data-sync coordination
 *
 * registerSync(subscriber, sourceSelector) - link a subscriber to a source
 * forwardSync(source, key, value) - broadcast to all subscribers
 *
 * Subscribers get both dataset[key] and --${key} CSS vars
 * Cycle detection (DFS) - warns for cicular chains
 */

import { getAttr } from './attr';

const Subscribers = new WeakMap();

/**
 * Depth-first search for cycle detection - walk through subscribers, warn if the
 * target is reachable from the subscriber
 */
const hasCycle = (node, target, visited = new Set()) => {
	if (visited.has(node)) return false;
	visited.add(node);
	const subs = Subscribers.get(node) || [];
	return subs.some((sub) => sub === target || hasCycle(sub, target, visited));
};

export const registerSync = (subscriber, sourceSelector) => {
	const source = document.querySelector(sourceSelector);
	if (!source) {
		console.warn(`barely: data-sync target "${sourceSelector}" not found`);
		return;
	}

	if (hasCycle(subscriber, source)) {
		console.warn(
			'barely: circular data-sync detected',
			subscriber,
			'-> ... ->',
			source,
		);
		return;
	}

	const subs = Subscribers.get(source) || [];
	subs.push(subscriber);
	Subscribers.set(source, subs);
};

/**
 * Wire up a data-sync element from the DOM — called by mutation.js
 * Extracts the source selector from data-sync and registers the link
 */
export const bindSyncSyncElement = (el) => {
	const syncAttr = getAttr(el, 'sync');
	if (syncAttr) registerSync(el, syncAttr);
};

export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach((sub) => {
		sub.dataset[key] = value;
		sub.style.setProperty(`--${key}`, value);
	});
};
