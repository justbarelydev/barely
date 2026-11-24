/**
 * @justbarely/components - module entry point
 *
 * Import this and every component works. Each one registers itself, and
 * Barely.init() runs at the bottom. The named exports are the blueprints, which
 * contain onMount/onChange/onChildUpdate (the same hooks the components use
 * internally), but for every instance of that component. For a <script> tag, use
 * src/cdn.js.
 */

import { Barely } from '@justbarely/engine';

// Re-exporting also evaluates the module, so these replace the side-effect
// imports - one path in, not two.
export { Tabs } from './tabs/tabs';
export { Accordion } from './accordion/accordion';
export { Dialog } from './dialog/dialog';
export { Carousel } from './carousel/carousel';
export { CarouselNav } from './carousel/carousel-nav';
export { Tooltip } from './tooltip/tooltip';
export { Popover } from './popover/popover';
export { Dropdown } from './dropdown/dropdown';

Barely.init();
