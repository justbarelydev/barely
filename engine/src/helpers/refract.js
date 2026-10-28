/**
 * @justbarely/engine - imperative attribute refraction
 *
 * Runtime twin of register()'s refract + onRefract. Mirrors a data-* attr
 * to a CSS var with an optional transform, callable from onMount. Cleanup keyed
 * on the element, like listen().
 */

import { registerCleanup, getCleanupOwner } from './cleanup';
import { setAttrVar } from './attr';

// el -> Map(attr -> fn) - auto GC'd with the element
const Refracts = new WeakMap();

export const refract = (el, attr, transform) => {
	const fn = transform ?? ((v) => v);

	let map = Refracts.get(el);
	if (!map) Refracts.set(el, (map = new Map()));
	map.set(attr, fn);

	registerCleanup(getCleanupOwner() ?? el, () => map.delete(attr));

	// Apply the current value immediately
	const val = el.getAttribute(attr);
	if (val != null) setAttrVar(el, attr, fn(val));
};

// Internal accessors for the mutation observer (not part of the public API)
export const refractTransform = (el, attr) => Refracts.get(el)?.get(attr);
export const refractAttrs = (el) => [...(Refracts.get(el)?.keys() ?? [])];
