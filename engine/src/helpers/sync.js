/**
 * @justbarely/engine - sync coordination
 *
 * This one's pretty pretty pretty cool. If you want a random element to mirror
 * the watched attrs and refracted CSS vars of a [data-component] or
 * [data-refract] element, just add `data-sync` to any element, with the
 * target's CSS selector as the value.
 *
 * <span data-sync="#tabs"> will copy attrs and inline CSS vars to the span.
 *
 * This uses querySelector() so if you accidentally data-sync with a selector
 * that matches multiple elements, it only syncs with the first one it finds.
 */

import { getComponentName } from './elements';
import { Registry } from '../registry';
import { refractAttrs } from './refract';
import { watchAttrs } from './watch';

// WeakMap so subscribers are garbage collected with their source element
const Subscribers = new WeakMap();

// The attrs a source can sync to subscribers: blueprint watch (refract attrs
// are merged into watch at registration, so this covers both), data-refract on
// the element, and imperative watch()/refract().
const syncableAttrs = (el) => {
	const attrs = new Set(Registry.get(getComponentName(el))?.watch ?? []);
	(el.dataset.refract ?? '')
		.split(/\s+/)
		.filter(Boolean)
		.forEach((a) => attrs.add(a));
	refractAttrs(el).forEach((a) => attrs.add(a));
	watchAttrs(el).forEach((a) => attrs.add(a));
	return [...attrs];
};

// Copy one attr plus its CSS var to a subscriber
const syncTo = (sub, key, value) => {
	sub.setAttribute(key, value);
	sub.style.setProperty(`--${key.replace(/^data-/, '')}`, value);
};

/**
 * Subscribe an element to mirror another element's watched attrs and CSS vars.
 *
 * @param {Element} subscriber
 * @param {string} sourceSelector
 */
export const registerSync = (subscriber, sourceSelector) => {
	const source = document.querySelector(sourceSelector);
	if (!source) {
		console.warn(`barely: data-sync target "${sourceSelector}" not found`);
		return;
	}

	const subs = Subscribers.get(source) || [];
	subs.push(subscriber);
	Subscribers.set(source, subs);

	// Mirror the source's current values immediately, not just on change
	for (const attr of syncableAttrs(source)) {
		const val = source.getAttribute(attr);
		if (val != null) syncTo(subscriber, attr, val);
	}
};

/**
 * Bind an element with [data-sync] to its source (called by the MO).
 *
 * @param {Element} el
 */
export const bindSyncElement = (el) => {
	const syncAttr = el.dataset.sync;
	if (syncAttr) registerSync(el, syncAttr);
};

/**
 * Push an attribute change to every subscriber: the attr plus its CSS var.
 *
 * @param {Element} source
 * @param {string} key
 * @param {string} value
 */
export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach((sub) => syncTo(sub, key, value));
};
