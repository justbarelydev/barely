/**
 * @justbarely/engine - component registry
 *
 * Main registry for all component blueprints
 * Reconciler.register(name, opts) stores the blueprint
 * Reconciler.ignite() starts the observers and inits existing elements
 *
 * Blueprint shape:
 * 	{
 * 		watch: [],
 * 		refract: [],
 * 		lazy: false,
 * 		effects: {},
 * 		onMount: null
 * 	}
 *
 * register() returns { onEffect, onMount } for chaining
 * 	component.onMount((root) => {...})
 *
 * Effects are stored by attr key and called when that attr changes
 */

import { initMutation } from './mutation';
import { initIntersection } from './intersection';

export const Registry = new Map();
let initialized = false;

export const Reconciler = {
	register: (name, { watch = [], refract = [], lazy = false } = {}) => {
		const blueprint = {
			watch,
			refract,
			lazy,
			effects: {},
			onMount: null,
		};
		Registry.set(name, blueprint);

		return {
			onEffect: (attr, fn) => {
				blueprint.effects[attr] = fn;
			},
			onMount: (fn) => {
				blueprint.onMount = fn;
			},
		};
	},

	ignite() {
		if (initialized || Registry.size === 0) return;
		initialized = true;

		initMutation(Registry);
		initIntersection(Registry);
	},
};
