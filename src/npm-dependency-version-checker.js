'use strict';

const resolve = require('resolve');
const DependencyVersionChecker = require('./dependency-version-checker');

class NPMDependencyVersionChecker extends DependencyVersionChecker {
  constructor(parent, name, useProject) {
    super(parent, name);

    let addon = this._parent._addon;
    let root;

    if (useProject === true) {
      // User passed in `projectNpm`, so we want to use the project root
      root = addon.project.root;
    } else if (addon.root) {
      // User passed in `npm`, so we want to use the parent addon's root if it exists
      root = addon.root;
    } else if (addon.project) {
      // Parent addon's root doesn't exist, so the parent is an EmberAddon or
      // EmberApp. Use the project's root instead.
      root = addon.project.root;
    } else {
      throw new Error(
        `ember-cli-version-checker could not find NPM package root for ${
          this.name
        }, did you pass an Addon or EmberApp/EmberAddon?`
      );
    }

    let jsonPath;
    try {
      jsonPath = resolve.sync(this.name + '/package.json', {
        basedir: root,
      });
    } catch (e) {
      if (e.code === 'MODULE_NOT_FOUND') {
        jsonPath = null;
      } else {
        throw e;
      }
    }

    this._jsonPath = jsonPath;
    this._type = useProject ? 'project npm' : 'npm';
  }
}

module.exports = NPMDependencyVersionChecker;
