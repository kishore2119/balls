import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,readdir} from 'node:fs/promises';
import {ANIMATIONS,selectAnimations} from '../src/home/animations.js';
test('animation catalog has unique IDs and only implemented animations have editor links',async()=>{
 const ids=new Set();
 for(const mode of ANIMATIONS){
  assert.ok(!ids.has(mode.id));ids.add(mode.id);assert.match(mode.id,/^[a-z]+(?:-[a-z]+)*$/);
  if(mode.status==='available'){
   assert.ok(mode.href);const target=new URL(mode.href,new URL('../',import.meta.url));await access(target);
   assert.equal(target.searchParams.get('animation'),mode.id);
  }else{assert.equal(mode.status,'planned');assert.equal(mode.href,undefined);}
 }
});
test('library filters expose the correct available and planned modes',()=>{
 assert.equal(selectAnimations('all').length,ANIMATIONS.length);
 assert.deepEqual(selectAnimations('available').map(mode=>mode.id),['ring-escape','growing-ball','string-wars','rainbow-crash','timed-escape','ball-multiplier','spike-melody','circle-royale']);
 assert.ok(selectAnimations('planned').every(mode=>mode.status==='planned'));
 assert.equal(selectAnimations('available').length+selectAnimations('planned').length,ANIMATIONS.length);
});
test('React entries retain editor links, uploads, and saved presets',async()=>{
 const root=new URL('../',import.meta.url);
 const [home,studio,components]=await Promise.all(['index.html','studio.html','src/studio/studio-app.jsx'].map(path=>readFile(new URL(path,root),'utf8')));
 assert.ok(home.includes('src="./src/home/home.jsx"'));
 assert.ok(studio.includes('src="./src/studio/studio-app.jsx"'));
 assert.ok(components.includes("import('./studio.js')")||components.includes('import("./studio.js")'));
 assert.ok(components.includes('href="./#animations"'));
 assert.ok(components.includes('id="impact-file"'));
 assert.ok(components.includes('id="preset-list"'));
});

async function sourceModules(directory){
 const modules=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const target=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
  if(entry.isDirectory())modules.push(...await sourceModules(target));
  else if(/\.jsx?$/.test(entry.name))modules.push(target);
 }
 return modules;
}
test('organized source imports, worker URLs, and page resources resolve to existing files',async()=>{
 const modules=await sourceModules(new URL('../src/',import.meta.url));let references=0;
 for(const file of modules){
  const code=await readFile(file,'utf8');
  const paths=[...code.matchAll(/(?:from\s+|import\(\s*|new URL\(\s*)['"](\.[^'"]+)['"]/g)];
  for(const [,path]of paths){await access(new URL(path,file));references++;}
 }
 for(const page of ['index.html','studio.html','privacy.html']){
  const file=new URL('../'+page,import.meta.url),html=await readFile(file,'utf8');
  for(const [,path]of html.matchAll(/(?:src|href)="(\.[^"]+)"/g))await access(new URL(path,file));
 }
 assert.ok(references>15,'Check the complete module graph, including lazy audio/export imports');
});
