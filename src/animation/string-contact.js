const EPS=1e-6;
const clamp=value=>Math.max(0,Math.min(1,value));
const lerp=(a,b,t)=>a+(b-a)*t;
const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const evaluate=(coefficients,t)=>{let value=0;for(let i=coefficients.length-1;i>=0;i--)value=value*t+coefficients[i];return value;};

// Isolate every real root on [0,1], including tangencies at derivative roots.
// The collision equation is at most quartic, so subdivision work stays bounded.
function roots01(input){
 const coefficients=[...input],scale=Math.max(...coefficients.map(Math.abs),1);
 while(coefficients.length>1&&Math.abs(coefficients.at(-1))<scale*1e-14)coefficients.pop();
 const degree=coefficients.length-1;if(!degree)return [];
 if(degree===1){const root=-coefficients[0]/coefficients[1];return root>=-1e-10&&root<=1+1e-10?[clamp(root)]:[];}
 const critical=roots01(coefficients.slice(1).map((value,index)=>value*(index+1))),bounds=[0,...critical.filter(t=>t>0&&t<1),1],roots=[];
 for(const t of bounds)if(Math.abs(evaluate(coefficients,t))<=scale*1e-11)roots.push(t);
 for(let i=1;i<bounds.length;i++){
  let low=bounds[i-1],high=bounds[i],left=evaluate(coefficients,low),right=evaluate(coefficients,high);
  if(left===0||right===0||Math.sign(left)===Math.sign(right))continue;
  for(let iteration=0;iteration<42;iteration++){const middle=(low+high)/2,value=evaluate(coefficients,middle);if(Math.sign(value)===Math.sign(left)){low=middle;left=value;}else high=middle;}
  roots.push((low+high)/2);
 }
 return roots.sort((a,b)=>a-b).filter((value,index,list)=>!index||value-list[index-1]>1e-9);
}

export function closestOnString(point,owner,anchor){
 const dx=owner.x-anchor.x,dy=owner.y-anchor.y,length=dx*dx+dy*dy,projection=length?clamp(((point.x-anchor.x)*dx+(point.y-anchor.y)*dy)/length):0;
 const x=anchor.x+dx*projection,y=anchor.y+dy*projection;return {x,y,distance:Math.hypot(point.x-x,point.y-y)};
}

// Both the ball and the ball-attached string endpoint move over this interval.
// Test the full circular ball against the string body and both endpoint caps.
export function movingStringContact(start,end,ownerStart,ownerEnd,anchor,radius){
 const minimumX=Math.min(ownerStart.x,ownerEnd.x,anchor.x)-radius,maximumX=Math.max(ownerStart.x,ownerEnd.x,anchor.x)+radius;
 const minimumY=Math.min(ownerStart.y,ownerEnd.y,anchor.y)-radius,maximumY=Math.max(ownerStart.y,ownerEnd.y,anchor.y)+radius;
 if(Math.max(start.x,end.x)<minimumX||Math.min(start.x,end.x)>maximumX||Math.max(start.y,end.y)<minimumY||Math.min(start.y,end.y)>maximumY)return null;
 const initial=closestOnString(start,ownerStart,anchor);if(initial.distance<=radius+EPS)return {t:0,x:initial.x,y:initial.y,ownerX:ownerStart.x,ownerY:ownerStart.y};
 const px=start.x-anchor.x,py=start.y-anchor.y,vx=end.x-start.x,vy=end.y-start.y,ux=ownerStart.x-anchor.x,uy=ownerStart.y-anchor.y,wx=ownerEnd.x-ownerStart.x,wy=ownerEnd.y-ownerStart.y;
 // A Lipschitz bound quickly rejects strings farther away than either body can travel.
 if(initial.distance>radius+Math.hypot(vx,vy)+Math.hypot(wx,wy)+EPS)return null;
 const circleRoots=(x,y,dx,dy)=>roots01([x*x+y*y-radius*radius,2*(x*dx+y*dy),dx*dx+dy*dy]);
 const candidates=[...circleRoots(px,py,vx,vy),...circleRoots(px-ux,py-uy,vx-wx,vy-wy),1];
 const c0=cross(px,py,ux,uy),c1=cross(vx,vy,ux,uy)+cross(px,py,wx,wy),c2=cross(vx,vy,wx,wy);
 candidates.push(...roots01([c0*c0-radius*radius*(ux*ux+uy*uy),2*c0*c1-2*radius*radius*(ux*wx+uy*wy),c1*c1+2*c0*c2-radius*radius*(wx*wx+wy*wy),2*c1*c2,c2*c2]));
 candidates.sort((a,b)=>a-b);
 for(const t of candidates){const owner={x:lerp(ownerStart.x,ownerEnd.x,t),y:lerp(ownerStart.y,ownerEnd.y,t)},point={x:lerp(start.x,end.x,t),y:lerp(start.y,end.y,t)},nearest=closestOnString(point,owner,anchor);if(nearest.distance<=radius+EPS)return {t,x:nearest.x,y:nearest.y,ownerX:owner.x,ownerY:owner.y};}
 return null;
}

export function positionOnPath(path,t){
 for(let i=1;i<path.length;i++){const end=path[i],start=path[i-1];if(t<=end.t+1e-10){const fraction=end.t>start.t?clamp((t-start.t)/(end.t-start.t)):1;return {x:lerp(start.x,end.x,fraction),y:lerp(start.y,end.y,fraction)};}}
 return path.at(-1);
}

export function pathStringContact(cutterPath,ownerPath,anchor,radius,startTime=0){
 const times=[startTime,1,...cutterPath.map(p=>p.t),...ownerPath.map(p=>p.t)].filter(t=>t>=startTime).sort((a,b)=>a-b).filter((t,i,list)=>!i||t-list[i-1]>1e-10);
 if(times.length===1)times.push(times[0]);
 for(let i=1;i<times.length;i++){const low=times[i-1],high=times[i],hit=movingStringContact(positionOnPath(cutterPath,low),positionOnPath(cutterPath,high),positionOnPath(ownerPath,low),positionOnPath(ownerPath,high),anchor,radius);if(hit)return {...hit,t:low+(high-low)*hit.t};}
 return null;
}
