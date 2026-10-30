/**
 * @justbarely/engine - sync coordination
 *
 * Mirror the watched attrs and refracted CSS vars of a [data-component] or
 * [data-refract] element onto any other element. Declaratively with
 * `data-sync`, trimmed with `data-sync-attrs`, or imperatively with `sync()`.
 *
 *   <span data-sync="#tabs"></span>
 *   <span data-sync="#tabs" data-sync-attrs="data-active data-open"></span>
 *
 *   sync(el, '#tabs')                    // mirror everything broadcast
 *   sync(el, '#tabs', ['data-active'])   // mirror only data-active
 *
 * This uses querySelector() so a selector matching multiple elements only
 * syncs with the first one it finds.
 */

import { getComponentName } from './elements';
import { Registry } from '../registry';
import { refractAttrs } from './refract';
import { watchAttrs } from './watch';
import { registerCleanup } from './cleanup';

// WeakMap so subscribers are garbage collected with their source element.
// Each entry is { el, attrs } - attrs is null for "sync everything" or an
// array for a whitelist.
const Subscribers = new WeakMap();

// Per-source observers for whitelisted attrs the source does not already
// broadcast (auto-watch). Deduped per source, torn down with the source.
const SyncMOs = new WeakMap();

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

// Add a subscriber to a source and mirror the current values immediately.
// Re-binding the same subscriber replaces its previous subscription.
const subscribe = (source, subscriber, attrs) => {
	const subs = (Subscribers.get(source) || []).filter(
		(s) => s.el !== subscriber,
	);
	subs.push({ el: subscriber, attrs });
	Subscribers.set(source, subs);

	for (const attr of attrs ?? syncableAttrs(source)) {
		const val = source.getAttribute(attr);
		if (val != null) syncTo(subscriber, attr, val);
	}
};

// Auto-watch whitelisted attrs the source does not already broadcast, so
// sync(el, selector, ['data-open']) forwards data-open even when the source
// never watches it. A dedicated observer per source keeps this file free of a
// mutation.js import (mutation.js imports us for forwardSync).
const ensureObserved = (source, attrs) => {
	const watched = new Set(syncableAttrs(source));
	const missing = attrs.filter((a) => !watched.has(a));
	if (!missing.length) return;

	let entry = SyncMOs.get(source);
	if (!entry) {
		entry = { mo: null, attrs: new Set() };
		SyncMOs.set(source, entry);
		registerCleanup(source, () => entry.mo?.disconnect());
	}
	missing.forEach((a) => entry.attrs.add(a));

	entry.mo?.disconnect();
	entry.mo = new MutationObserver((mutations) => {
		for (const m of mutations) {
			const value = source.getAttribute(m.attributeName);
			if (value === m.oldValue) continue;
			// Only subscribers that whitelisted this attr - auto-watching
			// must not expand the source's broadcast to unfiltered
			// (data-sync) subscribers.
			Subscribers.get(source)?.forEach(({ el, attrs }) => {
				if (attrs?.includes(m.attributeName))
					syncTo(el, m.attributeName, value);
			});
		}
	});
	entry.mo.observe(source, {
		attributes: true,
		attributeFilter: [...entry.attrs],
		attributeOldValue: true,
	});
};

/**
 * Subscribe an element to mirror a source's attrs and CSS vars, optionally
 * limited to a whitelist. The imperative twin of `data-sync`.
 *
 * @param {Element} subscriber
 * @param {string} sourceSelector
 * @param {string[]} [attrs] - only these attributes are mirrored
 */
export const sync = (subscriber, sourceSelector, attrs) => {
	const source = document.querySelector(sourceSelector);
	if (!source) {
		console.warn(`barely: data-sync target "${sourceSelector}" not found`);
		return;
	}
	if (attrs?.length) ensureObserved(source, attrs);
	subscribe(source, subscriber, attrs);
};

// Low-level name kept for existing callers; same subscription as sync().
export const registerSync = sync;

/**
 * Bind an element with [data-sync] (and optional [data-sync-attrs]) to its
 * source (called by the MO).
 *
 * @param {Element} el
 */
export const bindSyncElement = (el) => {
	const syncAttr = el.dataset.sync;
	if (!syncAttr) return;
	const attrs = (el.dataset.syncAttrs ?? '').split(/\s+/).filter(Boolean);
	registerSync(el, syncAttr, attrs.length ? attrs : null);
};

/**
 * Push an attribute change to every subscriber: the attr plus its CSS var.
 *
 * @param {Element} source
 * @param {string} key
 * @param {string} value
 */
export const forwardSync = (source, key, value) => {
	Subscribers.get(source)?.forEach(({ el, attrs }) => {
		if (attrs && !attrs.includes(key)) return;
		syncTo(el, key, value);
	});
};
