'use strict';
const semver = require('semver');
const getProject = require('./get-project');
const resolvePackagePath = require('resolve-package-path');

/*
 * Retrieve the version field from the package.json file contents.
 * NOTE: the callers have already checked that the filePath is not null/undefined.
 */
function getVersionFromJSONFile(filePath) {
  try {
    // Use the require cache to avoid file I/O after first call on a given path.
    let pkg = require(filePath);
    return pkg.version || null;
  } catch (err) {
    // file doesn't exist or is not a file or is not parseable.
    return null;
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
    if (this._jsonPath === undefined) {
      // get the path to the package.json file. resolvePackagePath will
      // return the path or null, never undefined, so we can use that
      // to only resolvePackagePath once.
      let addon = this._parent._addon;
      let basedir = addon.root || getProject(addon).root;
      this._jsonPath = resolvePackagePath(this.name, basedir);
    }

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
    if (!this.isAbove(compareVersion)) {
      if (!message) {
        const parentAddon = this._parent._addon;
        message = `The addon \`${parentAddon.name}\` @ \`${parentAddon.root}\` requires the npm package \`${this.name}\` to be above ${compareVersion}, but you have ${this.version}.`;
      }
      throw new Error(message);
    }
  }
}

for (let method of ['gt', 'lt', 'gte', 'lte', 'eq', 'neq', 'satisfies']) {
  DependencyVersionChecker.prototype[method] = function(range) {
    if (!this.version) {
      return method === 'neq';
    }
    return semver[method](this.version, range);
  };
}

module.exports = DependencyVersionChecker;
