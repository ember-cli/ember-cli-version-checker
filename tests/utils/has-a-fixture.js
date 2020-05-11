'use strict';

// Create a strict "fake" ember-cli addon
class FakeEmberAddon {
  constructor(addon) {
    this._addon = addon;
    Object.freeze(this);
  }

  get addons() {
    return this._addon.addons;
  }

  get name() {
    return this._addon.name;
  }

  get version() {
    return this._addon.version;
  }

  get pkg() {
    return this._addon._fixture.pkg;
  }

  get root() {
    return this._addon.root;
  }
}

// abstract
module.exports = class HasAFixture {
  constructor(name, version, fixture) {
    this._fixture = fixture;
    this.name = name;
    this.version = version;
    this.addons = [];
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

    this.addons.push(new FakeEmberAddon(addon));

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
    this.addons.push(new FakeEmberAddon(addon));
    return addon;
  }

  dispose() {
    this._fixture.dispose();
  }
};
