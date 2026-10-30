// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { observe, resize } from '@justbarely/engine';

const realIO = globalThis.IntersectionObserver;

let uid = 0;
const tag = () => ++uid;

const setupIO = () => {
	const instances = [];
	class FakeIntersectionObserver {
		constructor(callback, options) {
			this.callback = callback;
			this.options = options;
			this.observed = [];
			instances.push(this);
		}
		observe(el) {
			this.observed.push(el);
		}
		unobserve(el) {
			this.observed = this.observed.filter((e) => e !== el);
		}
	}
	globalThis.IntersectionObserver = FakeIntersectionObserver;
	return instances;
};

// The ResizeObserver pool is a singleton keyed 'default', so every test shares
// one fake instance. Installing it once keeps assertions on a stable target.
let sharedRO = null;
class FakeResizeObserver {
	constructor(callback) {
		this.callback = callback;
		this.observed = [];
		sharedRO = this;
	}
	observe(el) {
		this.observed.push(el);
	}
	unobserve(el) {
		this.observed = this.observed.filter((e) => e !== el);
	}
}
globalThis.ResizeObserver = FakeResizeObserver;

const resetRO = () => {
	if (sharedRO) sharedRO.observed = [];
};

afterEach(() => {
	globalThis.IntersectionObserver = realIO;
	document.body.innerHTML = '';
});

describe('observe - iterables', () => {
	it('observes every element in a NodeList', () => {
		document.body.innerHTML =
			'<div class="a"></div><div class="a"></div><div class="a"></div>';
		const els = document.querySelectorAll('.a');
		const instances = setupIO();
		observe(els, () => {}, { tag: tag() });
		expect(instances).toHaveLength(1);
		expect(instances[0].observed).toHaveLength(3);
	});

	it('observes every element in an array', () => {
		document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
		const els = [...document.querySelectorAll('.a')];
		const instances = setupIO();
		observe(els, () => {}, { tag: tag() });
		expect(instances[0].observed).toHaveLength(2);
	});

	it('still observes a single element', () => {
		document.body.innerHTML = '<div id="one"></div>';
		const el = document.querySelector('#one');
		const instances = setupIO();
		observe(el, () => {}, { tag: tag() });
		expect(instances[0].observed).toContain(el);
	});

	it('returns a no-op for an empty iterable without creating an observer', () => {
		const instances = setupIO();
		const off = observe([], () => {});
		expect(instances).toHaveLength(0);
		expect(() => off()).not.toThrow();
	});

	it('off() unobserves every element', () => {
		document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
		const els = document.querySelectorAll('.a');
		const instances = setupIO();
		const off = observe(els, () => {}, { tag: tag() });
		off();
		expect(instances[0].observed).toHaveLength(0);
	});
});

describe('observe - once', () => {
	it('fires once then unobserves', () => {
		document.body.innerHTML = '<div id="one"></div>';
		const el = document.querySelector('#one');
		const instances = setupIO();
		const fn = vi.fn();
		observe(el, fn, { once: true, tag: tag() });
		instances[0].callback([{ target: el }]);
		instances[0].callback([{ target: el }]);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(instances[0].observed).toHaveLength(0);
	});

	it('is per-element when given a list', () => {
		document.body.innerHTML = '<div class="a"></div><div class="a"></div>';
		const [a, b] = document.querySelectorAll('.a');
		const instances = setupIO();
		const fn = vi.fn();
		observe([a, b], fn, { once: true, tag: tag() });
		instances[0].callback([{ target: a }]);
		expect(instances[0].observed).toContain(b);
		expect(instances[0].observed).not.toContain(a);
	});
});

describe('resize - iterables', () => {
	it('resize(els, fn) observes every element and off() unobserves them', () => {
		document.body.innerHTML =
			'<div class="a"></div><div class="a"></div><div class="a"></div>';
		const els = document.querySelectorAll('.a');
		resetRO();
		const off = resize(els, () => {});
		expect(sharedRO.observed).toHaveLength(3);
		off();
		expect(sharedRO.observed).toHaveLength(0);
	});

	it('resize(root, els, fn) observes every element', () => {
		document.body.innerHTML =
			'<div id="root"><div class="a"></div><div class="a"></div></div>';
		const root = document.querySelector('#root');
		const els = root.querySelectorAll('.a');
		resetRO();
		resize(root, els, () => {});
		expect(sharedRO.observed).toHaveLength(2);
	});

	it('returns a no-op for an empty iterable without observing', () => {
		resetRO();
		const off = resize([], () => {});
		expect(sharedRO.observed).toHaveLength(0);
		expect(() => off()).not.toThrow();
	});

	it('swapping the callback keeps one observer per element', () => {
		document.body.innerHTML = '<div id="one"></div>';
		const el = document.querySelector('#one');
		resetRO();
		resize(el, () => {});
		resize(el, () => {});
		expect(sharedRO.observed).toHaveLength(1);
	});
});
