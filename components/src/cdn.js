/**
 * @justbarely/components - CDN entry point
 *
 * Registers all components, exposes a flat window.Barely, and auto-inits.
 * For <script src="..."> usage - no manual init() call needed.
 */

import * as engine from '@justbarely/engine';
import './tabs/tabs';
import './accordion/accordion';
import './modal/modal';
import './carousel/carousel';
import './carousel/carousel-nav';
import './tooltip/tooltip';
import './popover/popover';
import './dropdown/dropdown';

const { Barely, ...helpers } = engine;
window.Barely = Object.assign(Barely, helpers);

// init() defers itself until the DOM is ready (engine-owned timing).
Barely.init();
