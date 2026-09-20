/**
 * @justbarely/engine - engine initialization
 *
 * Kicks off MutationObserver and IntersectionObserver for all registered
 * components. Called once by Barely.init().
 */

import { Registry } from './registry';
import { initMutation } from './mutation';
import { initIntersection } from './intersection';

let initialized = false;

export function init() {
	if (initialized || Registry.size === 0) return;

	// SSR doesn't have document, so no-op until called again in a browser
	if (typeof document === 'undefined') return;

	// Wait for <body> so init happens as early as possible, before
	// DOMContentLoaded and any deferred scripts.
	if (!document.body) {
		const wait = new MutationObserver((_, mo) => {
			if (!document.body) return;
			mo.disconnect();
			init();
		});
		wait.observe(document.documentElement, { childList: true });
		return;
	}

	initialized = true;
	initMutation(Registry);
	initIntersection(Registry);
}
