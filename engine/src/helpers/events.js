/**
 * @justbarely/engine - event listeners
 *
 * You can always use addEventListener, but this is more convenient.
 */

import { registerCleanup, getCleanupOwner } from './cleanup';

/**
 * Handy little addEventListener replacement that allows for multiple events,
 * has selector delegation, and cleanup you mostly don't have to think about.
 *
 *   listen(el, 'click', fn): direct on el
 *   listen(el, ['mouseenter', 'focus'], fn): multiple events
 *   listen(root, 'click', fn, '[data-nav]'): delegated, scoped to root
 *
 * Cleanup:
 * - In onMount, cleanup is owned by the component, so listeners are removed
 *   when it leaves the DOM (even document/window listeners).
 * - Elsewhere, a listener on a regular element is removed when that element
 *   leaves the DOM. A document/window listener is not, so keep the returned
 *   off() and call it when you're done.
 *
 * - Returns off() for manual cleanup
 * - Non-bubbling events (scroll, focus, mouseenter) fire only on root itself
 * - Nested component events are blocked from triggering outer component handlers
 */
export const listen = (root, event, handler, selector) => {
	if (!root) {
		console.warn('[barely] listen(): no root element provided for', event);
		return () => {};
	}

	// Allow array of events because addEventListener didn't and it should've
	if (Array.isArray(event)) {
		const offs = event.map((e) => listen(root, e, handler, selector));
		return () => offs.forEach((off) => off());
	}

	const _handler = selector
		? (e) => {
				const target = e.target.closest(selector);
				if (!target || !root.contains(target)) return;

				// Don't handle events from nested components (when root IS one)
				if (root.hasAttribute?.('data-component')) {
					const owner = target.closest('[data-component]');
					if (owner && owner !== root) return;
				}

				handler(e, target, root);
			}
		: (e) => handler(e, root);

	root.addEventListener(event, _handler);

	const cleanup = () => root.removeEventListener(event, _handler);

	// Register cleanup to the component currently mounting (if there is one) so
	// document/window listeners are removed when the component leaves the DOM.
	registerCleanup(getCleanupOwner() ?? root, cleanup);
	return cleanup;
};
