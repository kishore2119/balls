import {planScenario} from './scenario.js';
self.onmessage=({data})=>{try{const result=planScenario(data,progress=>self.postMessage({type:'progress',progress}));self.postMessage({type:'done',...result});}catch(error){self.postMessage({type:'error',message:error.message});}};
