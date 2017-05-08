'use strict';

const assert = require('assert');
const VersionChecker = require('..');
const co = require('co');

const createTempDir = require('broccoli-test-helper').createTempDir;

function buildPackageJSON(name, version) {
  return `{
    "name": "${name}",
    "version": "${version}"
  }`;
}

function buildPackage(name, version) {
  return {
    'package.json': buildPackageJSON(name, version)
  };
}

function buildBowerPackage(name, version, disableBowerVersion) {

  return {
    '.bower.json': disableBowerVersion ? `{"name": "${name}"}` : buildPackageJSON(name, version),
    'bower.json': buildPackageJSON(name, version)
  };
}

describe('ember-cli-version-checker', function() {
  let projectRoot;

  class FakeAddon {
    constructor(project) {
      this.project = project || {
        root: projectRoot.path(),
        bowerDirectory: 'bower_components'
      };
      this.name = 'fake-addon';
    }
  }

  beforeEach(co.wrap(function* () {
    projectRoot = yield createTempDir();
  }));

  describe('VersionChecker#forEmber', function() {
    let addon, checker, projectContents;

    beforeEach(function() {
      projectContents = {
        'bower_components': {
          'ember': buildBowerPackage('ember', '1.13.2')
        },
        'node_modules': {
          'ember-source': buildPackage('ember-source', '2.10.0')
        }
      };

      addon = new FakeAddon();

      checker = new VersionChecker(addon);
    });

    describe('version', function() {
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
        'bower_components': {
          'ember': buildBowerPackage('ember', '1.12.1')
        },
        'node_modules': {
          'ember': buildPackage('ember', '2.0.0')
        }
      });

      addon = new FakeAddon();

      checker = new VersionChecker(addon);
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

    describe('version', function() {
      it('can return a bower version', function() {
        let thing = checker.for('ember', 'bower');

        assert.equal(thing.version, '1.12.1');
      });

      it('can return a fallback bower version for non-tagged releases', function() {
        projectRoot.write({
          'bower_components': {
            'ember': buildBowerPackage('ember', '1.13.2', true)
          }
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
          'bower_components': {
            'ember': buildBowerPackage('ember', '2.3.0-beta.2+41030996', true)
          }
        });

        let thing = checker.for('ember', 'bower');

        assert.equal(thing.isAbove('2.2.0'), true);
      });

      it('returns false on beta releases if version is below the specified range', function() {
        projectRoot.write({
          'bower_components': {
            'ember': buildBowerPackage('ember', '2.3.0-beta.2+41030996', true)
          }
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
        let message = 'The addon `fake-addon` requires the npm package `ember` to be above 999.0.0, but you have 2.0.0.';

        assert.throws(function() {
          thing.assertAbove('999.0.0');
        }, new RegExp(message));
      });

      it('throws an error with the given message if a matching version was not found', function() {
        let message = 'Must use at least Ember CLI 0.1.2 to use xyz feature';
        let thing = checker.for('ember', 'npm');

        assert.throws(function() {
          thing.assertAbove('999.0.0', message);
        }, new RegExp(message));
      });

      it('throws a silent error', function() {
        let message = 'Must use at least Ember CLI 0.1.2 to use xyz feature';
        let thing = checker.for('ember', 'npm');

        assert.throws(function() {
          thing.assertAbove('999.0.0', message);
        },

        function(err) {
          return err.suppressStacktrace;
        });
      });
    });
  });
});
