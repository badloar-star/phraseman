import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const allowed=['ART_STYLE_FOR_CODEX','docs/design/v2-app'].map(p=>fs.realpathSync(path.join(root,p)));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff'};
const port=Number(process.env.PHRASEMAN_ICON_PREVIEW_PORT||8893);
http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(pathname==='/'){res.writeHead(302,{'Location':'/ART_STYLE_FOR_CODEX/trials/interactive/index.html','Cache-Control':'no-store'});res.end();return;}
    const relative=pathname.replace(/^\/+/, '');
    const file=fs.realpathSync(path.resolve(root,relative));
    const permitted=allowed.some(directory=>{const rel=path.relative(directory,file);return rel!==''&&!rel.startsWith('..')&&!path.isAbsolute(rel);});
    const type=types[path.extname(file).toLowerCase()];
    if(!permitted||!type||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch{res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log('Icon preview: http://127.0.0.1:'+port+'/'));
