import { describe, it, expect, vi } from 'vitest';
import {
	registerCleanup,
	runCleanup,
	setCleanupOwner,
	getCleanupOwner,
} from '@justbarely/engine';

describe('registerCleanup / runCleanup', () => {
	it('runs every cleanup once on removal', () => {
		const el = {};
		const a = vi.fn();
		const b = vi.fn();
		registerCleanup(el, a);
		registerCleanup(el, b);
		runCleanup(el);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
		runCleanup(el);
		expect(a).toHaveBeenCalledTimes(1);
	});
});

describe('owner tracking', () => {
	it('scopes the owner to fn and restores it', () => {
		const owner = {};
		setCleanupOwner(owner, () => {
			expect(getCleanupOwner()).toBe(owner);
		});
		expect(getCleanupOwner()).toBe(null);
	});

	it('restores the owner even when fn throws', () => {
		expect(() =>
			setCleanupOwner({}, () => {
				throw new Error('boom');
			}),
		).toThrow('boom');
		expect(getCleanupOwner()).toBe(null);
	});

	it('nests without clobbering the outer owner', () => {
		const outer = {};
		const inner = {};
		setCleanupOwner(outer, () => {
			setCleanupOwner(inner, () => {
				expect(getCleanupOwner()).toBe(inner);
			});
			expect(getCleanupOwner()).toBe(outer);
		});
		expect(getCleanupOwner()).toBe(null);
	});
});
