import { pick, randomInt } from '../helpers';
import { loremWords } from '../seeds';

function num(val, fallback) {
	return typeof val === 'number' ? val : (val?.min ?? fallback);
}

/** @returns {string} The string with the first letter uppercased */
export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/** @returns {string} Space-separated lorem ipsum */
export function words(count = 12) {
	return Array.from({ length: num(count, 12) }, () => pick(loremWords)).join(
		' ',
	);
}

/** @returns {string} A capitalized sentence ending with a period */
export function sentence(count = 1) {
	const make = () => {
		const wordCount = randomInt(12, 24);
		const picks = Array.from({ length: wordCount }, () => pick(loremWords));
		return capitalize(picks.join(' ')) + '.';
	};
	return Array.from({ length: num(count, 1) }, make).join(' ');
}

/** @returns {string} One or more paragraphs separated by blank lines */
export function paragraph(count = 1) {
	return Array.from({ length: num(count, 1) }, () => {
		const sentenceCount = randomInt(3, 7);
		const sentences = Array.from({ length: sentenceCount }, () =>
			sentence(),
		);
		return sentences.join(' ');
	}).join('\n\n');
}
