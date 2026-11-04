import { describe, expect, it } from 'vitest';
import { createPosition } from './position';

// A fake axis + items: enough to exercise the position protocol with no DOM.
const make = ({ at = 0, count = 5, size = 100, viewport = 100 } = {}) => {
	const pos = { value: at };
	const items = Array.from({ length: count }, (_, i) => ({
		start: i * size,
		size,
	}));
	const axis = {
		pos: () => pos.value,
		size: () => viewport,
		max: () => Math.max(0, count * size - viewport),
		scrollTo: (px) => {
			pos.value = px;
		},
	};
	return { position: createPosition({ axis, items }, 'start'), pos };
};

describe('position scroll', () => {
	it('moves the axis and marks the journey', () => {
		const { position, pos } = make();
		position.scrollTo(3);

		expect(pos.value).toBe(300);
		expect(position.travelling()).toBe(true);
	});

	it('does not scroll when already at the target', () => {
		const { position, pos } = make({ at: 300 });
		position.scrollTo(3);

		expect(pos.value).toBe(300);
		expect(position.travelling()).toBe(false);
	});

	it('clamps to the end of the axis', () => {
		const { position, pos } = make({ at: 0, count: 5, viewport: 300 });
		position.scrollTo(4); // cannot center start-of-4 past max 200

		expect(pos.value).toBe(200);
	});

	it('releases the journey when the user takes over', () => {
		const { position } = make();
		position.scrollTo(3);
		position.release();

		expect(position.travelling()).toBe(false);
	});
});

describe('position settle gate', () => {
	it('blocks a settle mid-flight', () => {
		const { position, pos } = make();
		position.scrollTo(4);

		pos.value = 150; // only part way
		expect(position.settleGate()).toBe(false);
		expect(position.travelling()).toBe(true);
	});

	it('opens once the track arrives', () => {
		const { position, pos } = make();
		position.scrollTo(4);

		pos.value = 400;
		expect(position.settleGate()).toBe(true);
		expect(position.travelling()).toBe(false);
	});

	it('opens when the track stops short of the destination', () => {
		const { position, pos } = make();
		position.scrollTo(4);

		pos.value = 150;
		expect(position.settleGate()).toBe(false);

		// Second settle with no movement: it is never coming.
		expect(position.settleGate()).toBe(true);
	});
});

describe('position reporting', () => {
	it('finds the nearest index and knows what is already chosen', () => {
		const { position, pos } = make({ at: 350 });
		expect(position.nearest()).toBe(3);
		expect(position.chosenHere(3)).toBe(false); // 350 is not item 3's start
		pos.value = 300;
		expect(position.chosenHere(3)).toBe(true);
	});

	it('remembers and consumes a scroll report', () => {
		const { position } = make();
		position.markReported(2);

		expect(position.wasReported(1)).toBe(false);
		expect(position.wasReported(2)).toBe(true);
		expect(position.wasReported(2)).toBe(false); // consumed
	});
});
