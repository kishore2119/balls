const polar=(cx,cy,r,a)=>[cx+Math.cos(a)*r,cy+Math.sin(a)*r].map(v=>v.toFixed(2)).join(' ');
export function modeArtwork(kind){
 let art='';
 if(kind==='rings'){
  const colors=['#e0c59c','#c99161','#b95d38'];
  for(let i=0;i<24;i++){const r=23+i*6.8,angle=.3+i*.012;art+=`<path d="M ${polar(140,155,r,angle)} A ${r} ${r} 0 1 1 ${polar(140,155,r,angle+5.35)}" stroke="${colors[Math.floor(i/8)]}" stroke-width="1.3" fill="none"/>`;}
  art+='<circle cx="133" cy="151" r="5" fill="#f5f3ed"/>';
 }else if(kind==='growing'){
  art='<circle cx="140" cy="155" r="111" stroke="#b7c79b" stroke-width="1.5"/>';
  for(let i=0;i<28;i++)art+=`<path d="M ${polar(140,155,110,i/28*Math.PI*2)} L 177 184" stroke="#a9be7c" stroke-width=".7" opacity=".25"/>`;
  for(let i=0;i<7;i++)art+=`<circle cx="${130+i*7.8}" cy="${126+i*9.6}" r="${22+i*3}" fill="#c4d58f" opacity="${.02+i*.008}"/>`;
  art+='<circle cx="177" cy="184" r="40" fill="#c4d58f"/>';
 }else if(kind==='crash'){
  art='<defs><clipPath id="crash-art-circle"><circle cx="140" cy="153" r="114"/></clipPath></defs><g clip-path="url(#crash-art-circle)"><circle cx="140" cy="153" r="114" fill="#f9f8f2"/>';
  const points=[[140,255],[86,86],[223,206],[80,205],[177,56],[197,221],[67,128],[157,112]];
  for(let k=1;k<points.length;k++)for(let i=0;i<34;i++){
   const t=i/34,x=points[k-1][0]+(points[k][0]-points[k-1][0])*t,y=points[k-1][1]+(points[k][1]-points[k-1][1])*t-Math.sin(t*Math.PI)*20;
   art+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(5+k*2+t*2).toFixed(1)}" fill="#050508" fill-opacity=".14" stroke="hsl(${(k*45+i*9)%360} 100% 53%)" stroke-width=".75"/>`;
  }
  art+='<circle cx="157" cy="112" r="21" fill="#020202"/></g>';
 }else if(kind==='royale'){
  art='<circle cx="140" cy="153" r="105" stroke="#e7ece7" stroke-width="1.8"/>';
  art+=`<path d="M ${polar(140,153,105,-1.8)} A 105 105 0 0 1 ${polar(140,153,105,-.97)}" stroke="#f37d9e" stroke-width="3" stroke-linecap="round"/>`;
  const players=[[96,100,'#d77491','AVA'],[162,102,'#77acd5','KAI'],[191,154,'#84c4a8','IVY'],[121,157,'#b78ad5','MIA'],[82,192,'#d8b36f','NOVA'],[154,212,'#a3c77c','ZOE'],[202,201,'#d88d69','LEO']];
  for(const [x,y,color,name] of players){
   art+=`<circle cx="${x}" cy="${y}" r="14" fill="${color}"/><text x="${x}" y="${y+2.4}" fill="#111514" font-family="system-ui" font-size="6.4" font-weight="800" text-anchor="middle">${name}</text>`;
  }
 }else if(kind==='spike'){
  const radius=105,start=4.27,end=9.88;
  for(let i=0;i<48;i++){
   const a=start+(end-start)*i/48,b=start+(end-start)*(i+1)/48;
   art+=`<path d="M ${polar(140,155,radius,a)} L ${polar(140,155,92,(a+b)/2)} L ${polar(140,155,radius,b)} Z" fill="#65b7ec"/>`;
  }
  for(const [x,y,color] of [[142,66,'#f78b9c'],[192,87,'#ee99c9'],[223,187,'#77d9c2'],[146,244,'#9c8cf8'],[112,238,'#ffbb7b']]){
   art+=`<circle cx="${x}" cy="${y}" r="6.5" fill="${color}"/>`;
  }
  art+='<path d="M 212 183 Q 165 136 143 121" stroke="#ffe085" stroke-width="2" stroke-dasharray="2 5" opacity=".5"/><circle cx="143" cy="121" r="6.5" fill="#ffe085"/>';
 }else if(kind==='multiplier'){
  const colors=['#a2ef88','#7ddfef','#f49bb4','#ffd093','#bea3ed','#8ea9f3'];
  art=`<path d="M ${polar(140,155,103,-.6)} A 103 103 0 1 1 ${polar(140,155,103,5.06)}" stroke="#8bdfbd" stroke-width="1.6" stroke-linecap="round"/>`;
  for(let i=0;i<118;i++){
   const angle=i*2.39996,r=Math.sqrt(i/118)*98;
   const x=140+Math.cos(angle)*r,y=155+Math.sin(angle)*r;
   art+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${2.1+(i%5)*.32}" fill="${colors[i%colors.length]}"/>`;
  }
  for(let i=0;i<19;i++){
   const x=201+i*2+(i%3)*3,y=71-i*3+Math.sin(i)*7;
   art+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.4" fill="${colors[i%colors.length]}"/>`;
  }
 }else if(kind==='timed'){
  const gapStart=3.3,gapEnd=9.17;
  art=`<path d="M ${polar(140,155,106,gapStart)} A 106 106 0 1 1 ${polar(140,155,106,gapEnd)}" stroke="#8bdfbd" stroke-width="1.6" stroke-linecap="round"/>`;
  for(const [x,y,color] of [[104,121,'#9bf77b'],[160,175,'#b9f7cf'],[95,194,'#aea6f5'],[192,212,'#f98591'],[201,93,'#ffe2ab']]){
   art+=`<circle cx="${x}" cy="${y}" r="6.2" fill="${color}"/>`;
  }
 }else if(kind==='strings'){
  art='<circle cx="140" cy="155" r="111" stroke="#d6dbcf" stroke-width="1.4"/>';
  const balls=[[105,104,'#70b8bd',-2.3],[196,142,'#d98080',-.2],[98,211,'#85b896',2.2],[182,222,'#d8c37a',.8]];
  for(const [x,y,color,a]of balls){for(let i=0;i<9;i++)art+=`<path d="M ${x} ${y} L ${polar(140,155,110,a+(i-4)*.15)}" stroke="${color}" stroke-width=".8" opacity=".65"/>`;art+=`<circle cx="${x}" cy="${y}" r="7" fill="${color}"/>`;}
 }
 return `<svg viewBox="0 0 280 300" preserveAspectRatio="xMidYMid meet" fill="none" aria-hidden="true"><rect width="280" height="300" fill="#111514"/>${art}</svg>`;
}
