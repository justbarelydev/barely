/**
 * @justbarely/engine - event listeners
 *
 * You can always use addEventListener, but this is more convenient.
 */

import { registerCleanup } from './cleanup';

/**
 * Handy little addEventListener replacement with auto-cleanup and optional
 * selector delegation.
 *
 *   listen(el, 'click', fn): direct on el
 *   listen(el, ['mouseenter', 'focus'], fn): multiple events
 *   listen(root, 'click', fn, '[data-nav]'): delegated, scoped to root
 *
 * - Attaches directly to the root, so it's garbage collected with it
 * - Returns an off() function for manual cleanup
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
				if (root.getAttribute) {
					const owner = target.closest('[data-component]');
					if (owner && owner !== root) return;
				}

				handler(e, target, root);
			}
		: (e) => handler(e, root);

	root.addEventListener(event, _handler);

	const cleanup = () => root.removeEventListener(event, _handler);
	registerCleanup(root, cleanup);
	return cleanup;
};
