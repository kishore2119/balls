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
 assert.deepEqual(selectAnimations('available').map(mode=>mode.id),['ring-escape']);
 assert.ok(selectAnimations('planned').every(mode=>mode.status==='planned'));
 assert.equal(selectAnimations('available').length+selectAnimations('planned').length,ANIMATIONS.length);
});
test('home links open the separate editor, which retains local project and audio modules',async()=>{
 const home=await readFile(new URL('../index.html',import.meta.url),'utf8'),studio=await readFile(new URL('../studio.html',import.meta.url),'utf8');
 assert.match(home,/src="\.\/src\/home\/home.js"/);assert.match(home,/href="\.\/studio.html\?animation=ring-escape"/);
 assert.match(studio,/import\('\.\/src\/studio\/studio.js'\)/);assert.match(studio,/href="\.\/#animations"/);
 assert.match(studio,/id="impact-file"/);assert.match(studio,/id="preset-list"/);
});

async function sourceModules(directory){
 const modules=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const target=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
  if(entry.isDirectory())modules.push(...await sourceModules(target));
  else if(entry.name.endsWith('.js'))modules.push(target);
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
 for(const page of ['index.html','studio.html']){
  const file=new URL('../'+page,import.meta.url),html=await readFile(file,'utf8');
  for(const [,path]of html.matchAll(/(?:src|href)="(\.[^"]+)"/g))await access(new URL(path,file));
 }
 assert.ok(references>15,'Check the complete module graph, including lazy audio/export imports');
});
