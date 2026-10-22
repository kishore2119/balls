import {ANIMATIONS,selectAnimations} from './animations.js';
import {modeArtwork} from './home-art.js';
const grid=document.querySelector('#animation-grid'),count=document.querySelector('#library-count');
const ready=selectAnimations('available').length,planned=selectAnimations('planned').length;
for(const button of document.querySelectorAll('[data-filter]'))button.querySelector('span').textContent=selectAnimations(button.dataset.filter).length;
function renderLibrary(filter='all'){
 const modes=selectAnimations(filter);grid.replaceChildren();
 for(const mode of modes){
  const available=mode.status==='available',card=document.createElement(available?'a':'article');
  card.className=`animation-card ${available?'available':'planned'}`;card.dataset.animation=mode.id;
  if(available){card.href=mode.href;card.setAttribute('aria-label',`Create a ${mode.name} video`);}
  card.innerHTML=`<div class="animation-art">${modeArtwork(mode.art,mode.id)}<div class="art-top"><span class="status ${available?'available':''}">${available?'Ready to create':'Coming later'}</span><span class="mode-index">0${ANIMATIONS.indexOf(mode)+1}</span></div><span class="art-label">${available?'Find your way out.':'A new idea in motion.'}</span></div><div class="animation-info"><span class="animation-category">${mode.category}</span><h3>${mode.name}</h3><p>${mode.description}</p><div class="card-bottom">${available?'<span>Create video</span><span class="card-arrow" aria-hidden="true">↗</span>':'<span>Coming later</span><span class="concept-tag">CONCEPT PREVIEW</span>'}</div></div>`;
  grid.append(card);
 }
 count.textContent=filter==='all'?`${ready} ready to create · ${planned} on the horizon`:filter==='available'?`${modes.length} animation${modes.length===1?'':'s'} ready to create`:`${modes.length} concepts · more to come`;
}
renderLibrary();
for(const button of document.querySelectorAll('[data-filter]'))button.addEventListener('click',()=>{
 for(const filter of document.querySelectorAll('[data-filter]')){const active=filter===button;filter.classList.toggle('active',active);filter.setAttribute('aria-pressed',String(active));}
 renderLibrary(button.dataset.filter);
});
document.querySelector('#demo-fallback').innerHTML=modeArtwork('rings','hero-fallback');
let preview=null,selectedTheme=0;
for(const button of document.querySelectorAll('[data-demo-theme]'))button.addEventListener('click',()=>{
 selectedTheme=Number(button.dataset.demoTheme);preview?.setTheme(selectedTheme);
 for(const color of document.querySelectorAll('[data-demo-theme]'))color.setAttribute('aria-pressed',String(color===button));
});
const toggle=document.querySelector('#demo-toggle');
toggle.addEventListener('click',()=>{if(!preview)return;const playing=preview.toggle();toggle.textContent=playing?'Ⅱ':'▷';toggle.setAttribute('aria-label',`${playing?'Pause':'Play'} animation demo`);});
requestAnimationFrame(async()=>{
 try{
  const {startDemo}=await import('./home-preview.js');preview=startDemo(document.querySelector('#home-animation'),status=>{const label=document.querySelector('#demo-status');if(label.textContent!==status)label.textContent=status;});
  preview.setTheme(selectedTheme);document.querySelector('#demo-fallback').hidden=true;toggle.hidden=false;
  toggle.textContent=preview.playing?'Ⅱ':'▷';toggle.setAttribute('aria-label',`${preview.playing?'Pause':'Play'} animation demo`);
 }catch(error){document.querySelector('#home-animation').hidden=true;document.querySelector('#demo-status').textContent='Ring Escape preview';console.warn('Live demo unavailable; using the illustrated preview.',error);}
});
window.addEventListener('pagehide',()=>preview?.dispose());
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
