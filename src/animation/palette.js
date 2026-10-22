const hex = value => /^#[0-9a-f]{6}$/i.test(value || '');
export function paletteColors(appearance) {
 const colors=appearance.colors?.filter(hex).slice(0,12);
 return colors?.length ? colors : [appearance.startColor,appearance.endColor];
}
export function segmentIndex(index,total,count){return Math.min(count-1,Math.floor(index*count/Math.max(1,total)));}
export function segmentCounts(total,count){const counts=Array(count).fill(0);for(let i=0;i<total;i++)counts[segmentIndex(i,total,count)]++;return counts;}
export function blendColor(colors,position){
 const p=Math.max(0,Math.min(1,position))*(colors.length-1),i=Math.floor(p),a=colors[i],b=colors[Math.min(i+1,colors.length-1)],t=p-i;
 return '#'+[1,3,5].map(offset=>Math.round(parseInt(a.slice(offset,offset+2),16)*(1-t)+parseInt(b.slice(offset,offset+2),16)*t).toString(16).padStart(2,'0')).join('');
}
export function ringColor(appearance,index,total){const colors=paletteColors(appearance);return appearance.gradient!==false?blendColor(colors,index/Math.max(1,total-1)):colors[segmentIndex(index,total,colors.length)];}
export function resizePalette(colors,count){return Array.from({length:count},(_,i)=>blendColor(colors,i/Math.max(1,count-1)));}
