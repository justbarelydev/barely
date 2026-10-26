/**
 * @justbarely/engine - imperative descendant attribute watching
 *
 * watch() observes the root's own attrs. watchChild() observes named attrs on
 * the root's descendants (subtree: true), so a component can react to child
 * state. Nested components are skipped. attr may be a single name or an array.
 */

import { registerCleanup, getCleanupOwner } from './cleanup';
import { closestComponent } from './elements';

export const watchChild = (root, attr, cb) => {
	const attrs = Array.isArray(attr) ? attr : [attr];
	const mo = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			const target = mutation.target;
			// The root's own attr is watch()'s job, not this one
			if (target === root) continue;
			// Nested-component boundary: a child component's attrs are not ours
			const scope = closestComponent(target);
			if (scope && scope !== root) continue;
			cb(
				target,
				target.getAttribute(mutation.attributeName),
				mutation.oldValue,
			);
		}
	});
	mo.observe(root, {
		attributes: true,
		subtree: true,
		attributeFilter: attrs,
		attributeOldValue: true,
	});
	registerCleanup(getCleanupOwner() ?? root, () => mo.disconnect());
};
