/**
 * @justbarely/engine - public API
 */

import { register } from './registry';
import { init } from './init';

/**
 * Exposing the important functions in a cute little Barley object
 *
 * import { Barely } from '@justbarely/ui'
 * Barely.init()
 * Barely.register()
 */
export const Barely = {
	register,
	init,
};

// Helpers
export * from './helpers/attr';
export * from './helpers/cleanup';
export * from './helpers/elements';
export * from './helpers/emit';
export * from './helpers/sync';
export * from './helpers/events';
export * from './helpers/observe';
export * from './helpers/position';
export * from './helpers/timing';
