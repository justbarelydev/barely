/**
 * @justbarely/engine - lazy component init
 */

import { COMPONENT } from './constants';
import { children } from './helpers/elements';
import { initComponent } from './mutation';

/**
 * Init every [data-component] immediately, unless [data-lazy] is present -
 * then wait for the first intersection and init once.
 *
 * For custom IO options, skip [data-lazy] and use observe() directly.
 *
 * @param {Map} Registry
 */
export const initIntersection = (Registry) => {
	children(document, COMPONENT).forEach((el) => initComponent(el, Registry));
};
