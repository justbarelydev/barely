import { pick, randomInt } from '../helpers';
import { firstNames, lastNames, jobs, domains } from '../seeds';

/** @returns {string} A random first name */
export function firstName() {
	return pick(firstNames);
}

/** @returns {string} A random last name */
export function lastName() {
	return pick(lastNames);
}

/** @returns {string} A random full name */
export function name() {
	return `${firstName()} ${lastName()}`;
}

/** @returns {string} A random job title */
export function job() {
	return pick(jobs);
}

/** @returns {string} A random email domain */
export function domain() {
	return pick(domains);
}

/** @returns {string} An email address like maria.garcia@gmail.com */
export function email() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	return `${first}.${last}@${domain()}`;
}

/** @returns {string} A phone number like 503-555-0199 */
export function phone() {
	const area = randomInt(200, 999);
	const prefix = randomInt(200, 999);
	const line = randomInt(1000, 9999);
	return `${area}-${prefix}-${line}`;
}

/** @returns {string} A username like mariagarcia42 */
export function username() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	const number = randomInt(1, 999);
	return `${first}${last}${number}`;
}

/** @returns {string} A URL like https://mariagarcia.com */
export function website() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	return `https://${first}${last}.com`;
}
