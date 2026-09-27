// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { emit } from '@justbarely/engine';

describe('emit', () => {
	it('dispatches a bubbling CustomEvent with detail', () => {
		const el = document.createElement('div');
		const handler = vi.fn();
		el.addEventListener('barely:change', handler);
		emit(el, 'barely:change', { open: true });
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].detail).toEqual({ open: true });
	});
});
