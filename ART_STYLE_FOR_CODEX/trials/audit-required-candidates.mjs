import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { accentAlignment } from '../../scripts/accent_alignment.mjs';

const out=path.resolve('ART_STYLE_FOR_CODEX/trials/interactive');
const req=JSON.parse(fs.readFileSync(path.join(out,'requirements.json'),'utf8'));
const names=[...new Set([...req.main,...req.streak,...req.ranks,...req.crown,...req.flags,...req.legacy,...req.dialogueThemes,...req.aiOff,
  ...req.scenarios.map(s=>'dialog_scene_'+s.id),...(req.uiCategories||[]).flatMap(c=>c.icons.map(i=>i.id))])];
const aliases={phrase_of_day:'phrase',mistakes_entry:'mistakes',cards_from_video:'video'};
const report=[];
for(const name of names) for(let option=1;option<=req.variantsPerIcon;option++) for(const mode of req.brightnesses){
  const prefix=aliases[name]||name,stem=prefix+'_option_'+String(option).padStart(2,'0');
  const dir=path.resolve('ART_STYLE_FOR_CODEX/trials/S2_clay',mode);
  const revisions=fs.readdirSync(dir).filter(f=>new RegExp('^'+stem+'(r[0-9]+)?\\.webp$').test(f));
  revisions.sort((a,b)=>(Number(a.match(/r([0-9]+)\.webp$/)?.[1])||0)-(Number(b.match(/r([0-9]+)\.webp$/)?.[1])||0));
  const file=revisions.at(-1);
  const row={name,option,mode,status:'missing'};
  if(!file){report.push(row);continue;}
  const base=path.join(dir,file),accent=base.replace('.webp','.accent.webp');
  row.base=base;row.accent=accent;row.status='incomplete';row.failures=[];
  const bm=await sharp(base).metadata();
  if(bm.width!==1024||bm.height!==1024)row.failures.push('base_dimensions');
  if(!bm.hasAlpha)row.failures.push('base_missing_alpha');
  if(fs.statSync(base).size>409600)row.failures.push('base_over_400kb');
  const basePixels=await sharp(base).ensureAlpha().raw().toBuffer();
  let transparent=0;for(let i=3;i<basePixels.length;i+=4)if(basePixels[i]===0)transparent++;
  if(!transparent)row.failures.push('no_transparent_pixels');
  if(!fs.existsSync(accent)){row.failures.push('accent_missing');report.push(row);continue;}
  const am=await sharp(accent).metadata();
  if(am.width!==1024||am.height!==1024||!am.hasAlpha)row.failures.push('accent_format');
  const accentPixels=await sharp(accent).ensureAlpha().raw().toBuffer();
  let white=true,mass=0;
  for(let i=0;i<accentPixels.length;i+=4){const a=accentPixels[i+3];if(a>24&&accentPixels.subarray(i,i+3).some(v=>v!==255))white=false;if(a>128)mass++;}
  if(!white)row.failures.push('accent_not_white');
  row.accentFramePct=+(100*mass/(1024*1024)).toFixed(3);
  // Flame and ice overlays may legitimately color their whole component.
  const wholeComponentAccent=/^streak_(?:\d{2}|freeze(?:_overlay)?)$/.test(name);
  if(!wholeComponentAccent&&(row.accentFramePct<1||row.accentFramePct>8))row.failures.push('accent_area_outside_1_to_8_pct');
  row.alignment=await accentAlignment(base,accent);
  if(!row.alignment.ok)row.failures.push('accent_alignment');
  if(!row.failures.length)row.status='asset_checks_passed';
  report.push(row);
}
const totals={iconsRequired:names.length,candidatePairsRequired:report.length,
  candidatePairsMissing:report.filter(r=>r.status==='missing').length,
  candidatePairsIncomplete:report.filter(r=>r.status==='incomplete').length,
  candidatePairsAssetChecksPassed:report.filter(r=>r.status==='asset_checks_passed').length,
  browserAndScreenCoverageVerified:false,fullGoalComplete:false};
fs.writeFileSync(path.join(out,'requirement-asset-audit.json'),JSON.stringify({totals,rows:report},null,2));
console.log(JSON.stringify(totals));
console.log('Failures: '+JSON.stringify(report.filter(r=>r.failures?.length).map(r=>({name:r.name,option:r.option,mode:r.mode,failures:r.failures,accentFramePct:r.accentFramePct}))));
