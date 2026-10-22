#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline/promises');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'package.json');
const isValid=s=>/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(s)&&s!=='.'&&s!=='..';
function configure(owner,repo){
  if(!isValid(owner)||!isValid(repo))throw new Error('GitHub owner/repository 이름에 사용할 수 없는 문자가 있습니다.');
  const json=JSON.parse(fs.readFileSync(file,'utf8'));
  json.repository={type:'git',url:`https://github.com/${owner}/${repo}.git`};
  json.build.publish={provider:'github',owner,repo,releaseType:'release'};
  fs.writeFileSync(file,JSON.stringify(json,null,2)+'\n','utf8');
  // Ship an explicit update feed alongside the runtime code. Build metadata
  // may be removed from packaged package.json by electron-builder.
  fs.writeFileSync(path.join(root,'desktop','release-config.json'),JSON.stringify({provider:'github',owner,repo},null,2)+'\n','utf8');
  console.log(`\nGitHub Releases 설정 완료: https://github.com/${owner}/${repo}/releases`);
  console.log('중요: 공개 GitHub 저장소를 먼저 생성해 주세요. GitHub 비밀번호/토큰은 이 파일에 저장하지 마세요.');
}
async function main(){
  if(process.argv[2]&&process.argv[3]){configure(process.argv[2],process.argv[3]);return;}
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  try{
    const owner=(await rl.question('GitHub 사용자명 또는 조직명 (owner): ')).trim();
    const repo=(await rl.question('공개 저장소 이름 (repo): ')).trim();
    configure(owner,repo);
  }finally{rl.close();}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={configure,isValid};
