/**
 * @justbarely/engine - sync coordination
 *
 * This one's pretty pretty pretty cool. If you want a random element to mirror
 * a [data-component]'s watched attrs and refracted CSS vars, just add
 * [data-sync] to any element with a CSS selector as the value.
 *
 * <span data-sync="#tabs"> will copy attrs and inline CSS vars to the span.
 *
 * This uses querySelector() so if you accidentally data-sync with a selector
 * that matches multiple components, it only syncs with the first one it finds.
 */

import { getAttr } from './attr';

/** WeakMap because the DOM handles cleanup */
const Subscribers = new WeakMap();

/** Subscribe an element to a component's state changes */
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

/** Bind all [data-sync] elements (called by the mutation observer) */
export const bindSyncElement = (el) => {
	const syncAttr = getAttr(el, 'data-sync');
	if (syncAttr) registerSync(el, syncAttr);
};

/** Push attribute changes to subscribers — attrs + CSS vars */
export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach((sub) => {
		sub.setAttribute(key, value);
		sub.style.setProperty(`--${key.replace(/^data-/, '')}`, value);
	});
};
