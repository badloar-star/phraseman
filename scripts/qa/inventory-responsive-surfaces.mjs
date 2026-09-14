import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
// Static triage only: route candidates include helpers and redirects; a scroll
// marker does not prove that every state is bounded or reachable on a device.
fs.mkdirSync('.codex-tmp/responsive-20260909', { recursive: true });
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=> e.isDirectory() ? (/^(node_modules|dev|motion_showcase|__tests__)$/.test(e.name)?[]:walk(path.join(dir,e.name))) : e.name.endsWith('.tsx')?[path.join(dir,e.name)]:[]);}
const rows=walk(path.join(root,'app')).concat(walk(path.join(root,'components'))).map(file=>{
 const source=fs.readFileSync(file,'utf8'); const rel=path.relative(root,file).replaceAll('\\','/');
 const route=/^app\/(?:\(tabs\)\/)?[^/]+\.tsx$/.test(rel)&&/export default/.test(source);
 const modal=/<Modal[\s>]/.test(source);
 const scroll=/<(?:Animated\.|Reanimated\.)?(?:ResponsiveModalScrollView|BouncyScrollView|ScrollView|FlatList|SectionList|FlashList|AnimatedFlashList)[\s>]/.test(source);
 const delegates=[...source.matchAll(/<([A-Z]\w*(?:Screen|Shell|Modal|Viewport|Session|Player|Reader|List|Surface))[\s>]/g)].map(m=>m[1]);
 return {file:rel,route,modal,scroll,delegates:[...new Set(delegates)],status:scroll?'scroll-present-needs-state-verification':delegates.length?'delegates-to-component':'inspect-overflow',lines:source.split('\n').length};
}).filter(r=>r.route||r.modal);
fs.writeFileSync('.codex-tmp/responsive-20260909/inventory.json',JSON.stringify(rows,null,2));
console.log(JSON.stringify({routes:rows.filter(r=>r.route).length,modals:rows.filter(r=>r.modal).length,needsInspection:rows.filter(r=>r.status==='inspect-overflow').map(r=>r.file)},null,2));
