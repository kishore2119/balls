const polar=(cx,cy,r,a)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r].map(v=>v.toFixed(2)).join(' ');
export function modeArtwork(kind,prefix='art'){
 const defs=`<defs><radialGradient id="${prefix}-bg"><stop stop-color="#37204f" stop-opacity=".55"/><stop offset="1" stop-color="#0b0913"/></radialGradient><linearGradient id="${prefix}-color" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ed74ba"/><stop offset=".5" stop-color="#9472ef"/><stop offset="1" stop-color="#c9b0ff"/></linearGradient><radialGradient id="${prefix}-ball"><stop stop-color="#fff"/><stop offset=".4" stop-color="#e7ffba"/><stop offset="1" stop-color="#8da853"/></radialGradient><filter id="${prefix}-glow"><feGaussianBlur stdDeviation="8"/></filter></defs>`;
 let art='';
 if(kind==='rings'){
  for(let i=0;i<25;i++){const r=26+i*8,angle=.22+i*.007;art+=`<path d="M ${polar(140,157,r,angle)} A ${r} ${r} 0 1 1 ${polar(140,157,r,angle+5.35)}" stroke="url(#${prefix}-color)" stroke-width="1.4" fill="none" opacity="${Math.max(.2,1-i*.018)}"/>`;}
  art+=`<circle cx="133" cy="151" r="17" fill="#d5ff82" opacity=".25" filter="url(#${prefix}-glow)"/><circle cx="133" cy="151" r="5" fill="url(#${prefix}-ball)"/>`;
 }else if(kind==='cascade'){
  const balls=[[32,253,15],[63,256,16],[96,252,16],[131,255,18],[167,251,17],[201,255,16],[235,254,18],[267,255,16],[43,223,15],[76,223,17],[112,219,18],[150,220,17],[185,219,16],[220,222,17],[256,219,17],[62,190,16],[100,185,17],[140,184,18],[178,187,18],[214,185,16],[235,154,16],[125,150,16],[158,128,14],[89,113,15],[180,86,12],[137,55,10]];
  const colors=['#ffc594','#ed997d','#c98ca9','#af9ce7','#f5d2af'];
  art='<path d="M 14 279 H 266" stroke="#8e64624d" stroke-width="2"/>';
  balls.forEach(([x,y,r],i)=>{art+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${colors[i%colors.length]}"/><circle cx="${x-r*.25}" cy="${y-r*.3}" r="${r*.42}" fill="#fff" opacity=".13"/>`;});
 }else if(kind==='trails'){
  for(let i=0;i<21;i++){art+=`<path d="M -18 ${231+i*2} C 60 ${58-i*2}, 225 ${316-i*3}, 232 ${123-i*1.6} S 67 ${80+i*3}, 49 ${157+i*1.5} S 130 ${290+i*2}, 298 ${161-i*3}" fill="none" stroke="${i<8?'#72c5ac':i<15?'#addfca':'#c3a5ec'}" opacity="${.24+i*.025}" stroke-width="1.15"/>`;}
  art+='<circle cx="236" cy="117" r="7" fill="#d9ffcb"/>';
 }else{
  for(let i=0;i<5;i++)art+=`<circle cx="140" cy="155" r="${83+i*5}" stroke="#92acde" stroke-width="${i===4?1.4:.6}" opacity="${i===4?.7:.15}" fill="none"/>`;
  art+='<path d="M 80 190 Q 65 125 133 91" fill="none" stroke="#a9c9ff" stroke-width="2" opacity=".3"/><path d="M 209 118 Q 219 193 149 218" fill="none" stroke="#efb8f6" stroke-width="2" opacity=".3"/><circle cx="105" cy="107" r="12" fill="#a9c9ff"/><circle cx="181" cy="211" r="12" fill="#efb8f6"/><circle cx="102" cy="103" r="4" fill="#e1edff" opacity=".8"/><circle cx="178" cy="207" r="4" fill="#ffe6ff" opacity=".8"/>';
 }
 return `<svg viewBox="0 0 280 300" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true">${defs}<rect width="280" height="300" fill="url(#${prefix}-bg)"/>${art}</svg>`;
}
