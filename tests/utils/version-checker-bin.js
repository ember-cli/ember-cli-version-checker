export default function buildVersionCheckerBin(addon) {
  return `
    import VersionChecker from 'ember-cli-version-checker';

    debugger

    const checker = new VersionChecker(${addon});
    const dep = checker.for(process.argv[2]);

    console.log(process.argv[2] + ': ' + dep.version);`;
};
