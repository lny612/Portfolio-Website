import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const sources=await read('content/translation-source.json');
const lines=(await readFile(path.join(root,'content/translations.tsv'),'utf8')).trim().split(/\r?\n/);
const translations=new Map(lines.map(line=>{const i=line.indexOf('\t');return [sources[Number(line.slice(0,i))],line.slice(i+1)];}));
if(translations.size!==sources.length)throw new Error('Incomplete translation inventory');
const media=await read('content/media.json');
const order=['bone-to-gather','clockwork-nabi','wizard-candy-maker','mutant-lab','classic-rts','quench','flip-maze'];
const docs=await Promise.all(order.map(slug=>read(`content/${slug}.json`)));
const blocks=Object.assign({},...docs.map(d=>d.blocks));
const routes=Object.fromEntries(docs.map(d=>[d.root,d.slug]));
routes['15edac73-098e-8048-912e-dc57681e1b36']='bone-to-gather-press-kit';

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const plain=runs=>(runs||[]).map(r=>r[0]==='‣'?'':r[0]).join('').trim();
function pair(value){const other=translations.get(value);if(!other)return {en:value,ko:value};return /[가-힣]/.test(value)?{en:other,ko:value}:{en:value,ko:other};}
function bilingual(en,ko,tag='span'){return `<${tag} data-bilingual><span class="locale-en" lang="en">${en}</span><span class="locale-ko" lang="ko">${ko}</span></${tag}>`;}
function label(en,ko){return bilingual(esc(en),esc(ko));}
function href(url){
 if(typeof url!=='string')return '#';
 if(/^[a-z0-9-]+\.html(?:#[a-z0-9-]+)?$/.test(url))return url;
 if(url.startsWith('/')||/notion\.site|notion\.so/.test(url)){
  const matches=url.replaceAll('-','').match(/[a-f\d]{32}/g)||[];
  for(const match of matches){const id=match.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');if(routes[id])return `${routes[id]}.html`;if(blocks[id])return `#block-${id}`;}
  throw new Error(`Unresolved Notion link: ${url}`);
 }
 return /^(https?:|mailto:)/.test(url)?url:'#';
}
function link(url,text){const target=href(url);return `<a href="${esc(target)}"${/^(https?:)/.test(target)?' target="_blank" rel="noopener noreferrer"':''}>${text}</a>`;}
function rich(runs,lang){
 const original=plain(runs);const localized=pair(original)[lang];
 if(localized===original){
  return (runs||[]).map(run=>{
   let text=esc(run[0]);for(const mark of run[1]||[]){
    if(mark[0]==='b')text=`<strong>${text}</strong>`;
    if(mark[0]==='i')text=`<em>${text}</em>`;
    if(mark[0]==='c')text=`<code>${text}</code>`;
    if(mark[0]==='s')text=`<s>${text}</s>`;
    if(mark[0]==='a')text=link(mark[1],text);
    if(mark[0]==='p')text=link('/'+mark[1],esc(pair(plain(blocks[mark[1]]?.properties?.title))[lang]));
    if(mark[0]==='lm')text=link(mark[1].href,esc(mark[1].title||mark[1].href));
   }return text.replaceAll('\n','<br>');
  }).join('');
 }
 let html=esc(localized).replaceAll('\n','<br>');
 const added=new Set();
 for(const run of runs||[])for(const mark of run[1]||[]){
  let url,text;
  if(mark[0]==='a'){url=mark[1];text=run[0];}
  if(mark[0]==='lm'){url=mark[1].href;text=mark[1].title;}
  if(mark[0]==='p'){url='/'+mark[1];text=pair(plain(blocks[mark[1]]?.properties?.title))[lang];}
  if(url&&!added.has(url)){
   added.add(url);
   if(text&&html.includes(esc(text)))html=html.replace(esc(text),link(url,esc(text)));
   else html+=' '+link(url,esc(text||url));
  }
 }
 return html;
}
const text=runs=>bilingual(rich(runs,'en'),rich(runs,'ko'));
let rendered=new Set();
function children(ids=[]){
 let result='';let list=null;
 for(const id of ids){const type=blocks[id]?.type;const next=type==='bulleted_list'?'ul':type==='numbered_list'?'ol':null;
  if(next!==list){if(list)result+=`</${list}>`;if(next)result+=`<${next}>`;list=next;}
  result+=render(id);
 }if(list)result+=`</${list}>`;return result;
}
function render(id){
 const b=blocks[id];if(!b)throw Error(`Missing block ${id}`);rendered.add(id);
 const p=b.properties||{};const inner=()=>children(b.content);const anchor=`id="block-${id}" data-source-block="${id}"`;
 switch(b.type){
  case 'text': return plain(p.title)?`<p ${anchor}>${text(p.title)}</p>${inner()}`:inner();
  case 'header': case 'sub_header': case 'sub_sub_header':{const tag={header:'h2',sub_header:'h3',sub_sub_header:'h4'}[b.type];return `<${tag} ${anchor}>${text(p.title)}</${tag}>${inner()}`;}
  case 'bulleted_list':case 'numbered_list':return `<li ${anchor}>${text(p.title)}${inner()}</li>`;
  case 'callout':return `<aside class="case-callout" ${anchor}>${plain(p.title)?`<p>${text(p.title)}</p>`:''}${inner()}</aside>`;
  case 'quote':return `<blockquote ${anchor}>${text(p.title)}${inner()}</blockquote>`;
  case 'divider':return `<hr ${anchor}>`;
  case 'toggle':return `<details class="case-toggle" ${anchor}><summary>${text(p.title)}<span aria-hidden="true">+</span></summary>${inner()}</details>`;
  case 'column_list':return `<div class="case-columns" ${anchor}>${inner()}</div>`;
  case 'column':return `<div ${anchor}>${inner()}</div>`;
  case 'transclusion_container':return `<div ${anchor}>${inner()}</div>`;
  case 'page':return `<div class="nested-page" ${anchor}>${link('/'+id,text(p.title))}<span aria-hidden="true"> →</span></div>`;
  case 'image':{
   const file=media[id];if(!file)throw Error(`Missing image ${id}`);
   const caption=plain(p.caption);return `<figure ${anchor}><a href="../${esc(file)}" target="_blank" rel="noopener noreferrer" aria-label="Open image at full size" data-ko-aria-label="이미지 원본 크기로 보기"><img src="../${esc(file)}" alt="${esc(caption?pair(caption).en:'Project illustration')}" data-ko-alt="${esc(caption?pair(caption).ko:'프로젝트 이미지')}" loading="lazy" decoding="async"></a>${caption?`<figcaption>${text(p.caption)}</figcaption>`:''}</figure>`;
  }
  case 'video':{
   const url=plain(p.source);const match=url.match(/(?:youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/);
   if(match)return `<figure ${anchor}><iframe class="case-video" src="https://www.youtube-nocookie.com/embed/${match[1]}" title="Project video" data-ko-title="프로젝트 영상" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><figcaption>${link(url,label('Watch on YouTube ↗','YouTube에서 보기 ↗'))}</figcaption></figure>`;
   throw Error(`Unhandled video: ${url}`);
  }
  default:throw Error(`Unsupported block type: ${b.type}`);
 }
}
await mkdir(path.join(root,'projects'),{recursive:true});
const manifest=[];
for(const [id,slug] of Object.entries(routes)){
 rendered=new Set([id]);const page=blocks[id];const title=pair(plain(page.properties.title));
 const parent=docs.find(d=>d.blocks[id]);const idx=order.indexOf(parent.slug);const next=docs[(idx+1)%docs.length];
 const content=children(page.content);
 const headings=[...rendered].map(key=>blocks[key]).filter(b=>['header','sub_header'].includes(b.type));
 const primary=page.content.map(key=>blocks[key]).filter(b=>b.type==='callout'&&b.content?.some(key=>['sub_sub_header','text'].includes(blocks[key].type)));
 const toc=headings.length?headings:primary.map(b=>blocks[b.content[0]]);
 const metadata=Object.entries(page.properties).filter(([key])=>key!=='title').map(([key,value])=>`<div><dt>${label(key==='WI}I'?'Timeline':key==='RXZ@'?'Project type':'Genres',key==='WI}I'?'기간':key==='RXZ@'?'프로젝트 유형':'장르')}</dt><dd>${text(value)}</dd></div>`).join('');
 const cover=media[id+'-cover'];
 const body=`<!doctype html><html lang="en" data-ko-title="${esc(title.ko+' — 임나영 포트폴리오')}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#141711"><title>${esc(title.en)} — Nayoung Lim</title><meta name="description" content="${esc(title.en)} — project details, design contributions, and supporting material by Nayoung Lim." data-ko-content="${esc(title.ko)} — 임나영의 프로젝트 소개, 기획 과정 및 관련 자료."><link rel="icon" href="../assets/mark.svg"><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../project.css"><script src="../project.js" defer></script><script src="../language.js" defer></script></head><body>
 <a class="skip" href="#case-content">${label('Skip to project content','프로젝트 본문 바로가기')}</a><div class="progress" aria-hidden="true"></div>
 <header><a class="brand" href="../index.html" aria-label="Nayoung Lim home">n<span>↗</span>l<span class="brand-name">NAYOUNG LIM</span></a><nav aria-label="Main navigation"><a href="../projects.html">${label('Work','프로젝트')}</a><a href="../index.html#about">${label('About','소개')}</a><a href="../index.html#contact">${label('Let’s talk ↗','연락하기 ↗')}</a></nav></header>
 <main><section class="case-hero"><a class="case-back" href="../projects.html">${label('← All projects','← 전체 프로젝트')}</a><span class="eyebrow">${label('PROJECT / '+String(idx+1).padStart(2,'0'),'프로젝트 / '+String(idx+1).padStart(2,'0'))}</span><h1>${label(title.en,title.ko)}</h1>${metadata?`<dl class="case-meta">${metadata}</dl>`:''}${slug==='clockwork-nabi'?`<p class="case-note">${label('The original date range is reproduced above; the source describes a nine-month project.','원문의 기간 표기를 그대로 옮겼습니다. 원문에는 약 9개월간 진행한 프로젝트로 소개되어 있습니다.')}</p>`:''}${cover?`<img class="case-cover" src="../${esc(cover)}" alt="${esc(title.en)}" data-ko-alt="${esc(title.ko)}">`:''}</section>
 <div class="case-layout"><aside class="case-sidebar"><p class="eyebrow">${label('ON THIS PAGE','목차')}</p><nav aria-label="Project contents" data-ko-aria-label="프로젝트 목차">${toc.map(b=>`<a href="#block-${b.id}">${text(b.properties?.title)}</a>`).join('')}<a href="#project-end">${label('Next project →','다음 프로젝트 →')}</a></nav></aside><article class="case-content" id="case-content">${content}</article></div>
 <section class="case-next" id="project-end"><div><span class="eyebrow">${label('KEEP EXPLORING','계속 살펴보기')}</span><h2>${link(next.slug+'.html',text(blocks[next.root].properties.title))}</h2></div><a class="arrow-circle" href="${next.slug}.html" aria-label="Next project" data-ko-aria-label="다음 프로젝트">→</a></section></main>
 <footer><span>© <span id="year">2026</span> NAYOUNG LIM</span><a href="../projects.html">${label('ALL PROJECTS ↑','전체 프로젝트 ↑')}</a></footer></body></html>`;
 await writeFile(path.join(root,'projects',slug+'.html'),body);
 manifest.push({slug,id,blocks:[...rendered],images:[...rendered].filter(key=>blocks[key].type==='image')});
}
await writeFile(path.join(root,'content/render-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Generated ${manifest.length} bilingual project pages; ${Object.keys(media).length} local media files.`);
