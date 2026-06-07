import { pick, randomInt } from '../helpers';
import { loremWords } from '../seeds';

/** Capitalize the first letter of a string */
export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Generate random words */
export function words(count = 12) {
	if (typeof count === 'object') count = count.min ?? 12;
	return Array.from({ length: count }, () => pick(loremWords)).join(' ');
}

/** Generate a random sentence(s) */
export function sentence(count = 1) {
	if (typeof count === 'object') count = count.min ?? 1;
	const make = () => {
		const wordCount = randomInt(12, 24);
		const picks = Array.from({ length: wordCount }, () => pick(loremWords));
		return capitalize(picks.join(' ')) + '.';
	};
	return count === 1 ? make() : Array.from({ length: count }, make).join(' ');
}

/** Generate a random paragraph(s) */
export function paragraph(params = {}) {
	const count = params.count ?? params.min ?? 1;
	return Array.from({ length: count }, () => {
		const sentenceCount = randomInt(3, 7);
		const sentences = Array.from({ length: sentenceCount }, () =>
			sentence(),
		);
		return sentences.join(' ');
	}).join('\n\n');
}
