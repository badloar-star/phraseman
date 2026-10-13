import assert from 'node:assert/strict';
import fs from 'node:fs';

const entry='http://127.0.0.1:8893/';
const response=await fetch(entry);
assert.equal(response.status,200);
assert.ok(response.headers.get('content-type').startsWith('text/html'));
assert.ok(response.url.endsWith('/ART_STYLE_FOR_CODEX/trials/interactive/index.html'),'Root must redirect so relative art URLs resolve correctly');
const html=await response.text();
const config=JSON.parse(html.match(/const CONFIG=(.+);\r?\n/)[1]);
const urls=new Set(['/docs/design/v2-app/kit.js','/docs/design/v2-app/kit.css'].map(p=>new URL(p,entry).href));
for(const options of Object.values(config.candidates))for(const option of options)for(const key of ['dark','light','darkAccent','lightAccent'])if(option[key])urls.add(new URL(option[key],response.url).href);
const work=[...urls],failures=[];let checked=0;
await Promise.all(Array.from({length:8},async()=>{while(work.length){const url=work.pop();const result=await fetch(url,{method:'HEAD'});checked++;if(result.status!==200)failures.push({url,status:result.status});}}));
for(const forbidden of ['/.env.local','/.git/config','/package.json'])assert.equal((await fetch(new URL(forbidden,entry),{method:'HEAD'})).status,404,'Preview must not expose '+forbidden);
const evidence={documentUrl:response.url,contentType:response.headers.get('content-type'),resourcesChecked:checked,failures,privatePathsDenied:3,browserRenderingVerified:false};
fs.writeFileSync('ART_STYLE_FOR_CODEX/trials/interactive/http-preview-evidence.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));assert.equal(failures.length,0,'Preview resource failures');
