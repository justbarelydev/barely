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
	name,
	email,
	job,
	phone,
	username,
	website,
} from './fields/people';
export { street, city, state, zipCode, address } from './fields/address';
export { price, rating, inStock, sku, category } from './fields/commerce';
export { companyName, catchPhrase } from './fields/company';
export { avatar, image } from './fields/image';

// Helpers
export { pick, randomInt, toList } from './helpers';

// DOM bridge (auto-inits in browser)
import './browser';
