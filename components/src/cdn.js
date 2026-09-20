/**
 * @justbarely/components - CDN entry point
 *
 * Registers all components and auto-inits on script load.
 * For <script src="..."> usage - no manual init() call needed.
 */

import { Barely } from '@justbarely/engine';
import './tabs';
import './accordion';
import './modal';
import './carousel';
import './tooltip';
import './popover';
import './dropdown';

// init() defers itself until the DOM is ready (engine-owned timing).
Barely.init();
