/**
 * @justbarely/engine - lazy component init
 */

import { COMPONENT } from './constants';
import { els } from './helpers/elements';
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
	els(document, COMPONENT).forEach((el) => initComponent(el, Registry));
};
