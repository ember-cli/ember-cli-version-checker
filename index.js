'use strict';

var path = require('path');

var DependencyVersionChecker = require('./src/dependency-version-checker');
var BowerDependencyVersionChecker = require('./src/bower-dependency-version-checker');
var NPMDependencyVersionChecker = require('./src/npm-dependency-version-checker');

function getEmberCLIVersion(addon) {
  if (!addon.project || !addon.project.emberCLIVersion) {
    return null;
  }

  var version = addon.project.emberCLIVersion();

  // remove any meta-data, for dealing with `npm link`'ed ember-cli
  return version.split('-')[0];
}

/**
 * VersionChecker
 */
function VersionChecker(addon) {
  this._addon = addon;
}

VersionChecker.prototype.for = function(name, type) {
  if (type === 'bower') {
    return new BowerDependencyVersionChecker(this, name);
  } else if (type === 'npm') {
    return new NPMDependencyVersionChecker(this, name);
  }
};

VersionChecker.prototype.forEmber = function() {
  var emberVersionChecker = this.for('ember-source', 'npm');

  if (emberVersionChecker.version) {
    return emberVersionChecker;
  }

  return this.for('ember', 'bower');
};

/**
 * EmberCLIDependencyVersionChecker
 */
function EmberCLIDependencyVersionChecker(addon) {
  // intentially not calling _super here
  this._version = getEmberCLIVersion(addon);
  this._type = 'npm';
}
EmberCLIDependencyVersionChecker.prototype = Object.create(DependencyVersionChecker.prototype);

/**
 * Backwards compatibility class methods
 *
 * They compare the version of ember-cli only.
 */
VersionChecker.isAbove = function deprecatedIsAbove(addon, comparisonVersion) {
  var dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

  return dependencyChecker.satisfies('>=' + comparisonVersion);
};

VersionChecker.satisfies = function deprecatedSatisfies(addon, comparison) {
  var dependencyChecker = new EmberCLIDependencyVersionChecker(addon);

  return dependencyChecker.satisfies(comparison);
};
VersionChecker.assertAbove = function deprecatedAssertAbove(addon, comparisonVersion, _message) {
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
};

module.exports = VersionChecker;
