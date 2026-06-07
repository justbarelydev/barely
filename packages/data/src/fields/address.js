import { pick, randomInt } from '../helpers';
import { streets, cities, states } from '../seeds';

/** Generate a random street address */
export function street() {
	return `${randomInt(100, 9999)} ${pick(streets)}`;
}

/** Generate a random city */
export function city() {
	return pick(cities);
}

/** Generate a random state */
export function state() {
	return pick(states);
}

/** Generate a random zip code */
export function zipCode() {
	return String(randomInt(10000, 99999));
}

/** Generate a random full address */
export function fullAddress() {
	return `${street()}, ${city()}, ${state()} ${zipCode()}`;
}
