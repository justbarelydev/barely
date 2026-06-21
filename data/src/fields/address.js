import { pick, randomInt } from '../helpers';
import { streets, cities, states } from '../seeds';

/** @returns {string} A street address like 742 Elm St */
export function street() {
	return `${randomInt(100, 9999)} ${pick(streets)}`;
}

/** @returns {string} A US city name */
export function city() {
	return pick(cities);
}

/** @returns {string} A US state name */
export function state() {
	return pick(states);
}

/** @returns {string} A 5-digit zip code */
export function zipCode() {
	return String(randomInt(10000, 99999));
}

/** @returns {string} A full address like 742 Elm St, Portland, Oregon 97201 */
export function address() {
	return `${street()}, ${city()}, ${state()} ${zipCode()}`;
}
