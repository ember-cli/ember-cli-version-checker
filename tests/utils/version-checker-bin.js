'use strict';

module.exports = function buildVersionCheckerBin(addon) {
  return `
    const VersionChecker = require('ember-cli-version-checker');

    const checker = new VersionChecker(${addon});
    const dep = checker.for(process.argv[2]);

    console.log(process.argv[2] + ': ' + dep.version);`;
};
