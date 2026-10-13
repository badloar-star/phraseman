import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Counting large, separated accent components verifies the rank numeral's raster
// structure, not its semantic recognition or appearance in the rendered UI.
const rows=[];
for(const mode of ['dark','light']) for(let rank=1;rank<=6;rank++) for(let option=1;option<=5;option++) {
  const directory=path.resolve('ART_STYLE_FOR_CODEX/trials/S2_clay',mode);
  const stem='spire_rank_'+rank+'_option_'+String(option).padStart(2,'0');
  const revisions=fs.readdirSync(directory).filter(f=>new RegExp('^'+stem+'(r[0-9]+)?\\.webp$').test(f));
  revisions.sort((a,b)=>(Number(a.match(/r([0-9]+)\.webp$/)?.[1])||0)-(Number(b.match(/r([0-9]+)\.webp$/)?.[1])||0));
  const base=revisions.at(-1);
  const file=base?.replace(/\.webp$/,'.accent.webp');
  if(!file||!fs.existsSync(path.join(directory,file))){rows.push({mode,rank,option,status:'missing'});continue;}
  const {data,info}=await sharp(path.join(directory,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const count=info.width*info.height,seen=new Uint8Array(count),queue=new Int32Array(count),components=[];
  for(let p=0;p<count;p++) {
    if(seen[p]||data[p*4+3]<=128)continue;
    let head=0,tail=1,mass=0;queue[0]=p;seen[p]=1;
    while(head<tail){
      const current=queue[head++];mass++;
      const x=current%info.width,y=Math.floor(current/info.width);
      const neighbours=[];
      if(x)neighbours.push(current-1);if(x+1<info.width)neighbours.push(current+1);
      if(y)neighbours.push(current-info.width);if(y+1<info.height)neighbours.push(current+info.width);
      for(const next of neighbours)if(!seen[next]&&data[next*4+3]>128){seen[next]=1;queue[tail++]=next;}
    }
    if(mass>=count*.0005)components.push(mass);
  }
  rows.push({mode,rank,option,file,largeComponents:components.length,componentPixels:components,
    status:components.length===rank?'component_count_passed':'wrong_component_count',visualChevronVerification:false});
}
const report={method:'4-neighbour alpha >128 components; minimum size 0.05% canvas',rows,
  passed:rows.filter(r=>r.status==='component_count_passed').length,
  wrong:rows.filter(r=>r.status==='wrong_component_count').length,
  missing:rows.filter(r=>r.status==='missing').length};
fs.writeFileSync('ART_STYLE_FOR_CODEX/trials/interactive/rank-chevron-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,wrong:report.wrong,missing:report.missing}));
for(const row of rows.filter(r=>r.status==='wrong_component_count'))console.log(JSON.stringify(row));
