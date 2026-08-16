/**
 * @justbarely/engine - sync coordination
 *
 * This one's pretty pretty pretty cool. If you want a random element to mirror
 * the watched attrs and refracted CSS vars of a [data-component], [data-watch],
 * or [data-refract] element, just add `data-sync` to any element, with the
 * target's CSS selector as the value.
 *
 * <span data-sync="#tabs"> will copy attrs and inline CSS vars to the span.
 *
 * This uses querySelector() so if you accidentally data-sync with a selector
 * that matches multiple elements, it only syncs with the first one it finds.
 */

// WeakMap so subscribers are garbage collected with their source element
const Subscribers = new WeakMap();

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
	Subscribers.get(source)?.forEach((sub) => {
		sub.setAttribute(key, value);
		sub.style.setProperty(`--${key.replace(/^data-/, '')}`, value);
	});
};
