import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const json=file=>JSON.parse(readFileSync(file,'utf8'));
const manifest=json('content/render-manifest.json');
const roots=['bone-to-gather','clockwork-nabi','wizard-candy-maker','mutant-lab','classic-rts','quench','flip-maze'];
const added=['skulls-pay-the-bills','the-wand-atelier'];
const docs=roots.map(slug=>json(`content/${slug}.json`));

test('all imported blocks, nested pages, and media are included in the static migration',()=>{
 assert.equal(manifest.length,8);
 const rendered=new Set(manifest.flatMap(page=>page.blocks));
 const missing=docs.flatMap(doc=>Object.keys(doc.blocks)).filter(id=>!rendered.has(id));
 assert.deepEqual(missing,[]);
 const media=json('content/media.json');
 assert.equal(Object.keys(media).length,30);
 for(const file of Object.values(media)){
  assert.ok(existsSync(file),file);
  const bytes=readFileSync(file);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',`Invalid PNG: ${file}`);
 }
 for(const page of manifest){
  const html=readFileSync(`projects/${page.slug}.html`,'utf8');
  for(const id of page.images)assert.ok(html.includes('../'+media[id]),`Missing rendered image ${id}`);
 }
});

test('project links, table-of-contents anchors, and assets resolve locally',()=>{
 const files=['index.html','projects.html',...added.map(slug=>`projects/${slug}.html`),...manifest.map(page=>`projects/${page.slug}.html`)];
 for(const file of files){
  const html=readFileSync(file,'utf8');
  if(file!=='index.html')assert.ok(!/href="[^"]*notion\.(site|so)/.test(html),file);
  for(const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){
   const value=match[1];if(/^(https?:|mailto:)/.test(value))continue;
   assert.notEqual(value,'#',`Placeholder link in ${file}`);
   const [pathname,hash]=value.split('#');
   const destination=pathname?path.resolve(path.dirname(file),pathname):path.resolve(file);
   assert.ok(existsSync(destination),`${file} → ${value}`);
   if(hash){const target=readFileSync(destination,'utf8');assert.ok(target.includes(`id="${hash}"`),`${file} → ${value}`);}
  }
 }
 const home=readFileSync('index.html','utf8');
 for(const slug of ['bone-to-gather',...added])assert.equal(home.split(`href="projects/${slug}.html"`).length-1,2);
 assert.ok(!readFileSync('app.js','utf8').includes('https://brass-wormhole'));
});

test('gallery includes all nine games, bilingual additions, and excludes retired analysis',()=>{
 const gallery=readFileSync('dist/projects.html','utf8');
 assert.equal((gallery.match(/class="gallery-card"/g)||[]).length,9);
 for(const slug of [...roots,...added])assert.ok(gallery.includes(`projects/${slug}.html`));
 assert.ok(!gallery.includes('darkest-dungeon'));
 for(const slug of ['darkest-dungeon','darkest-dungeon-analysis'])assert.ok(!existsSync(`dist/projects/${slug}.html`));
 for(const slug of added){const html=readFileSync(`dist/projects/${slug}.html`,'utf8');assert.ok(html.includes('class="locale-en"'));assert.ok(html.includes('class="locale-ko"'));assert.ok(html.includes('../language.js'));}
 const home=readFileSync('dist/index.html','utf8');
 assert.equal((home.match(/class="timeline-item reveal"/g)||[]).length,4);
 assert.ok(home.includes('href="projects.html"'));
 assert.ok(!/PORTFOLIO \/ 2026|IDEA → PROTOTYPE → PLAY|From the first prototype/.test(home));
});

test('all source prose has English and Korean versions; deployment contains all pages',()=>{
 const sources=json('content/translation-source.json');
 const lines=readFileSync('content/translations.tsv','utf8').trim().split(/\r?\n/);
 const translated=new Map(lines.map(line=>{const i=line.indexOf('\t');return [sources[Number(line.slice(0,i))],line.slice(i+1)];}));
 assert.equal(translated.size,sources.length);
 for(const source of sources){assert.ok(translated.get(source)?.trim(),source);if(/[가-힣]/.test(source))assert.ok(!/[가-힣]/.test(translated.get(source)),source);}
 const plain=runs=>(runs||[]).map(run=>run[0]==='‣'?'':run[0]).join('').trim();
 for(const doc of docs)for(const block of Object.values(doc.blocks)){
  const properties=block.properties||{};
  const keys=block.type==='page'?Object.keys(properties):block.type==='image'?['caption']:['title','caption'];
  for(const key of keys){const value=plain(properties[key]);if(value&&!value.startsWith('http')&&/[A-Za-z가-힣]/.test(value))assert.ok(translated.has(value),`Missing translation: ${value}`);}
 }
 for(const page of manifest){const html=readFileSync(`dist/projects/${page.slug}.html`,'utf8');assert.ok(html.includes('class="locale-en"'));assert.ok(html.includes('class="locale-ko"'));assert.ok(html.includes('../language.js'));}
 assert.ok(readFileSync('dist/style.css','utf8').includes('html[lang="ko"] .locale-en'));
});
