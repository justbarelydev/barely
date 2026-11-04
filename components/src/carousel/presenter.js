/**
 * @justbarely/components - carousel presenter
 *
 * "Presenter" is the only way I can think of to say "this is how the carousel
 * movement to a given index is going to look"
 *
 * - native scroll: the axis owns a position and `scrollTo` moves it
 * - [data-mode="index"]: no scroll. CSS shows the current page and hides the rest
 *   scrollTo simply doesn't work (and doesn't need to work) in this mode.
 *
 * More coming in the future
 */

import { hasMode } from '@justbarely/engine';

export const createPresenter = (root, position) => {
	const indexDriven = hasMode(root, 'index');

	return {
		scrollable: !indexDriven,
		scrollTo: (index, behavior) => {
			if (indexDriven) return;
			position.scrollTo(index, behavior);
		},
	};
};
