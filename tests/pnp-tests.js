'use strict';

const assert = require('assert');
const execSync = require('child_process').execSync;
const Project = require('fixturify-project');
const skipWindows = require('./utils/skip-window');
const buildVersionCheckerBin = require('./utils/version-checker-bin');

class PnPProject extends Project {
  constructor() {
    super(...arguments);
    this.pkg.private = true;
    this.pkg.installConfig = {
      pnp: true,
    };
  }

  toJSON() {
    if (this.name !== 'test-project') {
      return {};
    }

    const json = super.toJSON(...arguments);
    const own = json[this.name];
    delete own['node_modules'];
    return json;
  }
}

skipWindows('with yarn pnp', function() {
  this.timeout(600000);
  let project;
  beforeEach(function() {
    project = new PnPProject('test-project');

    project.addDependency('ember-source-channel-url', '1.1.0');
    project.addDependency('ember-cli-version-checker', `link:${__dirname}/../`);
    project.files['index.js'] = buildVersionCheckerBin(`{
      root: process.cwd(),
      isEmberCLIProject() {},
    }`);

    project.writeSync();

    execSync('yarn', {
      cwd: project.baseDir,
    });
  });

  afterEach(function() {
    project.dispose();
  });

  it('finds packages that are present', function() {
    const result = execSync(
      'node -r ./.pnp.js ./index.js ember-source-channel-url',
      {
        cwd: project.baseDir,
      }
    );

    assert.strictEqual(result.toString(), 'ember-source-channel-url: 1.1.0\n');
  });

  it('does not find packages that are missing', function() {
    const result = execSync('node -r ./.pnp.js ./index.js blah-blah-blah', {
      cwd: project.baseDir,
    });

    assert.strictEqual(result.toString(), 'blah-blah-blah: undefined\n');
  });
});
