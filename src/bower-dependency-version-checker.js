'use strict';

const path = require('path');
const DependencyVersionChecker = require('./dependency-version-checker');

class BowerDependencyVersionChecker extends DependencyVersionChecker {
  constructor(parent, name) {
    super(parent, name);

    let addon = this._parent._addon;

    let root, bowerDirectory;

    if (addon.project) {
      root = addon.project.root;
      bowerDirectory = addon.project.bowerDirectory;
    } else if (addon.root && addon.bowerDirectory) {
      root = addon.root;
      bowerDirectory = addon.bowerDirectory;
    } else {
      throw new Error(
        'You must provide an Addon, EmberApp/EmberAddon, or Project to check bower dependencies against'
      );
    }

    let bowerDependencyPath = path.join(root, bowerDirectory, this.name);

    this._jsonPath = path.join(bowerDependencyPath, '.bower.json');
    this._fallbackJsonPath = path.join(bowerDependencyPath, 'bower.json');
    this._type = 'bower';
  }
}

module.exports = BowerDependencyVersionChecker;
