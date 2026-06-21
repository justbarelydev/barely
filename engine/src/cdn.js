/**
 * @justbarely/engine — CDN entry point
 *
 * Auto-inits on script load.
 * For <script src="..."> usage - no manual init() call needed
 */

export * from './index.js';
import { Barely } from './index.js';

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => Barely.init());
	} else {
		Barely.init();
	}
}
