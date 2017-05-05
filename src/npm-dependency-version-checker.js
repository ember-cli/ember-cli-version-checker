'use strict';

const path = require('path');
const DependencyVersionChecker = require('./dependency-version-checker');

class NPMDependencyVersionChecker extends DependencyVersionChecker {
  constructor(parent, name) {
    super(parent, name);

    let addon = this._parent._addon;
    let project = addon.project;
    let nodeModulesPath = project.nodeModulesPath || path.join(project.root, 'node_modules');
    let npmDependencyPath = path.join(nodeModulesPath, this.name);

    this._jsonPath = path.join(npmDependencyPath, 'package.json');
    this._type = 'npm';
  }
}

module.exports = NPMDependencyVersionChecker;
