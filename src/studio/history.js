export class ProjectHistory {
 constructor(initial,limit=50){this.current=structuredClone(initial);this.limit=limit;this.past=[];this.future=[];this.group=null;this.lastRecorded=0;}
 get canUndo(){return this.past.length>0;}
 get canRedo(){return this.future.length>0;}
 amend(next){this.current=structuredClone(next);}
 record(next,{group=null,now=Date.now()}={}){
  if(JSON.stringify(next)===JSON.stringify(this.current))return false;
  if(!group||group!==this.group||now-this.lastRecorded>600){this.past.push(this.current);if(this.past.length>this.limit)this.past.shift();}
  this.current=structuredClone(next);this.future=[];this.group=group;this.lastRecorded=now;return true;
 }
 undo(){if(!this.canUndo)return null;this.future.push(this.current);this.current=this.past.pop();this.group=null;return structuredClone(this.current);}
 redo(){if(!this.canRedo)return null;this.past.push(this.current);this.current=this.future.pop();this.group=null;return structuredClone(this.current);}
}
