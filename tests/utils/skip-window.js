'use strict';

// There are some issues with PNP + workspaces on windows that will require debugging
// https://github.com/ember-cli/ember-cli-version-checker/issues/100
module.exports = process.platform.includes('win32') ? describe.skip : describe;
