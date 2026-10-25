/**
 * @justbarely/engine - imperative descendant attribute watching
 *
 * watch() observes the root's own attrs. watchChild() observes a named attr on
 * the root's descendants (subtree: true), so a component can react to child
 * state. Nested components are skipped.
 */

import { registerCleanup, getCleanupOwner } from './cleanup';
import { closestComponent } from './elements';

export const watchChild = (root, attr, cb) => {
	const mo = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			const target = mutation.target;
			// The root's own attr is watch()'s job, not this one
			if (target === root) continue;
			// Nested-component boundary: a child component's attrs are not ours
			const scope = closestComponent(target);
			if (scope && scope !== root) continue;
			cb(target, target.getAttribute(attr), mutation.oldValue);
		}
	});
	mo.observe(root, {
		attributes: true,
		subtree: true,
		attributeFilter: [attr],
		attributeOldValue: true,
	});
	registerCleanup(getCleanupOwner() ?? root, () => mo.disconnect());
};
