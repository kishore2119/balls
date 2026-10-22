import {sanitizeProject} from '../config.js';
const KEY='orbit-studio-current-v2',PRESETS='orbit-studio-presets-v2';
export function loadCurrent(){try{const raw=localStorage.getItem(KEY);return raw?sanitizeProject(JSON.parse(raw)):null;}catch{return null;}}
export function saveCurrent(project){localStorage.setItem(KEY,JSON.stringify(project));}
export function presets(){try{const data=JSON.parse(localStorage.getItem(PRESETS)||'[]');return Array.isArray(data)?data:[];}catch{return[];}}
export function savePreset(project,name){const list=presets(),entry={id:crypto.randomUUID(),name:name.trim().slice(0,80)||'My escape',savedAt:Date.now(),project:structuredClone(project)};list.unshift(entry);localStorage.setItem(PRESETS,JSON.stringify(list.slice(0,40)));return entry;}
export function deletePreset(id){localStorage.setItem(PRESETS,JSON.stringify(presets().filter(item=>item.id!==id)));}
let database;
function open(){return database??=new Promise((resolve,reject)=>{const request=indexedDB.open('orbit-studio-assets',1);request.onupgradeneeded=()=>request.result.createObjectStore('assets',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function putAsset(file,kind){const db=await open(),asset={id:crypto.randomUUID(),name:file.name,kind,blob:file,createdAt:Date.now()};await new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite');tx.objectStore('assets').put(asset);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});return asset;}
export async function getAsset(id){if(!id)return null;const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction('assets').objectStore('assets').get(id);request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});}
