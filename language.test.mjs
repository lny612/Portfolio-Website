import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source = readFileSync('language.js', 'utf8');
const translations = vm.runInNewContext(source.split('const textEntries')[0] + '\nkorean');

test('browser scripts have valid syntax',()=>{
  for(const file of ['app.js','language.js','project.js'])new vm.Script(readFileSync(file,'utf8'),{filename:file});
});

test('every translation switches and restores without replacing markup; preference persists', () => {
  const nodes = Object.keys(translations).map(key => ({textContent:` ${key} `,parentElement:{closest:()=>false}}));
  const originals = nodes.map(node=>node.textContent);
  const buttons = ['en','ko'].map(lang=>({dataset:{lang},setAttribute(key,value){this[key]=value;},getAttribute(key){return this[key];}}));
  const control = {dataset:{},setAttribute(){},querySelectorAll:()=>buttons,addEventListener(type,listener){this.click=listener;}};
  const image = {alt:'Bone To Gather game artwork',getAttribute(key){return this[key]??null;},setAttribute(key,value){this[key]=value;}};
  const meta = {content:'English description'};
  const storage = new Map([['portfolio-language','ko']]);
  let cursor=-1;
  let resizeCount=0;
  const document = {
    body:{append(){}},documentElement:{lang:'en'},title:'English title',
    createTreeWalker:()=>({nextNode(){return ++cursor<nodes.length;},get currentNode(){return nodes[cursor];}}),
    querySelectorAll:()=>[image],
    createElement(tag){return tag==='div'?control:{setAttribute(){}};},
    querySelector(selector){return selector==='header'?{append(){}}:meta;}
  };
  vm.runInNewContext(source,{document,NodeFilter:{SHOW_TEXT:4},localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},window:{dispatchEvent(){resizeCount++;}},Event:class{}});
  assert.equal(document.documentElement.lang,'ko');
  nodes.forEach((node,i)=>assert.equal(node.textContent,` ${Object.values(translations)[i]} `));
  assert.equal(image.alt,'본 투 게더 게임 대표 이미지');
  assert.equal(buttons[1]['aria-pressed'],'true');
  control.click({target:{closest:()=>buttons[0]}});
  assert.equal(document.documentElement.lang,'en');
  assert.deepEqual(nodes.map(node=>node.textContent),originals);
  assert.equal(document.title,'English title');
  assert.equal(meta.content,'English description');
  assert.equal(image.alt,'Bone To Gather game artwork');
  assert.equal(storage.get('portfolio-language'),'en');
  assert.equal(resizeCount,2);
});

test('all English text in the page has a translation except official names and technical labels',()=>{
  const html=readFileSync('index.html','utf8').split('<body>')[1];
  const allowed=new Set(['n','l','Unity / C#','AWIL Limited Company','iris61214@gmail.com']);
  const texts=[...html.matchAll(/>([^<>]+)</g)].map(match=>match[1].trim()).filter(text=>/[a-zA-Z]/.test(text));
  assert.deepEqual(texts.filter(text=>!Object.hasOwn(translations,text)&&!allowed.has(text)),[]);
  const featured=JSON.parse(readFileSync('content/featured-projects.json','utf8'));
  for(const project of featured)assert.equal(translations[project.name],project.ko);
});
