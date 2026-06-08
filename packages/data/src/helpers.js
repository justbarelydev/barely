/**
 * @barely/data — utility functions
 */

/** @returns a random item from the array */
export function pick(arr) {
	const rand = Math.random() * arr.length;
	return arr[Math.floor(rand)];
}

/** @returns a random integer between min and max (inclusive) */
export function randomInt(min, max) {
	const range = max - min + 1;
	const rand = Math.random() * range;
	return Math.floor(rand) + min;
}

/** @returns an array split on commas, spaces, or pluses */
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
