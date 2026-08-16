/**
 * @justbarely/engine - measurement helpers
 *
 * These helpers do the annoying work required to animate from 0 to auto
 * height/width. They also pair nicely with waitForAnimation() to ensure the
 * transition completes before hiding the element.
 *
 */

/**
 * Measure the natural height of an element and store it as an inline CSS variable.
 * Temporarily removes [hidden], sets height to 0, measures scrollHeight, then
 * restores the original state. Skips if the value didn't change.
 *
 * @param {Element} el
 * @param {string} [varName='--el-height'] - CSS variable name to store result
 * @returns {number} the measured height in px
 */
export const measureHeight = (el, varName = '--el-height') => {
	const wasHidden = el.hasAttribute('hidden');
	const wasDisplayNone = getComputedStyle(el).display === 'none';

	if (wasHidden) el.removeAttribute('hidden');
	if (wasDisplayNone) el.style.display = 'block';

	el.style.height = '0px';
	el.style.overflow = 'hidden';
	el.offsetHeight; // force reflow for accurate scrollHeight

	const scrollHeight = el.scrollHeight;

	// Only write if changed
	const current = el.style.getPropertyValue(varName);
	if (current !== `${scrollHeight}px`) {
		el.style.setProperty(varName, `${scrollHeight}px`);
	}

	el.style.height = '';
	el.style.overflow = '';
	if (wasHidden) el.setAttribute('hidden', '');
	if (wasDisplayNone) el.style.display = '';

	return scrollHeight;
};

/**
 * Measure the natural width of an element and store it as an inline CSS variable.
 * Prevents text wrapping during measurement so scrollWidth is accurate.
 * Skips the write if the value hasn't changed.
 *
 * @param {Element} el
 * @param {string} [varName='--el-width'] - CSS variable name to store result
 * @returns {number} the measured width in px
 */
export const measureWidth = (el, varName = '--el-width') => {
	const wasHidden = el.hasAttribute('hidden');
	const wasDisplayNone = getComputedStyle(el).display === 'none';

	if (wasHidden) el.removeAttribute('hidden');
	if (wasDisplayNone) el.style.display = 'block';

	el.style.flex = '0 0 auto';
	el.style.minWidth = '0';
	el.style.width = '0px';
	el.style.whiteSpace = 'nowrap'; // prevent text wrapping
	el.style.overflow = 'hidden';
	el.offsetWidth; // force reflow for accurate scrollWidth

	const scrollWidth = el.scrollWidth;

	// Only write if changed
	const current = el.style.getPropertyValue(varName);
	if (current !== `${scrollWidth}px`) {
		el.style.setProperty(varName, `${scrollWidth}px`);
	}

	el.style.flex = '';
	el.style.minWidth = '';
	el.style.width = '';
	el.style.whiteSpace = '';
	el.style.overflow = '';
	if (wasHidden) el.setAttribute('hidden', '');
	if (wasDisplayNone) el.style.display = '';

	return scrollWidth;
};
