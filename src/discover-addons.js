'use strict';

function discoverAddonsRecursive(current, name, foundAddons = []) {
  let currentAddons = current.addons || [];
  let found = currentAddons.find(addon => addon.name === name);
  if (found) {
    foundAddons.push(found);
  }

  currentAddons.forEach(addon =>
    discoverAddonsRecursive(addon, name, foundAddons)
  );

  return foundAddons;
}

module.exports = function(project, name) {
  return discoverAddonsRecursive(project, name);
};
