import DependencyVersionChecker from './dependency-version-checker.js';
import ProjectWideDependencyChecker from './project-wide-dependency-checker.js';

export default class VersionChecker {
  constructor(addon) {
    this._addon = addon;
  }

  static forProject(project) {
    return new ProjectWideDependencyChecker(project);
  }

  for(name, type) {
    if (type === 'bower') {
      throw new Error(
        '[ember-cli-version-checker] Bower is no longer supported'
      );
    } else {
      return new DependencyVersionChecker(this, name);
    }
  }

  forEmber() {
    throw new Error(
      `[ember-cli-version-checker] 'checker.forEmber' has been removed, please use 'checker.for(\`ember-source\`)'`
    );
  }
};
