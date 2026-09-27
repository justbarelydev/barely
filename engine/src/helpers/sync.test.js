// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { registerSync, bindSyncElement, forwardSync } from '@justbarely/engine';

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
});
