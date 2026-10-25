import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'parse5';
import vm from 'node:vm';
import {transform} from './scripts/site-copy.mjs';
import {mergeEdits} from './scripts/admin-server.mjs';
test('text edits survive regeneration, preserve links and escape markup',()=>{
 const html='<html><head><title>Title</title></head><body><a href="projects/a.html">Clockwork Nabi</a><span data-bilingual><span class="locale-en">Clockwork Nabi</span><span class="locale-ko">클락워크 나비</span></span></body></html>';
 const catalog={entries:[]};transform(html,'index.html',{'Clockwork Nabi':'클락워크 나비'},catalog);
 const e=catalog.entries.find(e=>e.en==='Clockwork Nabi');e.ko='태엽나비';e.en='<img src=x onerror=alert(1)>';
 const result=transform(html,'index.html',{'Clockwork Nabi':'클락워크 나비'},catalog);
 assert.ok(result.includes('태엽나비'));assert.ok(result.includes('href="projects/a.html"'));assert.ok(!result.includes('<img src=x'));assert.equal(catalog.entries.filter(e=>e.original.en==='Clockwork Nabi').length,1);
 const tree=parse(result);let script;const walk=n=>{if(n.attrs?.some(a=>a.name==='id'&&a.value==='site-copy-data'))script=n;for(const c of n.childNodes||[])walk(c);};walk(tree);
 const entries=JSON.parse(script.childNodes[0].value),root=tree.childNodes.find(n=>n.tagName==='html');for(const item of entries){let n=root;for(const index of item.path)n=n.childNodes[index];assert.equal(n.nodeName,'#text');assert.equal(n.value,item.en);}
});
test('save validation rejects unknown ids and immutable locale changes',()=>{
 const catalog={entries:[{id:'a',en:'A',ko:'가',kind:'text'},{id:'b',en:'B',ko:'',kind:'rich-en'}]};
 assert.throws(()=>mergeEdits(catalog,[{id:'unknown',en:'',ko:''}]));assert.throws(()=>mergeEdits(catalog,[{id:'b',en:'B',ko:'나'}]));
 const result=mergeEdits(catalog,[{id:'a',en:'A',ko:'나'}]);assert.equal(result.entries[0].ko,'나');assert.equal(catalog.entries[0].ko,'가');
});
test('admin is not included in deployment and browser code parses',()=>{
 new vm.Script(readFileSync('admin/admin.js','utf8'));
 const build=readFileSync('build.mjs','utf8');assert.ok(!build.includes("cp('admin'"));
});
