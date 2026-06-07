import { pick, randomInt } from '../helpers';
import { firstNames, lastNames, jobs, domains } from '../seeds';

/** Generate a random first name */
export function firstName() {
	return pick(firstNames);
}

/** Generate a random last name */
export function lastName() {
	return pick(lastNames);
}

/** Generate a random full name */
export function fullName() {
	return `${firstName()} ${lastName()}`;
}

/** Generate a random job title */
export function job() {
	return pick(jobs);
}

/** Generate a random email domain */
export function domain() {
	return pick(domains);
}

/** Generate a random email address */
export function email() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	return `${first}.${last}@${domain()}`;
}

/** Generate a random phone number */
export function phone() {
	const area = randomInt(200, 999);
	const prefix = randomInt(200, 999);
	const line = randomInt(1000, 9999);
	return `${area}-${prefix}-${line}`;
}

/** Generate a random username */
export function username() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	const number = randomInt(1, 999);
	return `${first}${last}${number}`;
}

/** Generate a random website */
export function website() {
	const first = firstName().toLowerCase();
	const last = lastName().toLowerCase();
	return `https://${first}${last}.com`;
}
