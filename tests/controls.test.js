import test from 'node:test';
import assert from 'node:assert/strict';
import {ProjectHistory} from '../src/studio/history.js';
import {clampControlValue} from '../src/studio/ui.js';

test('undo and redo restore independent project snapshots',()=>{
 const original={physics:{ballSpeed:1},appearance:{colors:['#ffffff']}};
 const history=new ProjectHistory(original),next=structuredClone(original);next.physics.ballSpeed=2;history.record(next);
 next.appearance.colors[0]='#000000';
 assert.equal(history.undo().physics.ballSpeed,1);assert.equal(history.redo().appearance.colors[0],'#ffffff');
 assert.equal(history.undo().physics.ballSpeed,1);assert.equal(original.physics.ballSpeed,1);
});
test('continuous slider edits are grouped, while different controls and new edits branch correctly',()=>{
 const history=new ProjectHistory({speed:1,count:50});
 history.record({speed:1.1,count:50},{group:'speed',now:1000});
 history.record({speed:1.2,count:50},{group:'speed',now:1100});
 history.record({speed:1.2,count:60},{group:'count',now:1200});
 assert.deepEqual(history.undo(),{speed:1.2,count:50});assert.deepEqual(history.undo(),{speed:1,count:50});
 history.record({speed:2,count:50});assert.equal(history.canRedo,false);
});
test('history ignores unchanged settings and bounds memory',()=>{
 const history=new ProjectHistory({n:0},2);assert.equal(history.record({n:0}),false);
 for(let n=1;n<=3;n++)history.record({n});
 assert.equal(history.undo().n,2);assert.equal(history.undo().n,1);assert.equal(history.undo(),null);
});
test('exact-value inputs clamp, snap, and reject empty or invalid values',()=>{
 assert.equal(clampControlValue('1.37',.25,3,.05),1.35);
 assert.equal(clampControlValue('99',.25,3,.05),3);
 assert.equal(clampControlValue('-5',0,100,5),0);
 assert.equal(clampControlValue('43',0,100,5),45);
 assert.equal(clampControlValue('42.4',25,100,.1),42.4);
 assert.equal(clampControlValue('',0,4,.05),null);assert.equal(clampControlValue('oops',0,4,.05),null);
});
