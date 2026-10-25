import {parse,serialize,parseFragment} from 'parse5';
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import vm from 'node:vm';
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,20);
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const set=(n,k,v)=>{const a=n.attrs?.find(a=>a.name===k);if(a)a.value=v;else(n.attrs??=[]).push({name:k,value:v});};
const children=n=>n.childNodes||[];
const walk=(n,fn)=>{fn(n);for(const c of [...children(n)])walk(c,fn);};
const leaves=n=>{const result=[];walk(n,x=>{if(x.nodeName==='#text'&&x.value.trim())result.push(x);});return result;};
const meaningful=s=>/[\p{L}\p{N}]/u.test(s);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function transform(html,page,translations,catalog){
 const tree=parse(html),handled=new Set(),managed=[];
 function entry(en,ko,kind='text'){
  const id=hash(JSON.stringify([kind,en,ko]));
  let e=catalog.entries.find(e=>e.id===id);
  if(!e){e={id,kind,original:{en,ko},en,ko,pages:[]};catalog.entries.push(e);}
  if(!e.pages.includes(page))e.pages.push(page);
  return e;
 }
 walk(tree,n=>{
  if(attr(n,'data-bilingual')!==undefined){
   const en=children(n).find(c=>attr(c,'class')==='locale-en'),ko=children(n).find(c=>attr(c,'class')==='locale-ko');
   if(!en||!ko)return;
   const a=leaves(en),b=leaves(ko);
   if(a.length===b.length){a.forEach((x,i)=>{const e=entry(x.value.trim(),b[i].value.trim());x.value=x.value.replace(x.value.trim(),e.en);b[i].value=b[i].value.replace(b[i].value.trim(),e.ko);handled.add(x);handled.add(b[i]);});}
   else {for(const [nodes,lang] of [[a,'en'],[b,'ko']])for(const x of nodes){const e=entry(lang==='en'?x.value.trim():'',lang==='ko'?x.value.trim():'','rich-'+lang);x.value=x.value.replace(x.value.trim(),e[lang]);handled.add(x);}}
  }
 });
 walk(tree,n=>{
  if(n.nodeName==='#text'&&!handled.has(n)&&meaningful(n.value)){
   let p=n.parentNode,skip=false,head=false;
   while(p){if(['script','style','svg'].includes(p.tagName)||attr(p,'aria-hidden')==='true')skip=true;if(p.tagName==='head')head=true;p=p.parentNode;}
   if(skip||head)return;
   const raw=n.value.trim(),e=entry(raw,translations[raw]||raw);
   const prefix=n.value.match(/^\s*/)[0],suffix=n.value.match(/\s*$/)[0];
   n.value=prefix+e.en+suffix;
   managed.push({node:n,en:prefix+e.en+suffix,ko:prefix+e.ko+suffix});
  }
  for(const key of ['alt','aria-label']){const value=attr(n,key);if(value&&meaningful(value)){const e=entry(value,attr(n,'data-ko-'+key)||translations[value]||value,key);set(n,key,e.en);set(n,'data-ko-'+key,e.ko);}}
 });
 let htmlNode,title,meta;
 walk(tree,n=>{if(n.tagName==='html')htmlNode=n;if(n.tagName==='title')title=n;if(n.tagName==='meta'&&attr(n,'name')==='description')meta=n;});
 if(title){const value=leaves(title).map(x=>x.value).join('');const e=entry(value,attr(htmlNode,'data-ko-title')||'임나영 — 게임 기획자 & 프로그래머','title');title.childNodes=[{nodeName:'#text',value:e.en,parentNode:title}];set(htmlNode,'data-ko-title',e.ko);}
 if(meta){const value=attr(meta,'content')||'';const e=entry(value,attr(meta,'data-ko-content')||'게임 기획자이자 프로그래머 임나영의 포트폴리오. 게임 시스템, 창의적인 프로토타입, 출시 프로젝트를 소개합니다.','description');set(meta,'content',e.en);set(meta,'data-ko-content',e.ko);}
 const data=managed.map(({node,en,ko})=>{const path=[];while(node.parentNode&&node!==htmlNode){path.unshift(node.parentNode.childNodes.indexOf(node));node=node.parentNode;}return {path,en,ko};});
 const fragment=parseFragment(`<script id="site-copy-data" type="application/json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script>`);
 const body=children(htmlNode).find(n=>n.tagName==='body');const script=fragment.childNodes[0];script.parentNode=body;body.childNodes.push(script);
 return serialize(tree);
}
export async function applySiteCopy(){
 let catalog;try{catalog=JSON.parse(await readFile('content/site-copy.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;catalog={version:1,entries:[]};}
 for(const e of catalog.entries)e.pages=[];
 const code=await readFile('language.js','utf8');const translations=vm.runInNewContext(code.split('const textEntries')[0]+'\nkorean');
 const files=['index.html','projects.html',...(await readdir('dist/projects')).filter(f=>f.endsWith('.html')).map(f=>'projects/'+f)];
 for(const file of files){const html=await readFile('dist/'+file,'utf8');await writeFile('dist/'+file,transform(html,file,translations,catalog));}
 catalog.entries=catalog.entries.filter(e=>e.pages.length);
 await writeFile('content/site-copy.json',JSON.stringify(catalog,null,2)+'\n');
 console.log(`Applied ${catalog.entries.length} editable text entries across ${files.length} pages.`);
}
