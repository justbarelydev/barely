/**
 * Check if a space-separated list contains a token
 * @param {string} list
 * @param {string} token
 * @return {boolean}
 */
export const hasToken = (list, token) => {
	return (list || '').split(' ').includes(token);
};

/**
 * Convert a truthy/falsy value to a string true/false
 * @param {*} value
 * @returns {'true' | 'false'}
 */
export const toBool = (value) => (value ? 'true' : 'false');
