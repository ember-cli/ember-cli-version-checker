'use strict';

const assert = require('assert');
const skipWindows = require('./utils/skip-window');
const buildVersionCheckerBin = require('./utils/version-checker-bin');
const Project = require('fixturify-project');
const execSync = require('child_process').execSync;

skipWindows('with yarn workspace', function() {
  this.timeout(600000);

  let project;
  beforeEach(function() {
    project = new Project('test-project');
    project.workspaces = ['app', 'addon'];

    project.addDependency('bar', '2.0.0');
    project.addDependency('ember-cli-version-checker', `link:${__dirname}/../`);
    project.files['index.js'] = buildVersionCheckerBin(`{
      root: process.cwd(),
      isEmberCLIProject() {},
    }`);

    project.files.app = {
      'index.js': buildVersionCheckerBin(`{
        root: process.cwd(),
        isEmberCLIProject() {},
      }`),
    };

    const theAddon = new Project('the-addon', '0.0.0');
    theAddon.addDependency('bar', `link:${__dirname}/../`);
    theAddon.files['dummy.js'] = buildVersionCheckerBin(`{
      project: {
        root: '${project.baseDir}/addon',
      },
    }`);

    project.writeSync();

    execSync('yarn', {
      cwd: project.baseDir,
    });

    execSync('yarn', {
      cwd: project.baseDir + '/addon',
    });
  });

  afterEach(function() {
    project.dispose();
  });

  // https://github.com/ember-cli/ember-cli-version-checker/issues/70
  it('uses the sub-package local version over the hoisted version for addon dummy apps', function() {
    const result = execSync('node ./dummy.js bar', {
      cwd: project.baseDir + '/addon/',
    });

    assert.strictEqual(result.toString(), 'bar: 3.0.0\n');
  });

  it('uses the hoisted version, if there is no package local version', function() {
    const result = execSync('node ./index.js bar', {
      cwd: project.baseDir + '/app/',
    });

    assert.strictEqual(result.toString(), 'bar: 2.0.0\n');
  });

  it('does not find packages that are missing', function() {
    const result = execSync('node ./index.js blah-blah-blah', {
      cwd: project.baseDir + '/app/',
    });

    assert.strictEqual(result.toString(), 'blah-blah-blah: undefined\n');
  });
});
