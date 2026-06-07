import { pick } from '../helpers';
import { companyAdjectives, companyNouns, buzzPhrases } from '../seeds';

/** Generate a random company name */
export function companyName() {
	return `${pick(companyAdjectives)} ${pick(companyNouns)}`;
}

/** Generate a random company catchphrase */
export function catchPhrase() {
	return pick(buzzPhrases);
}
