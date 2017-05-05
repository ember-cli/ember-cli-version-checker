'use strict';

const assert = require('assert');
const VersionChecker = require('..');
const lodash = require('lodash');

describe('ember-cli-version-checker', function() {
  function FakeAddonAtVersion(version, projectProperties) {
    this.name = 'fake-addon';
    this.project = lodash.assign({}, {
      emberCLIVersion: function() {
        return version;
      }
    }, projectProperties);
  }

  describe('VersionChecker#forEmber', function() {
    let addon, checker;
    beforeEach(function() {
      addon = new FakeAddonAtVersion('1.0.0', {
        root: 'tests/fixtures',
        bowerDirectory: 'bower-2',
        nodeModulesPath: 'tests/fixtures/npm-3'
      });

      checker = new VersionChecker(addon);
    });

    describe('version', function() {
      it('returns the bower version if ember-source is not present in npm', function() {
        addon.project.nodeModulesPath = 'tests/fixtures/npm-1';
        let thing = checker.forEmber();
        assert.equal(thing.version, '1.13.2');
      });

      it('returns the ember-source version before looking for ember in bower', function() {
        let thing = checker.forEmber();
        assert.equal(thing.version, '2.10.0');
      });
    });
  });

  describe('VersionChecker#for', function() {
    let addon, checker;
    beforeEach(function() {
      addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
        root: 'tests/fixtures',
        bowerDirectory: 'bower-1',
        nodeModulesPath: 'tests/fixtures/npm-1'
      });

      checker = new VersionChecker(addon);
    });

    describe('version', function() {
      it('can return a bower version', function() {
        let thing = checker.for('ember', 'bower');

        assert.equal(thing.version, '1.12.1');
      });

      it('can return a fallback bower version for non-tagged releases', function() {
        addon.project.bowerDirectory = 'bower-2';

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon.project.bowerDirectory = 'bower-3';

        let thing = checker.for('ember', 'bower');

        assert.equal(thing.isAbove('2.2.0'), true);
      });

      it('returns false on beta releases if version is below the specified range', function() {
        addon.project.bowerDirectory = 'bower-3';

        let thing = checker.for('ember', 'bower');

        assert.equal(thing.isAbove('2.3.0'), false);
      });

      it('returns false if the dependency does not exist', function() {
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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
        addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85', {
          root: 'tests/fixtures',
          bowerDirectory: 'bower-2',
          nodeModulesPath: 'tests/fixtures/npm-2'
        });

        checker = new VersionChecker(addon);
        let thing = checker.for('ember-source', 'npm');

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

  describe('VersionChecker#isAbove', function() {
    it('handles metadata after version number', function() {
      let addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85');

      assert.ok(VersionChecker.isAbove(addon, '0.0.0'));

      addon = new FakeAddonAtVersion('0.1.15-addon-discovery-752a419d85');

      assert.ok(!VersionChecker.isAbove(addon, '100.0.0'));
    });

    it('does not error if addon does not have `project`', function() {
      let addon = {};

      assert.ok(!VersionChecker.isAbove(addon, '0.0.0'));
    });

    it('`0.0.1` should be above `0.0.0`', function() {
      let addon = new FakeAddonAtVersion('0.0.1');

      assert.ok(VersionChecker.isAbove(addon, '0.0.0'));
    });

    it('`0.1.0` should be above `0.0.46`', function() {
      let addon = new FakeAddonAtVersion('0.1.0');

      assert.ok(VersionChecker.isAbove(addon, '0.0.46'));
    });

    it('`0.1.1` should be above `0.1.0`', function() {
      let addon = new FakeAddonAtVersion('0.1.1');

      assert.ok(VersionChecker.isAbove(addon, '0.1.0'));
    });

    it('`1.0.0` should be above `0.1.0`', function() {
      let addon = new FakeAddonAtVersion('1.0.0');

      assert.ok(VersionChecker.isAbove(addon, '0.1.0'));
    });

    it('`0.1.0` should be below `1.0.0`', function() {
      let addon = new FakeAddonAtVersion('0.1.0');

      assert.ok(!VersionChecker.isAbove(addon, '1.0.0'));
    });

    it('`0.1.0` should be below `0.1.2`', function() {
      let addon = new FakeAddonAtVersion('0.1.0');

      assert.ok(!VersionChecker.isAbove(addon, '0.1.2'));
    });
  });

  describe('VersionChecker#assertAbove', function() {
    it('throws an error with a default message if a matching version was not found', function() {
      let addon = new FakeAddonAtVersion('0.1.0');
      let message = 'The addon `fake-addon` requires an Ember CLI version of 0.1.2 or above, but you are running 0.1.0.';

      assert.throws(function() {
        VersionChecker.assertAbove(addon, '0.1.2',message);
      }, new RegExp(message));
    });

    it('throws an error with the given message if a matching version was not found', function() {
      let addon = new FakeAddonAtVersion('0.1.0');
      let message = 'Must use at least Ember CLI 0.1.2 to use xyz feature';

      assert.throws(function() {
        VersionChecker.assertAbove(addon, '0.1.2',message);
      }, new RegExp(message));
    });

    it('throws a silent error', function() {
      let addon = new FakeAddonAtVersion('0.1.0');
      let message = 'Must use at least Ember CLI 0.1.2 to use xyz feature';

      assert.throws(function() {
        VersionChecker.assertAbove(addon, '0.1.2',message);
      },

      function(err) {
        return err.suppressStacktrace;
      });
    });
  });
});
