// Add each animation here when its editor is ready. Planned modes have no editor link.
export const ANIMATIONS=Object.freeze([
 Object.freeze({id:'ring-escape',name:'Ring Escape',status:'available',category:'Bounce & escape',description:'One ball, shrinking rings, and a perfectly timed way out.',art:'rings',accent:'#c6afff',href:'./studio.html?animation=ring-escape',tags:['Music sync','Rotating rings','Custom colors']}),
 Object.freeze({id:'color-cascade',name:'Color Cascade',status:'planned',category:'Stack & settle',description:'A shower of colorful balls. A little chaos, a satisfying finish.',art:'cascade',accent:'#ffb59b',tags:['Concept preview']}),
 Object.freeze({id:'orbit-trails',name:'Orbit Trails',status:'planned',category:'Flow & follow',description:'Glowing paths that turn simple movement into a work of art.',art:'trails',accent:'#a6e6c5',tags:['Concept preview']}),
 Object.freeze({id:'gravity-duel',name:'Gravity Duel',status:'planned',category:'Bounce & compete',description:'Two balls, one arena. A new way to keep your eyes on the bounce.',art:'duel',accent:'#a4cbff',tags:['Concept preview']}),
]);
export function selectAnimations(filter='all'){
 return ANIMATIONS.filter(animation=>filter==='all'||animation.status===filter);
}
