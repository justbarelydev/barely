import { randomInt } from '../helpers';

/** Generate a random number (or float when decimals is set) */
export function number({ min = 0, max = 1000, decimals } = {}) {
	if (decimals !== undefined) {
		const value = Math.random() * (max - min) + min;
		return Number(value.toFixed(decimals));
	}
	return randomInt(min, max);
}

/** Generate a random float */
export function float({ min = 0, max = 1000, decimals = 2 } = {}) {
	const value = Math.random() * (max - min) + min;
	return Number(value.toFixed(decimals));
}
