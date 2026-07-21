import { Project as FixturifyProject} from 'fixturify-project';

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
export class HasAFixture {
  constructor(name, version, fixture) {
    this._fixture = fixture;
    this.name = name;
    this.version = version;
    this.addons = [];
  }

  get root() {
    return this._fixture.baseDir;
  }

  write(...args) {
    return this._fixture.write(...args);
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
    this._fixture.addDependency(name, version, (fixture) => {
      addon = new Addon(name, version, this, fixture);

      if (typeof cb === 'function') {
        cb(addon);
      }
    });

    this.addons.push(new FakeEmberAddon(addon));

    return addon;
  }

  addDevAddon(name, version, cb) {
    let addon;
    this._fixture.addDevDependency(name, version, (fixture) => {
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


export class Addon extends HasAFixture {
  constructor(name, version, project, fixture) {
    super(name, version, fixture);
    this.project = project;

    Object.freeze(this);
  }
};

export class Project extends HasAFixture {
  constructor(name, version) {
    super(name, version, new FixturifyProject(name, version));
    this.version = version;
    this._addonsInitialized = true;
    Object.freeze(this);
  }
  isEmberCLIProject() {}
};
