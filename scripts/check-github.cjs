'use strict';
const { githubProvider } = require('../desktop/update-controller.cjs');
const pkg = require('../package.json');
const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve(__dirname,'../desktop/release-config.json');
const config=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
const repo = githubProvider(pkg,config);
const source = githubProvider(pkg);
if(!repo) {
  console.error('\nERROR: GitHub update repository is not configured.');
  console.error('Run CONFIGURE_GITHUB.bat first, then build the app.');
  process.exit(1);
}
if(!source||source.owner!==repo.owner||source.repo!==repo.repo){
  console.error('ERROR: desktop/release-config.json and package.json do not match.');
  console.error('Run CONFIGURE_GITHUB.bat and commit both files.');
  process.exit(1);
}
console.log(`Update repository: https://github.com/${repo.owner}/${repo.repo}/releases`);
console.log('Packaged runtime feed: desktop/release-config.json');
