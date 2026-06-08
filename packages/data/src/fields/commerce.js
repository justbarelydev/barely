import { pick, randomInt } from '../helpers';
import { categories } from '../seeds';

/** @returns {string} A product category like Accessories */
export function category() {
	return pick(categories);
}

/** @returns {string} A price formatted with the given decimal places */
export function price({ min = 0, max = 1000, decimals = 2 } = {}) {
	const value = Math.random() * (max - min) + min;
	return value.toFixed(decimals);
}

/** @returns {number} A star rating between 1 and 5 */
export function rating({ min = 1, max = 5 } = {}) {
	return randomInt(min, max);
}

/** @returns {boolean} 80% chance of true */
export function inStock() {
	return Math.random() < 0.8;
}

/** @returns {string} A product SKU like B482031 */
export function sku() {
	return `B${randomInt(100000, 999999)}`;
}
