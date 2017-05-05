'use strict';

var path = require('path');

var DependencyVersionChecker = require('./dependency-version-checker');

class NPMDependencyVersionChecker extends DependencyVersionChecker {
  constructor(parent, name) {
    super(parent, name);

    var addon = this._parent._addon;
    var project = addon.project;
    var nodeModulesPath = project.nodeModulesPath || path.join(project.root, 'node_modules');
    var npmDependencyPath = path.join(nodeModulesPath, this.name);

    this._jsonPath = path.join(npmDependencyPath, 'package.json');
    this._type = 'npm';
  }
}

module.exports = NPMDependencyVersionChecker;
