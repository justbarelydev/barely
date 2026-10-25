/**
 * @justbarely/engine - CDN entry point
 *
 * Exposes a flat window.Barely (register/init + helpers) and auto-inits.
 * For <script src="..."> usage - no manual init() call needed
 */

import * as engine from './index';

const { Barely, ...helpers } = engine;

if (typeof document !== 'undefined') {
	window.Barely = Object.assign(Barely, helpers);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => Barely.init());
	} else {
		Barely.init();
	}
}
