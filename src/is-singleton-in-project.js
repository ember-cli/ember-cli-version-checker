'use strict';

/* global WeakMap, Map, Set */

const SINGLETON_ADDON_MAP = new WeakMap();

/**
 * Traverse the project's addons tree to determine singleton root,
 * cache the boolean result in project x addonName matrix
 */
function isSingletonInProject(name, project) {
  if (!SINGLETON_ADDON_MAP.has(project)) {
    SINGLETON_ADDON_MAP.set(project, new Map());
  }
  let map = SINGLETON_ADDON_MAP.get(project);
  if (map.has(name)) {
    return map.get(name);
  }

  let isSingleton = dfsRecursive(project, name, new Set());
  map.set(name, isSingleton);
  return isSingleton;
}

/**
 * Travese the addons tree, early return if duplication is found
 */
function dfsRecursive(current, name, addonsRootSet) {
  let currentAddons = current.addons || [];
  for (let addon of currentAddons) {
    if (addon.name === name) {
      addonsRootSet.add(addon.root);
    }
    dfsRecursive(addon, name, addonsRootSet);
    if (addonsRootSet.size > 1) {
      return false;
    }
  }
  return addonsRootSet.size === 1;
}

module.exports = isSingletonInProject;
