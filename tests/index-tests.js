'use strict';

/* eslint-env mocha, node */

const assert = require('assert');
const VersionChecker = require('..');

describe('ember-cli-version-checker', function() {
  describe('VersionChecker#forEmber', function() {
    it('has been removed', function() {
      const checker = new VersionChecker({});
      assert.throws(
        () => checker.forEmber(),
        /'checker.forEmber' has been removed/
      );
    });
  });

  describe('VersionChecker#for', function() {
    let addon, checker, project;

    beforeEach(function() {
      const FakeProject = require('./utils/project');
      project = new FakeProject('rsvp', '3.1.4');
      project.addAddon('ember', '2.0.0');

      addon = project.addAddon('rsvp');
      project.writeSync();
      checker = new VersionChecker(addon);
    });

    describe('nested packages', function() {
      it('finds nested packages from the current addons root', function() {
        let fakeAddon;
        project.addAddon('bar', '3.0.0', addon => {
          fakeAddon = addon.addAddon('fake-addon', '3.3.3', addon => {
            addon.addAddon('bar', '2.0.0');
          });
        });

        project.writeSync();

        assert.equal(new VersionChecker(fakeAddon).for('bar').version, '2.0.0');
        assert.equal(new VersionChecker(addon).for('bar').version, '3.0.0');
      });

      it('falls back to the project root for instances of `EmberAddon` that do not have a `root` property', function() {
        project.addAddon('bar', '3.0.0', addon => {
          addon.addAddon('fake-addon', '4.0.0');
        });

        project.writeSync();
        // silly situation, where dummy app addons may not have a root.
        delete addon.root;

        assert.equal(new VersionChecker(addon).for('bar').version, '3.0.0');
      });
    });

    describe('specified type', function() {
      it('defaults to `npm`', function() {
        let thing = checker.for('ember');

        assert.equal(thing.version, '2.0.0');
      });

      it('throws if `bower` is used, as it is no longer supported', function() {
        assert.throws(
          () => checker.for('ember', 'bower'),
          /Bower is no longer supported/
        );
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
      it('can return a npm version', function() {
        let thing = checker.for('ember', 'npm');

        assert.equal(thing.version, '2.0.0');
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
        let checker = new VersionChecker(addon);
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

      it('returns false if the dependency does not exist', function() {
        let checker = new VersionChecker(addon);
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
        let checker = new VersionChecker(addon);
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
        let thing = checker.for('not-here', 'npm');

        assert.equal(thing.neq('2.9.0'), true);
      });
    });

    describe('assertAbove', function() {
      it('throws an error with a default message if a matching version was not found', function() {
        let thing = checker.for('ember', 'npm');
        let message =
          'The addon `.*` requires the npm package `ember` to be above 999.0.0, but you have 2.0.0.';

        assert.throws(() => {
          thing.assertAbove('999.0.0');
        }, new RegExp(message));
      });

      it('throws an error with the given message if a matching version was not found', function() {
        let message = 'Must use at least Ember CLI 0.1.2 to use xyz feature';
        let thing = checker.for('ember', 'npm');

        assert.throws(() => {
          thing.assertAbove('999.0.0', message);
        }, new RegExp(message));
      });
    });
  });
});
