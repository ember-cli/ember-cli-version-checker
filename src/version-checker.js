'use strict';

const path = require('path');

const BowerDependencyVersionChecker = require('./bower-dependency-version-checker');
const NPMDependencyVersionChecker = require('./npm-dependency-version-checker');
const EmberCLIDependencyVersionChecker = require('./ember-cli-dependency-version-checker');

class VersionChecker {
  constructor(addon) {
    this._addon = addon;
  }

  for(name, type) {
    if (type === 'bower') {
      return new BowerDependencyVersionChecker(this, name);
    } else if (type === 'npm') {
      return new NPMDependencyVersionChecker(this, name);
    }
  }

  forEmber() {
    let emberVersionChecker = this.for('ember-source', 'npm');

    if (emberVersionChecker.version) {
      return emberVersionChecker;
    }

    return this.for('ember', 'bower');
  }

  /**
   * Backwards compatibility class methods
   *
   * They compare the version of ember-cli only.
   */
  static isAbove(addon, comparisonVersion) {
    let dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

    return dependencyChecker.satisfies('>=' + comparisonVersion);
  }

  static satisfies(addon, comparison) {
    let dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

    return dependencyChecker.satisfies(comparison);
  }

  static assertAbove(addon, comparisonVersion, _message) {
    let dependencyChecker = new EmberCLIDependencyVersionChecker(addon);
    let comparison = '>= ' + comparisonVersion;
    let message = _message;

    if (!message) {
      message = 'The addon `' + addon.name + '` requires an Ember CLI version of ' + comparisonVersion +
        ' or above, but you are running ' + dependencyChecker.version + '.';
    }

    if (!dependencyChecker.satisfies(comparison)) {
      let error  = new Error(message);

      error.suppressStacktrace = true;
      throw error;
    }
  }
}

module.exports = VersionChecker;
