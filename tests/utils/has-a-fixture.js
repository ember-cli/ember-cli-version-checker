'use strict';

// abstract
module.exports = class HasAFixture {
  constructor(name, version, fixture) {
    this._fixture = fixture;
    this.name = name;
    this.version = version;
  }

  get root() {
    return this._fixture.baseDir;
  }

  writeSync(...args) {
    return this._fixture.writeSync(...args);
  }

  readSync(...args) {
    return this._fixture.readSync(...args);
  }

  addDependency(...args) {
    return this._fixture.addDependency(...args);
  }

  addDevDependency(...args) {
    return this._fixture.addDevDependency(...args);
  }

  addAddon(name, version, cb) {
    let addon;
    this._fixture.addDependency(name, version, fixture => {
      addon = new (require('./addon'))(name, version, this, fixture);
      if (typeof cb === 'function') {
        cb(addon);
      }
    });
    return addon;
  }

  addDevAddon(name, version, cb) {
    let addon;
    this._fixture.addDevDependency(name, version, fixture => {
      addon = new (require('./addon'))(name, version, this, fixture);
      if (typeof cb === 'function') {
        cb(addon);
      }
    });
    return addon;
  }

  dispose() {
    this._fixture.dispose();
  }
};
