/**
 * @justbarely/engine - custom event helper
 *
 * For when you need to broadcast component updates outside of the component
 * itself. These bubble and carry whatever data you want with detail: {}
 *
 * Use these sparingly and only for meaningful updates. DON'T fire these off at
 * 60fps or for trivial data or the event bus will just be constant noise.
 *
 * This is also a good way to let frameworks know something happened so you can
 * sync state
 */

export const emit = (el, name, detail = {}) => {
	el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
};
