import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {ANIMATIONS,selectAnimations} from '../animations.js';
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
 assert.match(home,/src="\.\/home.js"/);assert.match(home,/href="\.\/studio.html\?animation=ring-escape"/);
 assert.match(studio,/import\('\.\/studio.js'\)/);assert.match(studio,/href="\.\/#animations"/);
 assert.match(studio,/id="impact-file"/);assert.match(studio,/id="preset-list"/);
});
