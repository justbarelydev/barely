import { describe, it, expect, vi } from 'vitest';
import {
	setAttrs,
	unitize,
	ensureAttr,
	setCssVar,
	refract,
	hasMode,
} from '@justbarely/engine';

const makeStyle = () => {
	const vars = {};
	return {
		getPropertyValue: (p) => vars[p] ?? '',
		setProperty: (p, v) => {
			vars[p] = v;
		},
		vars,
	};
};

const makeEl = (attrs = {}) => {
	const map = { ...attrs };
	return {
		attrs: map,
		setAttribute: (k, v) => {
			map[k] = String(v);
		},
		removeAttribute: (k) => {
			delete map[k];
		},
		hasAttribute: (k) => k in map,
	};
};

describe('unitize', () => {
	const px = unitize('px');

	it('appends a unit to bare numbers', () => {
		expect(px('12')).toBe('12px');
	});

	it('passes strings with units through unchanged', () => {
		expect(px('100%')).toBe('100%');
	});
});

describe('setAttrs', () => {
	it('sets strings and toggles booleans', () => {
		const el = makeEl();
		setAttrs(el, { id: 'x', 'aria-hidden': true });
		expect(el.attrs.id).toBe('x');
		expect(el.attrs['aria-hidden']).toBe('');
		setAttrs(el, { 'aria-hidden': false });
		expect(el.attrs['aria-hidden']).toBeUndefined();
	});
});

describe('ensureAttr', () => {
	it('sets only when missing', () => {
		const el = makeEl({ id: 'kept' });
		ensureAttr(el, 'id', 'new');
		ensureAttr(el, 'role', 'menu');
		expect(el.attrs.id).toBe('kept');
		expect(el.attrs.role).toBe('menu');
	});
});

describe('setCssVar', () => {
	it('writes a var, appending units to numbers', () => {
		const el = { style: makeStyle() };
		setCssVar(el, 'panel-height', 200, 'px');
		expect(el.style.vars['--panel-height']).toBe('200px');
	});

	it('skips unchanged values', () => {
		const el = { style: makeStyle() };
		setCssVar(el, 'x', '1rem');
		const set = vi.spyOn(el.style, 'setProperty');
		setCssVar(el, 'x', '1rem');
		expect(set).not.toHaveBeenCalled();
	});
});

describe('refract', () => {
	it('strips the data- prefix onto the CSS var', () => {
		const el = { style: makeStyle() };
		refract(el, 'data-offset-x', '12');
		expect(el.style.vars['--offset-x']).toBe('12');
	});
});

describe('hasMode', () => {
	it('matches a token in data-mode', () => {
		expect(
			hasMode({ dataset: { mode: 'exclusive horizontal' } }, 'exclusive'),
		).toBe(true);
		expect(hasMode({ dataset: { mode: 'exclusive' } }, 'vertical')).toBe(
			false,
		);
	});
});
