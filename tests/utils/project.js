'use strict';

const FixturifyProject = require('fixturify-project');
module.exports = class Project extends require('./has-a-fixture') {
  constructor(name, version) {
    super(name, version, new FixturifyProject(name, version));
    this.version = version;
    this._addonsInitialized = true;
  }
  isEmberCLIProject() {}
};
