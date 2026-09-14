// Read-only curriculum projection. Does not invoke the owner mock's build/publish.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../../..');
const plan=fs.readFileSync(path.join(root,'content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md'),'utf8');
const overview=/^## 32 урока\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(plan)?.[1]??'';
const titles=new Map();
for(const line of overview.split(/\r?\n/)){
  const cells=line.split('|').map(cell=>cell.trim());
  if(cells.length!==7||!/^\d+$/.test(cells[1]))continue;
  titles.set(Number(cells[1]),cells[2].replace(/[*`]/g,'').replace(/\s*⚠️/g,'').trim());
}
if(titles.size!==32)throw new Error('Expected 32 system titles; no partial write');
const context={window:{}};
const file=path.join(dir,'data.js');
vm.runInNewContext(fs.readFileSync(file,'utf8'),context);
const data=context.window.V2_DESIGN_DATA;
for(const lesson of data.lessons){
  if(!titles.has(lesson.id))throw new Error(`No title for ${lesson.id}`);
  lesson.title=titles.get(lesson.id);lesson.grammar=lesson.title;
}
fs.writeFileSync(file,`window.V2_DESIGN_DATA = ${JSON.stringify(data,null,2)};\n`);
console.log('Synced all 32 lesson titles from Система; intro/feedback/word data preserved.');
