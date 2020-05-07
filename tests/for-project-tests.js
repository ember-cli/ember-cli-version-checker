'use strict';

/* eslint-env mocha, node */

const assert = require('assert');
const VersionChecker = require('..');

function isObject(x) {
  return typeof x === 'object' && x !== null;
}

describe('ember-cli-version-checker', function() {
  describe('VersionChecker.forProject', function() {
    it('errors if given a project without initialized addons', function() {
      assert.throws(() => {
        VersionChecker.forProject();
      }, /forProject must be provided an ember-cli project class/);

      assert.throws(() => {
        VersionChecker.forProject(null);
      }, /forProject must be provided an ember-cli project class/);

      assert.throws(() => {
        VersionChecker.forProject({});
      }, /forProject must be provided an ember-cli project class/);

      assert.throws(() => {
        VersionChecker.forProject({ isEmberCLIProject() {} });
      }, /forProject must be provided an project instance who's addons have been initialized./);

      VersionChecker.forProject({
        isEmberCLIProject() {},
        _addonsInitialized: true,
      });
    });

    let project;
    beforeEach(function() {
      const FakeProject = require('./utils/project');
      project = new FakeProject('rsvp', '3.1.4');
      project.addAddon('ember', '2.0.0');
      project.writeSync();
    });

    describe('Multiple instances check', function() {
      let checker;

      beforeEach(function() {
        const FakeProject = require('./utils/project');
        project = new FakeProject('rsvp', '3.1.4');
        project.addAddon('ember', '2.0.0');

        project.writeSync();
        checker = VersionChecker.forProject(project);

        project.addDependency('top', '1.0.0');
        project.addDependency('bar', '3.0.0');
        project.addAddon('fake-addon', '3.0.0', addon => {
          addon.addDependency('foo', '1.0.0');
          addon.addDependency('bar', '2.0.0');
        });

        project.addons = [
          { name: 'top', root: 'node_modules/top' },
          { name: 'bar', root: 'node_modules/bar' },
          {
            name: 'fake-addon',
            root: 'node_modules/fake-addon',
            addons: [
              {
                name: 'foo',
                root: 'node_modules/fake-addon/node_modules/foo',
              },
              {
                name: 'bar',
                root: 'node_modules/fake-addon/node_modules/bar',
                addons: [
                  {
                    name: 'foo',
                    root: 'node_modules/fake-addon/node_modules/foo',
                  },
                ],
              },
            ],
          },
        ];
      });

      it('validates VersionChecker.forProject throws unless given a project', function() {
        assert.throws(() => {
          VersionChecker.forProject({});
        }, /forProject must be provided an ember-cli project class/);
      });

      it('#assertSingleImplementation throws correctly', function() {
        assert.throws(() => {
          checker.assertSingleImplementation('--no-such-addon--');
        }, /This project requires a single implementation version of the npm package `--no-such-addon--`, but none where found./);
        assert.throws(() => {
          checker.assertSingleImplementation('bar');
        }, /This project requires a single implementation version of the npm package `bar`, but there're multiple. Please resolve `bar` to same version./);
        assert.throws(() => {
          checker.assertSingleImplementation('bar');
        }, / - bar @ node_modules\/fake-addon\/node_modules\/bar/);
        assert.throws(() => {
          checker.assertSingleImplementation('bar');
        }, / - bar @ node_modules\/bar/);
      });

      it('#hasSingleImplementation detects singleton', function() {
        assert.ok(checker.hasSingleImplementation('foo'));
        assert.ok(checker.hasSingleImplementation('top'));
      });

      it('has a working #filterAddonsByName', () => {
        assert.equal(checker.filterAddonsByName('foo').length, 2);
        assert.equal(checker.filterAddonsByName('top').length, 1);
        assert.equal(checker.filterAddonsByName('bar').length, 2);
        assert.equal(checker.filterAddonsByName('never-ever-ever').length, 0);
        assert.equal(
          checker.filterAddonsByName('bar').filter(isObject).length,
          2
        );
      });

      it('#hasSingleImplementation finds duplication and can be fixed by resolution', function() {
        assert.ok(!checker.hasSingleImplementation('bar'));
      });

      it('has a functioning allAddons iterator', function() {
        assert.deepEqual(
          [...checker.allAddons()].map(x => x.name),
          ['top', 'bar', 'fake-addon', 'foo', 'bar', 'foo']
        );
      });
    });
  });
});
