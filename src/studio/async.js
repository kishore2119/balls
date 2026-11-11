export const abortError=()=>new DOMException('Export cancelled.','AbortError');

export function abortable(task,signal){
 if(!signal)return Promise.resolve(task);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(abortError());
  const finish=(callback,value)=>{signal.removeEventListener('abort',abort);callback(value);};
  Promise.resolve(task).then(value=>finish(resolve,value),error=>finish(reject,error));
  if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
 });
}
