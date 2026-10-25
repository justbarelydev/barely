/**
 * @justbarely/ui - everything, one import
 *
 * Re-exports core, engine, and data, and side-effect imports components so
 * every built-in component is registered and Barely.init() runs.
 */

export * from '@justbarely/core';
export * from '@justbarely/engine';
export * from '@justbarely/data';
import '@justbarely/components';
