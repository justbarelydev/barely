import { randomInt } from '../helpers';

/** @returns {number} Integer (default) or float (if decimals is set) */
export function number({ min = 0, max = 1000, decimals } = {}) {
	if (decimals !== undefined) {
		const value = Math.random() * (max - min) + min;
		return Number(value.toFixed(decimals));
	}
	return randomInt(min, max);
}

/** @returns {number} A float rounded to the given decimal places */
export function float({ min = 0, max = 1000, decimals = 2 } = {}) {
	const value = Math.random() * (max - min) + min;
	return Number(value.toFixed(decimals));
}
