/**
 * @justbarely/engine - component registration and engine initialization
 *
 * init() and register() share the Registry so they're both defined here
 */

import { initMutation } from './mutation';
import { initIntersection } from './intersection';

/** Keeper of the keys for all components */
export const Registry = new Map();

/**
 * Register components to hook them into the engine and to get those
 * sweet sweet lifecycle methods
 *
 * onMount: fires immediately or when scrolled into view if lazy:true
 * onEffect: fires on watched attribute changes
 * refract: copies attribute values to inline CSS variables
 */
export function register(
	name,
	{ watch = [], refract = [], lazy = false } = {},
) {
	const blueprint = { watch, refract, lazy, effects: {}, onMount: null };
	Registry.set(name, blueprint);

	return {
		onEffect: (attr, fn) => {
			blueprint.effects[attr] = fn;
		},
		onMount: (fn) => {
			blueprint.onMount = fn;
		},
	};
}

/** Initialize MO and IO for registered components */
let initialized = false;
export function init() {
	if (initialized || Registry.size === 0) return;
	initialized = true;

	initMutation(Registry);
	initIntersection(Registry);
}
