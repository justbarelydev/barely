/**
 * @barely/data - helpers
 *
 * Pure utility functions used by all generators
 */

/** Pick a random item from an array */
export function pick(arr) {
	const rand = Math.random() * arr.length;
	return arr[Math.floor(rand)];
}

/** Generate a random integer between min and max (inclusive) */
export function randomInt(min, max) {
	const range = max - min + 1;
	const rand = Math.random() * range;
	return Math.floor(rand) + min;
}

/** Get uppercase initials from a first and last name */
export function initials(first, last) {
	const firstInitial = first?.[0] || '';
	const lastInitial = last?.[0] || '';
	return (firstInitial + lastInitial).toUpperCase();
}

/** Get a hex color from a seed string */
export function colorFromSeed(seed) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		// Mix character into hash using Bernstein's algorithm (djb2)
		hash = seed.charCodeAt(i) + ((hash << 5) - hash);
	}
	// Mask to 24 bits (6 hex digits) for a valid CSS color
	const color = hash & 0x00ffffff;
	return color.toString(16).padStart(6, '0');
}

/** Parse comma/space/plus-separated strings into an array */
export function toList(val) {
	if (!val) return [];
	return (
		String(val)
			// Split on commas, pluses, or spaces
			.split(/[,+ ]+/)
			.map((s) => s.trim())
			.filter(Boolean)
	);
}
