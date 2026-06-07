/**
 * @barely/data — placeholder data generators
 *
 * Add realistic fake data to your HTML with data attributes.
 * All generators are standalone functions — call them directly or use the DOM bridge.
 */

// Field generators
export { boolean } from './fields/boolean';
export { number, float } from './fields/number';
export { words, sentence, paragraph } from './fields/text';
export {
	firstName,
	lastName,
	fullName,
	email,
	job,
	phone,
	username,
	website,
} from './fields/people';
export { street, city, state, zipCode, fullAddress } from './fields/address';
export { price, rating, inStock, sku, category } from './fields/commerce';
export { companyName, catchPhrase } from './fields/company';
export { avatar, placeholder } from './fields/image';

// Helpers
export { pick, randomInt, initials, colorFromSeed, toList } from './helpers';

// Auto-init DOM bridge in browser
import './browser';
