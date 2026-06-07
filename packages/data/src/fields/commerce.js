import { pick, randomInt } from '../helpers';
import {
	categories,
	productAdjectives,
	productNouns,
	productMaterials,
} from '../seeds';

/** Generate a random product category */
export function category() {
	return pick(categories);
}

/** Generate a random product price with cents */
export function price({ min = 0, max = 1000, decimals = 2 } = {}) {
	const value = Math.random() * (max - min) + min;
	return value.toFixed(decimals);
}

/** Generate a random product rating */
export function rating({ min = 1, max = 5 } = {}) {
	return randomInt(min, max);
}

/** Generate a random boolean if the product is in stock (80% chance) */
export function inStock() {
	return Math.random() < 0.8;
}

/** Generate a random product SKU (B100000-B999999) */
export function sku() {
	return `B${randomInt(100000, 999999)}`;
}
