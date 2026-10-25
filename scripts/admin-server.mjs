import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename,copyFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import vm from 'node:vm';
import {transform} from './site-copy.mjs';
const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const port=Number(process.env.PORTFOLIO_ADMIN_PORT||4317),origin=`http://127.0.0.1:${port}`;
const token=randomBytes(32).toString('hex');
const catalogFile=path.join(root,'content/site-copy.json');
const revision=s=>createHash('sha256').update(s).digest('hex');
const readCatalog=async()=>{const raw=await readFile(catalogFile,'utf8');return {catalog:JSON.parse(raw),revision:revision(raw)};};
const language=await readFile('language.js','utf8');const translations=vm.runInNewContext(language.split('const textEntries')[0]+'\nkorean');
let preview=null,busy=false,requestActive=false,job={state:'idle',message:''};
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
export function mergeEdits(catalog,edits){
 if(!Array.isArray(edits)||edits.length>2000)fail('수정 목록이 올바르지 않습니다.');
 const result=structuredClone(catalog),seen=new Set();
 for(const edit of edits){const entry=result.entries.find(e=>e.id===edit.id);if(!entry||seen.has(edit.id))fail('알 수 없거나 중복된 문구입니다.');seen.add(edit.id);
  for(const lang of ['en','ko']){if(typeof edit[lang]!=='string'||edit[lang].length>30000)fail('문구는 30,000자 이하로 입력해 주세요.');if(entry.kind==='rich-en'&&lang==='ko'||entry.kind==='rich-ko'&&lang==='en'){if(edit[lang]!==entry[lang])fail('이 항목은 원문의 해당 언어만 수정할 수 있습니다.');}entry[lang]=edit[lang];}
 }
 return result;
}
async function payload(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2e6)fail('요청이 너무 큽니다.',413);}try{return JSON.parse(raw);}catch{fail('요청 형식이 올바르지 않습니다.');}}
const run=(file,args)=>exec(file,args,{cwd:root,windowsHide:true,timeout:180000,maxBuffer:2e6,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
async function deploy(){
 try{
  job={state:'running',message:'사이트를 빌드하고 검사하고 있습니다.'};
  await run(process.execPath,['build.mjs']);
  await run(process.execPath,['--test','project.test.mjs','language.test.mjs','admin.test.mjs']);
  const branch=(await run('git',['branch','--show-current'])).stdout.trim();
  const remote=(await run('git',['remote','get-url','origin'])).stdout.trim();
  if(branch!=='main'||remote!=='https://github.com/lny612/Portfolio-Website.git')fail('배포 대상이 변경되었습니다. main 브랜치와 포트폴리오 저장소를 확인해 주세요.');
  if((await run('git',['diff','--cached','--name-only'])).stdout.trim())fail('다른 작업이 Git에 준비되어 있습니다. 먼저 해당 작업을 정리해 주세요.');
  const changed=(await run('git',['diff','--name-only'])).stdout.trim().split(/\r?\n/).filter(Boolean);
  if(changed.some(f=>f!=='content/site-copy.json'))fail('문구 외의 코드 변경이 있습니다. 먼저 코드 변경을 저장·배포해 주세요.');
  await run('git',['fetch','origin']);
  if((await run('git',['rev-list','--count','HEAD..origin/main'])).stdout.trim()!=='0')fail('GitHub에 더 최신 변경이 있습니다. 먼저 동기화가 필요합니다.');
  if(changed.length){await run('git',['add','--','content/site-copy.json']);await run('git',['commit','-m','Update portfolio text from local editor','--only','--','content/site-copy.json']);}
  job.message='GitHub에 저장하고 있습니다.';
  await run('git',['push','origin','main']);
  const sha=(await run('git',['rev-parse','HEAD'])).stdout.trim();
  job={state:'pushed',message:'GitHub 저장 완료. Vercel 배포 상태를 확인하고 있습니다.',sha,url:'https://portfolio-website-topaz-six-26.vercel.app/'};
  for(let i=0;i<30;i++){
   const status=JSON.parse((await run('gh',['api',`repos/lny612/Portfolio-Website/commits/${sha}/status`])).stdout);
   const vercel=status.statuses.filter(s=>s.context==='Vercel – portfolio-website');
   if(vercel.some(s=>s.state==='failure'||s.state==='error'))fail('GitHub 저장은 완료되었지만 Vercel 배포가 실패했습니다. Vercel에서 오류를 확인해 주세요.');
   if(vercel.length&&vercel.every(s=>s.state==='success')){job={...job,state:'success',message:'온라인 배포가 완료되었습니다.'};return;}
   await new Promise(resolve=>setTimeout(resolve,4000));
  }
  job={...job,state:'unconfirmed',message:'GitHub 저장 완료. 배포 완료는 아직 확인되지 않았습니다. Vercel에서 확인해 주세요.'};
 }catch(error){job={...job,state:'error',message:error.status?error.message:'배포를 완료하지 못했습니다. GitHub 로그인과 네트워크를 확인한 뒤 다시 시도해 주세요.'};console.error(error.message);}
 finally{busy=false;}
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
 try{
  if(req.headers.host!==`127.0.0.1:${port}`)fail('허용되지 않은 주소입니다.',403);
  if(req.headers.origin&&req.headers.origin!==origin)fail('다른 사이트의 요청은 허용되지 않습니다.',403);
  if(req.headers['sec-fetch-site']==='cross-site')fail('다른 사이트의 요청은 허용되지 않습니다.',403);
  const url=new URL(req.url,origin);
  if(url.pathname==='/api/catalog'&&req.method==='GET')return json({...await readCatalog(),token});
  if(url.pathname==='/api/status'&&req.method==='GET')return json(job);
  if(url.pathname.startsWith('/api/')){
   if(req.method!=='POST'||req.headers['x-editor-token']!==token||req.headers.origin!==origin)fail('편집 화면을 새로 열어 주세요.',403);
   if(busy||requestActive)fail('다른 작업을 처리 중입니다. 잠시 후 다시 시도해 주세요.',409);
   requestActive=true;res.once('finish',()=>{requestActive=false;});res.once('close',()=>{requestActive=false;});
   const input=await payload(req),current=await readCatalog();
   if(input.revision!==current.revision)fail('다른 창에서 문구가 변경되었습니다. 현재 작업을 복사한 뒤 페이지를 새로 열어 주세요.',409);
   if(url.pathname==='/api/preview'){preview=mergeEdits(current.catalog,input.edits);return json({ok:true});}
   if(url.pathname==='/api/save'){
    busy=true;
    try{const updated=mergeEdits(current.catalog,input.edits);await mkdir('tmp/admin-backups',{recursive:true});await copyFile(catalogFile,`tmp/admin-backups/${Date.now()}.json`);const raw=JSON.stringify(updated,null,2)+'\n';await writeFile(catalogFile+'.tmp',raw);await rename(catalogFile+'.tmp',catalogFile);preview=null;return json({revision:revision(raw)});}finally{busy=false;}
   }
   if(url.pathname==='/api/deploy'){busy=true;job={state:'running',message:'배포 준비 중입니다.'};void deploy();return json(job,202);}
   fail('알 수 없는 작업입니다.',404);
  }
  if(req.method!=='GET')fail('허용되지 않은 요청입니다.',405);
  if(url.pathname.startsWith('/preview/')){
   const relative=decodeURIComponent(url.pathname.slice(9))||'index.html';
   const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)||!(/^(index\.html|projects\.html|projects\/[a-z0-9-]+\.html|assets\/[a-zA-Z0-9/_.-]+|(?:style|project)\.css|(?:app|language|project)\.js)$/.test(relative)))fail('파일을 찾을 수 없습니다.',404);
   let data=await readFile(target);if(relative.endsWith('.html')){const catalog=structuredClone(preview||(await readCatalog()).catalog);data=transform(data.toString(),relative,translations,catalog);}
   res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'})[path.extname(target)]||'application/octet-stream');return res.end(data);
  }
  const routes={'/':'index.html','/admin.js':'admin.js','/admin.css':'admin.css'};const file=routes[url.pathname];if(!file)fail('파일을 찾을 수 없습니다.',404);
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await readFile(path.join(root,'admin',file)));
 }catch(error){json({error:error.status?error.message:'파일을 읽거나 저장하지 못했습니다. 다시 시도해 주세요.'},error.status||500);}
});
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'편집기가 이미 실행 중입니다: '+origin:error.message);if(error.code==='EADDRINUSE'&&process.argv.includes('--open'))openBrowser();});
 function openBrowser(){execFile('cmd.exe',['/c','start','',origin],{windowsHide:true});}
 server.listen(port,'127.0.0.1',()=>{console.log('Portfolio editor: '+origin);if(process.argv.includes('--open'))openBrowser();});
}
