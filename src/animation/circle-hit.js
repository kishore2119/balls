// Distance along a unit ray to the entry or exit of a circle.
export function circleHit(x,y,ux,uy,radius,exit=false){
 const projection=x*ux+y*uy;
 const offset=x*x+y*y-radius*radius;
 if(!exit&&projection>=0)return Infinity;
 const discriminant=projection*projection-offset;
 if(discriminant<0)return Infinity;
 const distance=-projection+(exit?1:-1)*Math.sqrt(discriminant);
 if(distance>=0)return distance;
 return !exit&&offset<=0?0:Infinity;
}
