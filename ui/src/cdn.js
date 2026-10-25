/**
 * @justbarely/ui - CDN entry point
 *
 * Everything in one script: core + engine + data + components. Exposes a flat
 * window.Barely (register/init + helpers) and window.BarelyData (generators),
 * and auto-inits components + the data DOM bridge.
 */

import * as engine from '@justbarely/engine';
import * as data from '@justbarely/data';
import '@justbarely/components';

const { Barely, ...helpers } = engine;
window.Barely = Object.assign(Barely, helpers);
window.BarelyData = data;

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', data.init);
	} else {
		data.init();
	}
}
