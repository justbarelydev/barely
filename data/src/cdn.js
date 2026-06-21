/**
 * @barely/data — CDN entry point
 *
 * Re-exports all generators and auto-initializes the DOM bridge.
 * Use this via `<script src="...@justbarely/data">` for drop-in placeholder data.
 */

export * from './index.js';
import { init } from './browser.js';

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}
