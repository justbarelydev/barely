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

/** Register a data-sync subscriber */
export const registerSync = (subscriber, sourceSelector) => {
	const source = document.querySelector(sourceSelector);
	if (!source) {
		console.warn(`barely: data-sync target "${sourceSelector}" not found`);
		return;
	}

	const subs = Subscribers.get(source) || [];
	subs.push(subscriber);
	Subscribers.set(source, subs);
};

/** Calls registerSync on [data-sync] elements (used by the MO) */
export const bindSyncElement = (el) => {
	const syncAttr = getAttr(el, 'data-sync');
	if (syncAttr) registerSync(el, syncAttr);
};

/** Mirror attributes and CSS vars to [data-sync] subscribers */
export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach((sub) => {
		sub.setAttribute(key, value);
		sub.style.setProperty(`--${key.replace(/^data-/, '')}`, value);
	});
};
