import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
import './scripts/generate-projects.mjs';
import './scripts/generate-gallery.mjs';
// Retired analysis pages must not survive an incremental build.
for(const base of ['projects','dist/projects'])for(const slug of ['darkest-dungeon','darkest-dungeon-analysis'])await rm(`${base}/${slug}.html`,{force:true});
await mkdir('dist',{recursive:true});
for(const f of ['index.html','projects.html','style.css','app.js','language.js','project.css','project.js']) await copyFile(f,`dist/${f}`);
await cp('assets','dist/assets',{recursive:true});
await cp('projects','dist/projects',{recursive:true});
console.log('Static portfolio built in dist/');
