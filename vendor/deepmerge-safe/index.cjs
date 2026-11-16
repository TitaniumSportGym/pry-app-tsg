'use strict';

// Derived from deepmerge 4.3.1 dist/cjs.js (MIT; see LICENSE).
// Local security replacement, not an upstream deepmerge release.
function isMergeableObject(value) {
  if (!value || typeof value !== 'object') return false;
  const tag = Object.prototype.toString.call(value);
  return tag !== '[object RegExp]' && tag !== '[object Date]' &&
    value.$$typeof !== (typeof Symbol === 'function' && Symbol.for ? Symbol.for('react.element') : 0xeac7);
}

function emptyTarget(value) {
  return Array.isArray(value) ? [] : {};
}

function cloneUnlessOtherwiseSpecified(value, options) {
  return options.clone !== false && options.isMergeableObject(value)
    ? deepmerge(emptyTarget(value), value, options) : value;
}

function defaultArrayMerge(target, source, options) {
  return target.concat(source).map(element => cloneUnlessOtherwiseSpecified(element, options));
}

function getMergeFunction(key, options) {
  if (!options.customMerge) return deepmerge;
  const custom = options.customMerge(key);
  return typeof custom === 'function' ? custom : deepmerge;
}

function getKeys(object) {
  const symbols = Object.getOwnPropertySymbols
    ? Object.getOwnPropertySymbols(object).filter(key => Object.prototype.propertyIsEnumerable.call(object, key)) : [];
  return Object.keys(object).concat(symbols);
}

function forbiddenKey(key) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function propertyIsOnObject(object, key) {
  try { return key in object; } catch { return false; }
}

function propertyIsUnsafe(target, key) {
  // Primitive/null targets have no inherited properties to merge. Proxy errors
  // must fail closed rather than enabling an unchecked write.
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) return false;
  try {
    return key in target && !(Object.prototype.hasOwnProperty.call(target, key) &&
      Object.prototype.propertyIsEnumerable.call(target, key));
  } catch { return true; }
}

function defineValue(destination, key, value) {
  Object.defineProperty(destination, key, { value, enumerable: true, configurable: true, writable: true });
}

function mergeObject(target, source, options) {
  const destination = {};
  if (options.isMergeableObject(target)) {
    getKeys(target).forEach(key => {
      if (forbiddenKey(key)) return;
      defineValue(destination, key, cloneUnlessOtherwiseSpecified(target[key], options));
    });
  }
  getKeys(source).forEach(key => {
    if (forbiddenKey(key) || propertyIsUnsafe(target, key)) return;
    const value = propertyIsOnObject(target, key) && options.isMergeableObject(source[key])
      ? getMergeFunction(key, options)(target[key], source[key], options)
      : cloneUnlessOtherwiseSpecified(source[key], options);
    defineValue(destination, key, value);
  });
  return destination;
}

function deepmerge(target, source, options) {
  options = options || {};
  options.arrayMerge = options.arrayMerge || defaultArrayMerge;
  options.isMergeableObject = options.isMergeableObject || isMergeableObject;
  options.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
  const sourceIsArray = Array.isArray(source);
  if (sourceIsArray !== Array.isArray(target)) return cloneUnlessOtherwiseSpecified(source, options);
  return sourceIsArray ? options.arrayMerge(target, source, options) : mergeObject(target, source, options);
}

deepmerge.all = function deepmergeAll(array, options) {
  if (!Array.isArray(array)) throw new Error('first argument should be an array');
  return array.reduce((previous, next) => deepmerge(previous, next, options), {});
};

module.exports = deepmerge;
