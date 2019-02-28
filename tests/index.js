'use strict';

/* eslint-env mocha, node */

const assert = require('assert');
const VersionChecker = require('..');
const co = require('co');
const execSync = require('child_process').execSync;
const semver = require('semver');

const createTempDir = require('broccoli-test-helper').createTempDir;
const ROOT = process.cwd();

function buildPackageJSON(name, version) {
  return `{
    "name": "${name}",
    "version": "${version}"
  }`;
}

function buildPackage(name, version) {
  return {
    'package.json': buildPackageJSON(name, version),
  };
}

function buildBowerPackage(name, version, disableBowerVersion) {
  return {
    '.bower.json': disableBowerVersion
      ? `{"name": "${name}"}`
      : buildPackageJSON(name, version),
    'bower.json': buildPackageJSON(name, version),
  };
}

function buildVersionCheckerBin(addon) {
  return `
    const VersionChecker = require('ember-cli-version-checker');

    let checker = new VersionChecker(${addon});

    let dep = checker.for(process.argv[2]);
    console.log(process.argv[2] + ': ' + dep.version);`;
}

describe('ember-cli-version-checker', function() {
  let projectRoot;

  class FakeProject {
    constructor() {
      this.root = projectRoot.path();
      this.bowerDirectory = 'bower_components';
    }

    isEmberCLIProject() {}
  }

  class FakeAddon {
    constructor() {
      this.project = new FakeProject();
      this.root = projectRoot.path('node_modules/fake-addon');
      this.name = 'fake-addon';
    }
  }

  beforeEach(
    co.wrap(function*() {
      projectRoot = yield createTempDir();
    })
  );

  afterEach(
    co.wrap(function*() {
      yield projectRoot.dispose();
    })
  );

  for (let scenario of ['addon', 'project']) {
    describe(`with ${scenario}`, function() {
      let FakeClass = scenario === 'addon' ? FakeAddon : FakeProject;

      describe('VersionChecker#forEmber', function() {
        let addon, checker, projectContents;

        beforeEach(function() {
          projectContents = {
            bower_components: {
              ember: buildBowerPackage('ember', '1.13.2'),
            },
            node_modules: {
              'ember-source': buildPackage('ember-source', '2.10.0'),
            },
          };

          addon = new FakeClass();

          checker = new VersionChecker(addon);
        });

        describe('version', function() {
          if (scenario === 'addon') {
            it('checks the project not the addon', function() {
              projectContents.node_modules['fake-addon'] = {
                node_modules: {
                  'ember-source': buildPackage('ember-source', '3.1.0'),
                },
              };
              projectRoot.write(projectContents);
              let thing = checker.forEmber();
              assert.equal(thing.version, '2.10.0');
            });
          }

          it('returns the bower version if ember-source is not present in npm', function() {
            delete projectContents['node_modules'];
            projectRoot.write(projectContents);

            let thing = checker.forEmber();
            assert.equal(thing.version, '1.13.2');
          });

          it('returns the ember-source version before looking for ember in bower', function() {
            projectRoot.write(projectContents);
            let thing = checker.forEmber();
            assert.equal(thing.version, '2.10.0');
          });
        });
      });

      describe('VersionChecker#for', function() {
        let addon, checker;
        beforeEach(function() {
          projectRoot.write({
            bower_components: {
              ember: buildBowerPackage('ember', '1.12.1'),
            },
            node_modules: {
              ember: buildPackage('ember', '2.0.0'),
            },
          });

          addon = new FakeClass();

          checker = new VersionChecker(addon);
        });

        afterEach(function() {
          return projectRoot.dispose();
        });

        describe('nested packages', function() {
          it('finds nested packages from the current addons root', function() {
            projectRoot.write({
              node_modules: {
                bar: buildPackage('bar', '3.0.0'),
                'fake-addon': {
                  node_modules: {
                    bar: buildPackage('bar', '2.0.0'),
                  },
                },
              },
            });

            addon.root = projectRoot.path('node_modules/fake-addon');

            let thing = checker.for('bar');

            assert.equal(thing.version, '2.0.0');
          });

          if (scenario === 'addon') {
            it('falls back to the project root for instances of `EmberAddon` that do not have a `root` property', function() {
              projectRoot.write({
                node_modules: {
                  bar: buildPackage('bar', '3.0.0'),
                  'fake-addon': {},
                },
              });

              delete addon.root;

              let thing = checker.for('bar');

              assert.equal(thing.version, '3.0.0');
            });
          }
        });

        describe('specified type', function() {
          it('defaults to `npm`', function() {
            let thing = checker.for('ember');

            assert.equal(thing.version, '2.0.0');
          });

          it('allows `bower`', function() {
            let thing = checker.for('ember', 'bower');

            assert.equal(thing.version, '1.12.1');
          });
        });

        describe('exists', function() {
          it('returns true when present', function() {
            let thing = checker.for('ember');
            assert.ok(thing.exists());
          });

          it('returns false when not present', function() {
            let thing = checker.for('rando-thing-here');

            assert.ok(!thing.exists());
          });
        });

        describe('version', function() {
          it('can return a bower version', function() {
            let thing = checker.for('ember', 'bower');

            assert.equal(thing.version, '1.12.1');
          });

          it('can return a fallback bower version for non-tagged releases', function() {
            projectRoot.write({
              bower_components: {
                ember: buildBowerPackage('ember', '1.13.2', true),
              },
            });

            let thing = checker.for('ember', 'bower');

            assert.equal(thing.version, '1.13.2');
          });

          it('can return a npm version', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.version, '2.0.0');
          });

          it('does not exist in bower_components', function() {
            let thing = checker.for('does-not-exist-dummy', 'bower');

            assert.equal(thing.version, null);
          });

          it('does not exist in nodeModulesPath', function() {
            let thing = checker.for('does-not-exist-dummy', 'npm');

            assert.equal(thing.version, null);
          });
        });

        describe('satisfies', function() {
          it('returns true if version is included within range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.satisfies('>= 0.0.1'), true);
          });

          it('returns false if version is not included within range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.satisfies('>= 99.0.0'), false);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('derp', 'npm');

            assert.equal(thing.satisfies('>= 2.9'), false);
          });
        });

        describe('isAbove', function() {
          it('returns true if version is above the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.isAbove('0.0.1'), true);
          });

          it('returns false if version is below the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.isAbove('99.0.0'), false);
          });

          it('returns true on beta releases if version is above the specified range', function() {
            projectRoot.write({
              bower_components: {
                ember: buildBowerPackage(
                  'ember',
                  '2.3.0-beta.2+41030996',
                  true
                ),
              },
            });

            let thing = checker.for('ember', 'bower');

            assert.equal(thing.isAbove('2.2.0'), true);
          });

          it('returns false on beta releases if version is below the specified range', function() {
            projectRoot.write({
              bower_components: {
                ember: buildBowerPackage(
                  'ember',
                  '2.3.0-beta.2+41030996',
                  true
                ),
              },
            });

            let thing = checker.for('ember', 'bower');

            assert.equal(thing.isAbove('2.3.0'), false);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('derpy-herpy', 'npm');

            assert.equal(thing.isAbove('2.9.0'), false);
          });
        });

        describe('gt', function() {
          it('returns true if version is above the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.gt('0.0.1'), true);
            assert.equal(thing.gt('1.9.9'), true);
          });

          it('returns false if version is below the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.gt('2.0.0'), false);
            assert.equal(thing.gt('99.0.0'), false);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('zooeory', 'npm');

            assert.equal(thing.gt('2.9.0'), false);
          });
        });

        describe('lt', function() {
          it('returns false if version is above the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.lt('0.0.1'), false);
            assert.equal(thing.lt('2.0.0'), false);
          });

          it('returns true if version is below the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.lt('2.0.1'), true);
            assert.equal(thing.lt('99.0.0'), true);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('asdfasdf', 'npm');

            assert.equal(thing.lt('2.9.0'), false);
          });
        });

        describe('gte', function() {
          it('returns true if version is above the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.gte('0.0.1'), true);
            assert.equal(thing.gte('2.0.0'), true);
          });

          it('returns false if version is below the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.gte('2.0.1'), false);
            assert.equal(thing.gte('99.0.0'), false);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('hahaha', 'npm');

            assert.equal(thing.gte('2.9.0'), false);
          });
        });

        describe('lte', function() {
          it('returns false if version is above the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.lte('0.0.1'), false);
            assert.equal(thing.lte('1.9.9'), false);
          });

          it('returns true if version is below the specified range', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.lte('2.0.0'), true);
            assert.equal(thing.lte('99.0.0'), true);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('lolz', 'npm');

            assert.equal(thing.lte('2.9.0'), false);
          });
        });

        describe('eq', function() {
          it('returns false if version does not match other version', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.eq('0.0.1'), false);
            assert.equal(thing.eq('1.9.9'), false);
            assert.equal(thing.eq('2.0.0-beta.1'), false);
            assert.equal(thing.eq('2.0.1'), false);
          });

          it('returns true if version matches other version', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.eq('2.0.0'), true);
          });

          it('returns false if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('not-here', 'npm');

            assert.equal(thing.eq('2.9.0'), false);
          });
        });

        describe('neq', function() {
          it('returns true if version does not match other version', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.neq('0.0.1'), true);
            assert.equal(thing.neq('1.9.9'), true);
            assert.equal(thing.neq('2.0.0-beta.1'), true);
            assert.equal(thing.neq('2.0.1'), true);
          });

          it('returns false if version matches other version', function() {
            let thing = checker.for('ember', 'npm');

            assert.equal(thing.neq('2.0.0'), false);
          });

          it('returns true if the dependency does not exist', function() {
            checker = new VersionChecker(addon);
            let thing = checker.for('not-here', 'npm');

            assert.equal(thing.neq('2.9.0'), true);
          });
        });

        describe('assertAbove', function() {
          it('throws an error with a default message if a matching version was not found', function() {
            let thing = checker.for('ember', 'npm');
            let message =
              'The addon `.*` requires the npm package `ember` to be above 999.0.0, but you have 2.0.0.';

            assert.throws(function() {
              thing.assertAbove('999.0.0');
            }, new RegExp(message));
          });

          it('throws an error with the given message if a matching version was not found', function() {
            let message =
              'Must use at least Ember CLI 0.1.2 to use xyz feature';
            let thing = checker.for('ember', 'npm');

            assert.throws(function() {
              thing.assertAbove('999.0.0', message);
            }, new RegExp(message));
          });

          it('throws a silent error', function() {
            let message =
              'Must use at least Ember CLI 0.1.2 to use xyz feature';
            let thing = checker.for('ember', 'npm');

            assert.throws(
              function() {
                thing.assertAbove('999.0.0', message);
              },

              function(err) {
                return err.suppressStacktrace;
              }
            );
          });
        });
      });
    });
  }

  if (semver.gte(process.versions.node, '8.0.0')) {
    describe('with yarn pnp', function() {
      this.timeout(600000);

      beforeEach(function() {
        process.chdir(projectRoot.path());

        projectRoot.write({
          'package.json': JSON.stringify({
            private: true,
            name: 'test-project',
            version: '0.0.0',
            dependencies: {
              'ember-source-channel-url': '1.1.0',
              'ember-cli-version-checker': `link:${ROOT}`,
            },
            installConfig: {
              pnp: true,
            },
          }),
          'index.js': buildVersionCheckerBin(`{
            root: process.cwd(),
            isEmberCLIProject() {},
          }`),
        });

        execSync('yarn');
      });

      afterEach(function() {
        process.chdir(ROOT);
      });

      it('finds packages that are present', function() {
        let result = execSync(
          'node -r ./.pnp.js ./index.js ember-source-channel-url'
        );

        assert.strictEqual(
          result.toString(),
          'ember-source-channel-url: 1.1.0\n'
        );
      });

      it('does not find packages that are missing', function() {
        let result = execSync('node -r ./.pnp.js ./index.js blah-blah-blah');

        assert.strictEqual(result.toString(), 'blah-blah-blah: undefined\n');
      });
    });
  }

  describe('with yarn workspace', function() {
    this.timeout(600000);

    beforeEach(function() {
      process.chdir(projectRoot.path());

      projectRoot.write({
        'package.json': JSON.stringify({
          private: true,
          name: 'test-project',
          workspaces: ['app', 'addon'],
        }),
        addon: {
          'dummy.js': buildVersionCheckerBin(`{
            project: {
              root: '${projectRoot.path('addon')}',
            },
          }`),
          node_modules: {
            bar: buildPackage('bar', '3.0.0'),
          },
        },
        app: {
          'index.js': buildVersionCheckerBin(`{
            root: process.cwd(),
            isEmberCLIProject() {},
          }`),
        },
        node_modules: {
          'ember-cli-version-checker': `module.exports = require('${ROOT}');`,
          bar: buildPackage('bar', '2.0.0'),
        },
      });
    });

    afterEach(function() {
      process.chdir(ROOT);
    });

    // https://github.com/ember-cli/ember-cli-version-checker/issues/70
    it('uses the sub-package local version over the hoisted version for addon dummy apps', function() {
      process.chdir(projectRoot.path('addon'));
      let result = execSync('node ./dummy.js bar');

      assert.strictEqual(result.toString(), 'bar: 3.0.0\n');
    });

    it('uses the hoisted version, if there is no package local version', function() {
      process.chdir(projectRoot.path('app'));
      let result = execSync('node ./index.js bar');

      assert.strictEqual(result.toString(), 'bar: 2.0.0\n');
    });

    it('does not find packages that are missing', function() {
      process.chdir(projectRoot.path('app'));
      let result = execSync('node ./index.js blah-blah-blah');

      assert.strictEqual(result.toString(), 'blah-blah-blah: undefined\n');
    });
  });
});
