'use strict';
const { githubProvider } = require('../desktop/update-controller.cjs');
const pkg = require('../package.json');
const repo = githubProvider(pkg);
if(!repo) {
  console.error('\nERROR: GitHub update repository is not configured.');
  console.error('Run CONFIGURE_GITHUB.bat first, then build the app.');
  process.exit(1);
}
console.log(`Update repository: https://github.com/${repo.owner}/${repo.repo}/releases`);
