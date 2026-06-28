/**
 * @justbarely/engine - public API
 */

import { register, init } from './registry';

/**
 * Exposing the important functions in a cute little Barley object
 *
 * Because to me, this:
 * import { Barely } from '@justbarely/ui'
 * Barely.init()
 * Barely.register()
 *
 * is clearly better than this:
 * import { init, register } from '@justbarely/engine/registry'
 * init()
 * register()
 */
export const Barely = {
	register,
	init,
};

/** Helpers */
export * from './helpers/attr';
export * from './helpers/cleanup';
export * from './helpers/children';
export * from './helpers/emit';
export * from './helpers/sync';
export * from './helpers/events';
export * from './helpers/observe';
