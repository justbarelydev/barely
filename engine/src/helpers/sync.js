/**
 * @justbarely/engine - sync coordination
 *
 * This one's neat. You can mirror watched attributes and refracted CSS vars
 * on any element by syncing to a registered component by simply adding
 * [data-sync="#selector"] to any element
 */

import { getAttr } from './attr';

/** WeakMap again because auto cleanup */
const Subscribers = new WeakMap();

/**
 * This bad boy was new to me: depth-first search for cycle detection
 *
 * Walks through data-sync subscribers and checks if the target is also
 * reachable from the subscriber
 *
 * Basically, if A syncs to B, and B syncs to A, we get a loop. This is here to
 * catch that.
 */
const hasCycle = (node, target, visited = new Set()) => {
	if (visited.has(node)) return false;
	visited.add(node);
	const subs = Subscribers.get(node) || [];
	return subs.some((sub) => sub === target || hasCycle(sub, target, visited));
};

/** Make sure the data-sync is good to go, otherwise throw a warning */
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

/** Calls registerSync on [data-sync] elements (used by the MO) */
export const bindSyncElement = (el) => {
	const syncAttr = getAttr(el, 'sync');
	if (syncAttr) registerSync(el, syncAttr);
};

/** Mirror attributes and CSS vars to [data-sync] subscribers */
export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach((sub) => {
		sub.setAttribute(key, value);
		sub.style.setProperty(`--${key}`, value);
	});
};
