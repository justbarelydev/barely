/**
 * @barely/data — DOM bridge
 *
 * Auto-initializes on load.
 * Scans for [data-random-*] attributes and populates them
 * using the field generators directly.
 */

import { boolean } from './fields/boolean';
import { number, float } from './fields/number';
import { words, sentence, paragraph } from './fields/text';
import {
	firstName,
	lastName,
	name,
	email,
	job,
	phone,
	username,
	website,
} from './fields/people';
import { street, city, state, zipCode, address } from './fields/address';
import { price, rating, inStock, sku, category } from './fields/commerce';
import { companyName, catchPhrase } from './fields/company';
import { avatar, image } from './fields/image';

const FIELD_MAP = {
	boolean,
	number,
	float,
	words,
	sentence,
	paragraph,
	name,
	firstName,
	lastName,
	email,
	job,
	phone,
	username,
	website,
	street,
	city,
	state,
	zipCode,
	address,
	price,
	rating,
	inStock,
	sku,
	category,
	companyName,
	catchPhrase,
	image,
	avatar,
};

const ATTRIBUTES = Object.keys(FIELD_MAP).map((f) => `data-random-${f}`);
const COMPANIONS = [
	'data-text',
	'data-bg',
	'data-fg',
	'data-decimals',
	'width',
	'height',
];

// Parse attribute value for range params
function parseRange(val) {
	if (!val) return {};
	const [a, b] = val.split(/[, -]+/).map(Number);
	return { min: a, max: isNaN(b) ? a : b };
}

// ── Field handlers ─────────────────────────────────────────────

function handleGeneric(element, generator, value, dataset) {
	const opts = parseRange(value);
	if (dataset.decimals) opts.decimals = Number(dataset.decimals);
	const result = generator(opts);
	const tag = element.tagName.toLowerCase();
	if (tag === 'input' || tag === 'textarea') {
		element.value = result;
	} else if (typeof result === 'string' && result.includes('\n')) {
		element.innerHTML = result
			.split('\n\n')
			.map((p) => `<p>${p}</p>`)
			.join('');
	} else {
		element.textContent = String(result);
	}
}

function handleInStock(element, generator) {
	element.textContent = generator() ? '✓' : '✗';
}

function handleRating(element, generator, value) {
	const num = generator();
	const mode = value || 'both';
	if (mode === 'number') {
		element.textContent = String(num);
	} else if (mode === 'stars') {
		element.textContent =
			'★'.repeat(Math.round(num)) + '☆'.repeat(5 - Math.round(num));
	} else {
		element.textContent = `${num} ${'★'.repeat(Math.round(num))}${'☆'.repeat(5 - Math.round(num))}`;
	}
}

function handlePrice(element, generator, value, dataset) {
	const opts = parseRange(value);
	if (dataset.decimals) opts.decimals = Number(dataset.decimals);
	element.textContent = `$${generator(opts)}`;
}

function handleParagraph(element, generator, value) {
	const text = generator(parseRange(value));
	if (text.includes('\n')) {
		element.innerHTML = text
			.split('\n\n')
			.map((p) => `<p>${p}</p>`)
			.join('');
	} else {
		element.innerHTML = `<p>${text}</p>`;
	}
}

function handleImage(element, generator, _, dataset) {
	const svg = generator({
		width: Number(element.getAttribute('width')),
		height: Number(element.getAttribute('height')),
		bg: dataset.bg || '#e2e8f0',
		fg: dataset.fg || '#94a3b8',
		text: dataset.text,
	});
	element.src = svg.startsWith('<svg')
		? 'data:image/svg+xml,' + encodeURIComponent(svg)
		: svg;
}

const handlers = {
	inStock: handleInStock,
	rating: handleRating,
	price: handlePrice,
	paragraph: handleParagraph,
	image: handleImage,
	avatar: handleImage,
};

// Populate an element
function populate(element) {
	for (const key of Object.keys(element.dataset)) {
		if (!key.startsWith('random')) continue;
		const field = key.slice(6).replace(/^[A-Z]/, (c) => c.toLowerCase());
		const generator = FIELD_MAP[field];
		if (!generator) continue;

		const fn = handlers[field] || handleGeneric;
		fn(element, generator, element.dataset[key], element.dataset);
	}
}

// Scan DOM for [data-random-*] elements
function populateAll(root) {
	if (!root || root.nodeType !== 1) return;
	populate(root);
	for (const child of root.children) populateAll(child);
}

// MutationObserver for dynamically added elements
let observer;

function startObserver() {
	observer = new MutationObserver((mutations) => {
		for (const m of mutations) {
			if (m.type === 'childList') {
				for (const added of m.addedNodes) {
					if (added.nodeType === 1) populateAll(added);
				}
			} else if (m.type === 'attributes') {
				populate(m.target);
			}
		}
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [...ATTRIBUTES, ...COMPANIONS],
	});
}

function init() {
	populateAll(document.body);
	startObserver();
}

if (typeof document !== 'undefined') {
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
}
