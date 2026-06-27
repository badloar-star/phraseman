import https from 'https'; import fs from 'fs'; import os from 'os'; import path from 'path';
const s = JSON.parse(fs.readFileSync(path.join(os.homedir(),'.expo','state.json'),'utf8'));
const secret = s.auth.sessionSecret;
function gql(q,v){return new Promise((res,rej)=>{const body=JSON.stringify({query:q,variables:v});const r=https.request({hostname:'api.expo.dev',path:'/graphql',method:'POST',headers:{'Content-Type':'application/json','expo-session':secret,'Content-Length':Buffer.byteLength(body)}},x=>{let b='';x.on('data',d=>b+=d);x.on('end',()=>{try{res(JSON.parse(b))}catch(e){res({raw:b})}})});r.on('error',rej);r.write(body);r.end();});}
const SUB='a261a8c0-d1bf-4265-b66d-d720ad7653fe';
const r = await gql('query($id:ID!){submissions{byId(submissionId:$id){id status platform error{errorCode message}}}}',{id:SUB});
console.log('iOS submission (build 86):', JSON.stringify(r.data?.submissions?.byId||r));
