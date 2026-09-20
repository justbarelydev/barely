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

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => Barely.init());
	} else {
		Barely.init();
	}
}
