import { pick } from '../helpers';
import { companyAdjectives, companyNouns, buzzPhrases } from '../seeds';

/** @returns {string} A company name like Quantum Ventures */
export function companyName() {
	return `${pick(companyAdjectives)} ${pick(companyNouns)}`;
}

/** @returns {string} A buzzword-heavy tagline */
export function catchPhrase() {
	return pick(buzzPhrases);
}
