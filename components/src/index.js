/**
 * @justbarely/components - module entry point
 *
 * Registers every component and inits the engine. Import this for side effects;
 * the CDN build's entry (cdn.js) is the script-tag equivalent.
 */

import { Barely } from '@justbarely/engine';
import './tabs/tabs';
import './accordion/accordion';
import './modal/modal';
import './carousel/carousel';
import './carousel/carousel-nav';
import './tooltip/tooltip';
import './popover/popover';
import './dropdown/dropdown';

Barely.init();
