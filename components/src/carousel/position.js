/**
 * @justbarely/components - carousel position
 *
 * Handles the carousel's position and destination. That's its whole job:
 * telling an intent (a request to move via [data-nav], keyboard, etc) apart
 * from a manual scroll (the track landing somewhere on its own).
 */

import { clamp, nearestIndex, targetFor } from '@justbarely/core';

export const createPosition = (geo, align) => {
	const state = { destination: null, reported: null, lastPos: null };

	return {
		// Is an intent currently taking us somewhere?
		travelling: () => state.destination != null,

		// The user took the wheel, or a new intent supersedes the journey.
		release: () => {
			state.destination = null;
		},

		// The index nearest the current position.
		nearest: () =>
			nearestIndex(geo.items, geo.axis.pos(), geo.axis.size(), align),

		// Is the track already in the right position? The last few centered
		// items share the end position, so keep the chosen one if it's already
		// there.
		chosenHere: (index) => {
			const target = targetFor(geo.items, index, geo.axis.size(), align);
			return (
				target != null &&
				Math.abs(clamp(target, 0, geo.axis.max()) - geo.axis.pos()) < 1
			);
		},

		// Gate the settle read to only report when the track is actually settled
		settleGate: () => {
			const pos = geo.axis.pos();
			if (state.destination != null) {
				const arrived = Math.abs(state.destination - pos) <= 2;
				const stopped =
					state.lastPos != null && Math.abs(pos - state.lastPos) <= 1;
				if (!arrived && !stopped) {
					state.lastPos = pos;
					return false;
				}
				state.destination = null;
			}
			state.lastPos = pos;
			return true;
		},

		// This index came from a manual scroll, not an intent: remember it so
		// the following write is treated properly as "already here".
		markReported: (index) => {
			state.reported = index;
		},

		// Was this value marked as coming from a manual scroll?
		wasReported: (value) => {
			if (state.reported !== value) return false;
			state.reported = null;
			return true;
		},

		// The one thing allowed to scroll. Sets the destination and
		// asks the axis to move
		scrollTo: (index, behavior = 'auto') => {
			const target = targetFor(geo.items, index, geo.axis.size(), align);
			if (target == null) return;
			const px = clamp(target, 0, geo.axis.max());
			if (Math.abs(px - geo.axis.pos()) < 1) return;
			state.destination = px;
			geo.axis.scrollTo(px, behavior);
		},
	};
};
