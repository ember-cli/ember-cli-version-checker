'use strict';

module.exports = class Addon extends require('./has-a-fixture') {
  constructor(name, version, project, fixture) {
    super(name, version, fixture);
    this.project = project;

    Object.freeze(this);
  }
};
