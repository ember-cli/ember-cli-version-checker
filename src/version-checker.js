'use strict';

/* eslint-env node */

const BowerDependencyVersionChecker = require('./bower-dependency-version-checker');
const NPMDependencyVersionChecker = require('./npm-dependency-version-checker');

class VersionChecker {
  constructor(addon) {
    this._addon = addon;
  }

  for(name, type) {
    if (type === 'bower') {
      return new BowerDependencyVersionChecker(this, name);
    } else if (type === 'projectNpm') {
      return new NPMDependencyVersionChecker(this, name, true);
    } else {
      return new NPMDependencyVersionChecker(this, name);
    }
  }

  forEmber() {
    let emberVersionChecker = this.for('ember-source', 'projectNpm');

    if (emberVersionChecker.version) {
      return emberVersionChecker;
    }

    return this.for('ember', 'bower');
  }
}

module.exports = VersionChecker;
