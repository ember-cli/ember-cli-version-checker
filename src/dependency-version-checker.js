'use strict';
const fs = require('fs');
const semver = require('semver');
const SilentError = require('silent-error');
const getProject = require('./get-project');
const isUniqueInProject = require('./is-unique-in-project');

function getVersionFromJSONFile(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath);

    try {
      return JSON.parse(content).version;
    } catch (exception) {
      return null;
    }
  }
}

/**
 * DependencyVersionChecker
 */
class DependencyVersionChecker {
  constructor(parent, name) {
    this._parent = parent;
    this.name = name;
  }

  get version() {
    if (this._version === undefined && this._jsonPath) {
      this._version = getVersionFromJSONFile(this._jsonPath);
    }

    if (this._version === undefined && this._fallbackJsonPath) {
      this._version = getVersionFromJSONFile(this._fallbackJsonPath);
    }

    return this._version;
  }

  exists() {
    return this.version !== undefined;
  }

  isAbove(compareVersion) {
    if (!this.version) {
      return false;
    }
    return semver.gt(this.version, compareVersion);
  }

  assertAbove(compareVersion, _message) {
    let message = _message;

    if (!message) {
      message = `The addon \`${this._parent._addon.name}\` requires the ${this._type} package \`${this.name}\` to be above ${compareVersion}, but you have ${this.version}.`;
    }

    if (!this.isAbove(compareVersion)) {
      throw new SilentError(message);
    }
  }

  isUnique() {
    return isUniqueInProject(this.name, getProject(this._parent._addon));
  }

  assertUnique(_message) {
    if (!this.isUnique()) {
      let message =
        _message ||
        `[${this._parent._addon.name}] requires unique version of ${this._type} package \`${this.name}\`, but there're multiple. Please resolve \`${this.name}\` to same version.`;
      throw new SilentError(message);
    }
  }
}

let semverMethods = ['gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'satisfies'];
semverMethods.forEach(function(method) {
  DependencyVersionChecker.prototype[method] = function(range) {
    if (!this.version) {
      return method === 'neq';
    }
    return semver[method](this.version, range);
  };
});

module.exports = DependencyVersionChecker;
