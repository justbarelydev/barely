import { describe, it, expect } from 'vitest';
import { hasToken, toBool } from '@justbarely/core';

describe('hasToken', () => {
	it('finds a token in a space-separated list', () => {
		expect(hasToken('a b c', 'b')).toBe(true);
		expect(hasToken('a b c', 'd')).toBe(false);
	});

	it('tolerates a missing list', () => {
		expect(hasToken(undefined, 'a')).toBe(false);
	});
});

describe('toBool', () => {
	it('maps truthiness to strings', () => {
		expect(toBool(1)).toBe('true');
		expect(toBool(0)).toBe('false');
		expect(toBool('')).toBe('false');
	});
});
