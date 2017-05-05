'use strict';

var path = require('path');

var BowerDependencyVersionChecker = require('./bower-dependency-version-checker');
var NPMDependencyVersionChecker = require('./npm-dependency-version-checker');
var EmberCLIDependencyVersionChecker = require('./ember-cli-dependency-version-checker');

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
    var emberVersionChecker = this.for('ember-source', 'npm');

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
    var dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

    return dependencyChecker.satisfies('>=' + comparisonVersion);
  }

  static satisfies(addon, comparison) {
    var dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

    return dependencyChecker.satisfies(comparison);
  }

  static assertAbove(addon, comparisonVersion, _message) {
    var dependencyChecker = new EmberCLIDependencyVersionChecker(addon);
    var comparison = '>= ' + comparisonVersion;
    var message = _message;

    if (!message) {
      message = 'The addon `' + addon.name + '` requires an Ember CLI version of ' + comparisonVersion +
        ' or above, but you are running ' + dependencyChecker.version + '.';
    }

    if (!dependencyChecker.satisfies(comparison)) {
      var error  = new Error(message);

      error.suppressStacktrace = true;
      throw error;
    }
  }
}

module.exports = VersionChecker;
