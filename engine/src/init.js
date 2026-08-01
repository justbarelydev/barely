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
	initialized = true;

	initMutation(Registry);
	initIntersection(Registry);
}
