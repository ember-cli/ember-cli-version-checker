'use strict';
const { EOL } = require('os');

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

        project.addAddon('top', '1.0.0');
        project.addAddon('bar', '3.0.0');
        project.addAddon('fake-addon', '3.0.0', addon => {
          addon.addAddon('foo', '1.0.0');
          addon.addAddon('bar', '2.0.0', addon => {
            addon.addAddon('foo', '1.0.0');
          });
        });
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
        }, / - bar @ .*rsvp.*node_modules.*fake-addon.*node_modules.*bar/);
        assert.throws(() => {
          checker.assertSingleImplementation('bar');
        }, / - bar @ .*rsvp.*node_modules.*bar/);
      });

      it('#hasSingleImplementation detects singleton', function() {
        assert.equal(checker.hasSingleImplementation('foo'), false);
        assert.equal(checker.hasSingleImplementation('top'), true);
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

      it('has a working #filterAddonsByNames', () => {
        const result = checker.filterAddonsByNames([
          'foo',
          'top',
          'never-ever-ever',
        ]);

        assert.deepEqual(Object.keys(result), [
          'foo',
          'top',
          'never-ever-ever',
        ]);

        assert.deepEqual(
          result.foo.map(x => x.name),
          ['foo', 'foo']
        );

        assert.deepEqual(
          result.top.map(x => x.name),
          ['top']
        );

        assert.deepEqual(
          result['never-ever-ever'].map(x => x.name),
          []
        );
      });

      it('#hasSingleImplementation finds duplication and can be fixed by resolution', function() {
        assert.ok(!checker.hasSingleImplementation('bar'));
      });

      it('has a functioning allAddons iterator', function() {
        assert.deepEqual(
          [...checker.allAddons()].map(x => x.name),
          ['ember', 'top', 'bar', 'fake-addon', 'foo', 'bar', 'foo']
        );
      });

      describe('#check', function() {
        it('noop works as expected', function() {
          const checked = checker.check({});
          assert.deepEqual(checked.node_modules, {});
          assert.equal(checked.isSatisfied, true);
          assert.equal(checked.message, '');
        });

        it('is not satisfied if checked deps are missing', function() {
          const checked = checker.check({
            '@ember-cli/no-such-addon--': '*',
            '@ember-cli/no-such-other-addon--': '*',
          });
          assert.deepEqual(checked.node_modules, {
            '@ember-cli/no-such-addon--': {
              versions: [],
              isSatisfied: false,
              message: `'@ember-cli/no-such-addon--' was not found, expected version: [*]`,
            },
            '@ember-cli/no-such-other-addon--': {
              versions: [],
              isSatisfied: false,
              message: `'@ember-cli/no-such-other-addon--' was not found, expected version: [*]`,
            },
          });
          assert.equal(checked.isSatisfied, false);
        });

        it('is not satisfied if checked deps are present but the versions are not satisfied', function() {
          const checked = checker.check({
            top: '2.0.0',
            bar: '4.0.0',
          });
          assert.deepEqual(checked.node_modules, {
            top: {
              versions: ['1.0.0'],
              isSatisfied: false,
              message: `'top' expected version: [2.0.0] but got version: [1.0.0]`,
            },
            bar: {
              versions: ['3.0.0', '2.0.0'],
              isSatisfied: false,
              message: `'bar' expected version: [4.0.0] but got versions: [3.0.0, 2.0.0]`,
            },
          });
          assert.equal(checked.isSatisfied, false);
        });

        it('is not satisfied if checked deps are present but not all versions are not satisfied', function() {
          const checked = checker.check({
            top: '2.0.0',
            bar: '4.0.0',
          });
          assert.deepEqual(checked.node_modules, {
            top: {
              versions: ['1.0.0'],
              isSatisfied: false,
              message: `'top' expected version: [2.0.0] but got version: [1.0.0]`,
            },
            bar: {
              versions: ['3.0.0', '2.0.0'],
              isSatisfied: false,
              message: `'bar' expected version: [4.0.0] but got versions: [3.0.0, 2.0.0]`,
            },
          });
          assert.equal(checked.isSatisfied, false);
        });

        it('is satisfied if all checked deps are present and the versions are satisfied', function() {
          const checked = checker.check({
            top: '1.0.0',
            bar: '>= 2.0.0',
          });

          assert.deepEqual(checked.node_modules, {
            top: {
              versions: ['1.0.0'],
              isSatisfied: true,
              message: '',
            },
            bar: {
              versions: ['3.0.0', '2.0.0'],
              isSatisfied: true,
              message: '',
            },
          });
          assert.equal(checked.isSatisfied, true);
          assert.equal(checked.message, '');
        });

        it('is NOT satisfied with partial match', function() {
          const checked = checker.check({
            top: '1.0.0',
            bar: '>= 2.0.1',
          });

          assert.deepEqual(checked.node_modules, {
            top: {
              versions: ['1.0.0'],
              isSatisfied: true,
              message: '',
            },
            bar: {
              versions: ['3.0.0', '2.0.0'],
              isSatisfied: false,
              message: `'bar' expected version: [>= 2.0.1] but got versions: [3.0.0, 2.0.0]`,
            },
          });
          assert.equal(checked.isSatisfied, false);
        });

        it('is not satisfied if some checked deps are missing', function() {
          const checked = checker.check({
            '@ember-cli/no-such-addon--': '*',
            ember: '*',
          });
          assert.deepEqual(checked.node_modules, {
            '@ember-cli/no-such-addon--': {
              versions: [],
              isSatisfied: false,
              message: `'@ember-cli/no-such-addon--' was not found, expected version: [*]`,
            },
            ember: {
              versions: ['2.0.0'],
              isSatisfied: true,
              message: '',
            },
          });
          assert.equal(checked.isSatisfied, false);
        });

        it('checked.message is a an ok default error message', function() {
          const checked = checker.check({
            '@ember-cli/no-such-addon--': '*',
            ember: '*',
          });
          const message = ` - '@ember-cli/no-such-addon--' was not found, expected version: [*]${EOL}`;
          assert.equal(checked.message, message);
        });

        it('checker has a functioning assert method', function() {
          checker.check({}).assert();

          assert.throws(() => {
            checker
              .check({ '@ember-cli/no-such-addon--': '*', ember: '*' })
              .assert();
          }, /Checker Assertion Failed/);

          assert.throws(() => {
            checker
              .check({ '@ember-cli/no-such-addon--': '*', ember: '*' })
              .assert();
          }, /- '@ember-cli\/no-such-addon--' was not found, expected version: \[\*\]/);

          assert.throws(() => {
            checker
              .check({ '@ember-cli/no-such-addon--': '*', ember: '*' })
              .assert('custom description');
          }, /custom description/);
        });
      });
    });
  });
});
