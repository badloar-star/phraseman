import https from 'https'; import fs from 'fs'; import os from 'os'; import path from 'path'; import zlib from 'zlib';
const s = JSON.parse(fs.readFileSync(path.join(os.homedir(),'.expo','state.json'),'utf8'));
const secret = s.auth.sessionSecret;
function gql(){return new Promise((res,rej)=>{const q=JSON.stringify({query:'query($id:ID!){builds{byId(buildId:$id){logFiles}}}',variables:{id:'8f782e89-b885-4ae7-b038-57a2afec1ad7'}});const r=https.request({hostname:'api.expo.dev',path:'/graphql',method:'POST',headers:{'Content-Type':'application/json','expo-session':secret,'Content-Length':Buffer.byteLength(q)}},x=>{let b='';x.on('data',d=>b+=d);x.on('end',()=>res(JSON.parse(b)))});r.on('error',rej);r.write(q);r.end();});}
function get(url){return new Promise((res,rej)=>{https.get(url,x=>{const chunks=[];x.on('data',d=>chunks.push(d));x.on('end',()=>res(Buffer.concat(chunks)))}).on('error',rej);});}
const m=await gql();
const url=m.data.builds.byId.logFiles[0];
const raw=await get(url);
let txt;
try{txt=zlib.gunzipSync(raw).toString('utf8')}catch(e){try{txt=zlib.brotliDecompressSync(raw).toString('utf8')}catch(e2){txt=raw.toString('utf8')}}
fs.writeFileSync(path.resolve('./.eas-logs/gradle.txt'),txt);
console.log('wrote', txt.length, 'chars');
