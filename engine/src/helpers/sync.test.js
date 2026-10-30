// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
	registerSync,
	bindSyncElement,
	forwardSync,
	sync,
} from '@justbarely/engine';

describe('forwardSync', () => {
	it('mirrors attrs and CSS vars to subscribers', () => {
		document.body.innerHTML = '<div id="src"></div><div id="sub"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('#sub');
		registerSync(sub, '#src');
		forwardSync(src, 'data-index', '3');
		expect(sub.getAttribute('data-index')).toBe('3');
		expect(sub.style.getPropertyValue('--index')).toBe('3');
	});
});

describe('bindSyncElement', () => {
	it('binds a [data-sync] element to its source', () => {
		document.body.innerHTML =
			'<div id="src"></div><div data-sync="#src"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('[data-sync]');
		bindSyncElement(sub);
		forwardSync(src, 'data-x', '1');
		expect(sub.getAttribute('data-x')).toBe('1');
	});

	it("copies the source's current values on bind", () => {
		document.body.innerHTML =
			'<div id="src" data-refract="data-x" data-x="1"></div><div data-sync="#src"></div>';
		const sub = document.querySelector('[data-sync]');
		bindSyncElement(sub);
		expect(sub.getAttribute('data-x')).toBe('1');
		expect(sub.style.getPropertyValue('--x')).toBe('1');
	});
});

describe('sync whitelist', () => {
	it('syncs only the listed attrs', () => {
		document.body.innerHTML = '<div id="src"></div><div id="sub"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('#sub');
		sync(sub, '#src', ['data-index']);
		forwardSync(src, 'data-index', '3');
		forwardSync(src, 'data-other', '4');
		expect(sub.getAttribute('data-index')).toBe('3');
		expect(sub.hasAttribute('data-other')).toBe(false);
	});

	it('auto-watches an attr the source does not broadcast', async () => {
		document.body.innerHTML = '<div id="src"></div><div id="sub"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('#sub');
		sync(sub, '#src', ['data-open']);
		src.setAttribute('data-open', 'true');
		await new Promise((r) => setTimeout(r, 0));
		expect(sub.getAttribute('data-open')).toBe('true');
	});

	it('replaces a previous subscription for the same element', () => {
		document.body.innerHTML = '<div id="src"></div><div id="sub"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('#sub');
		sync(sub, '#src', ['data-index']);
		sync(sub, '#src', ['data-other']);
		forwardSync(src, 'data-index', '3');
		expect(sub.hasAttribute('data-index')).toBe(false);
	});
});

describe('data-sync-attrs', () => {
	it('trims declarative sync to the listed attrs', () => {
		document.body.innerHTML =
			'<div id="src"></div><div id="sub" data-sync="#src" data-sync-attrs="data-index"></div>';
		const src = document.querySelector('#src');
		const sub = document.querySelector('#sub');
		bindSyncElement(sub);
		forwardSync(src, 'data-index', '3');
		forwardSync(src, 'data-other', '4');
		expect(sub.getAttribute('data-index')).toBe('3');
		expect(sub.hasAttribute('data-other')).toBe(false);
	});
});
