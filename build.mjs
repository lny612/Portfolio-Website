import {mkdir,copyFile,cp} from 'node:fs/promises';
import './scripts/generate-projects.mjs';
await mkdir('dist',{recursive:true});
for(const f of ['index.html','style.css','app.js','language.js','project.css','project.js']) await copyFile(f,`dist/${f}`);
await cp('assets','dist/assets',{recursive:true});
await cp('projects','dist/projects',{recursive:true});
console.log('Static portfolio built in dist/');
