/**
 * @justbarely/engine - public API
 *
 * Barely.register(name, opts) - register a component blueprint
 * Barely.init() - ignite observers and scan DOM
 *
 * Component authors import helpers directly:
 * 	import { Barely, listen, emit, getAttr } from '@justbarely/engine'
 */

import { Reconciler } from './registry';

export const Barely = {
	register: Reconciler.register,
	init: Reconciler.ignite,
};

/** Helpers — component authors import these directly */
export * from './helpers/attr';
export * from './helpers/cleanup';
export * from './helpers/children';
export * from './helpers/emit';
export * from './helpers/sync';
export * from './helpers/events';
