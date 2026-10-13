import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=path.resolve('ART_STYLE_FOR_CODEX/trials/interactive');
const approvedCrownHashes={dark:'92811ae316636e3590e1a2ccae13bce3aca05440e3ad7b15a795122426eb1f7a',light:'73a40b8d657a903110837b7d4e9528c44c1172449082ab7b7d68f64193bfd0b2'};
for(const [mode,expected] of Object.entries(approvedCrownHashes)){
  const file=path.resolve('ART_STYLE_FOR_CODEX/trials/S2_clay',mode,'spire_tile.webp');
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),expected,'Owner-approved '+mode+' crown must remain byte-identical');
}
const preparation=JSON.parse(fs.readFileSync(path.join(root,'candidate-preparation-report.json'),'utf8'));
assert.equal(new Set(preparation.map(row=>path.resolve(row.source))).size,preparation.length,'Preparation report must have one current row per canonical source path');
const assetAudit=JSON.parse(fs.readFileSync(path.join(root,'requirement-asset-audit.json'),'utf8'));
for(const row of assetAudit.rows.filter(r=>r.name==='streak_crown_500'&&r.accentFramePct<1)) {
  assert.ok(row.failures.includes('accent_area_outside_1_to_8_pct'),'Crown must not receive the whole-flame accent exception');
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.ok(script.includes('img[data-preview-original-hidden][hidden]{display:none!important}'),'Wrapped unavailable image must be hidden despite inline display:block');
class Element {
  constructor(){this.children=[];this.attrs={};this.dataset={};this.style={setProperty(){}};this.classList={toggle(){},remove(){},add(){}};this.value='';}
  set innerHTML(v){this._html=v;} get innerHTML(){return this._html||'';}
  setAttribute(k,v){this.attrs[k]=v;} appendChild(e){this.children.push(e);return e;}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
const body=new Element();
const document={documentElement:new Element(),getElementById:get,createElement:()=>new Element(),
  querySelector:()=>body,querySelectorAll:()=>[]};
const storage=new Map();
const context=vm.createContext({document,innerWidth:1280,URL,location:{href:'http://local-preview/ART_STYLE_FOR_CODEX/trials/interactive/index.html'},addEventListener(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},console});
vm.runInContext(script,context);
assert.match(get('original').srcdoc,/<base href="http:\/\/local-preview\/docs\/design\/v2-app\/spire\.html">/,'Fragment links must resolve to the actual screen, not a directory that returns404');
assert.equal(vm.runInContext('typeof wireOriginalFragments',context),'function','Srcdoc fragment links need explicit in-frame navigation');
let fragmentHandler,fragmentPrevented=false,fragmentScrolled=false;
const fragmentLink={getAttribute:()=> '#all'};
context.fragmentDoc={documentElement:new Element(),body:{addEventListener:(type,handler)=>{assert.equal(type,'click');fragmentHandler=handler;}},getElementById:id=>id==='all'?{scrollIntoView:()=>{fragmentScrolled=true;}}:null,querySelectorAll:()=>[]};
vm.runInContext('wireOriginalFragments(fragmentDoc)',context);
fragmentHandler({target:{closest:()=>fragmentLink},preventDefault:()=>{fragmentPrevented=true;}});
assert.equal(fragmentPrevented,true,'Fragment navigation must not load another document');
assert.equal(fragmentScrolled,true,'Fragment navigation must scroll to its actual target');
const swatch=get('sws').children.find(e=>e.className==='sw'&&e.attrs['aria-label']==='Оттенок 25');
assert.ok(swatch,'Missing color swatch');
swatch.onclick();
assert.equal(vm.runInContext('theme',context),'custom','Color swatch must activate custom theme');
assert.equal(vm.runInContext('themeSelect.value',context),'custom','Visible theme selector must track custom hue');
assert.match(get('screens').innerHTML,/cards_option_01.webp/);
vm.runInContext("selected.cards=5;render()",context);
assert.match(get('screens').innerHTML,/dark\/cards_option_05.webp/);
assert.match(get('screens').innerHTML,/light\/cards_option_05.webp/);
vm.runInContext("priority='mistakes_entry';render()",context);
assert.match(get('screens').innerHTML,/mistakes_option_01.webp/);
const config=vm.runInContext('CONFIG',context);
assert.deepEqual(Array.from(config.streakTierDays||[]),[0,10,20,30,40,50,60,70,80,90],'Preview must use real app streak thresholds');
vm.runInContext("streakKey='streak_02';render()",context);
assert.match(get('screens').innerHTML,/>10 дней</,'Second stage must show its real ten-day threshold');
vm.runInContext("streakKey='streak_10';render()",context);
assert.match(get('screens').innerHTML,/>90 дней</,'Tenth stage must show its real ninety-day threshold');
assert.ok(config.candidates.streak_01?.length===5,'First streak stage needs five independent variants');
vm.runInContext("streakKey='streak_freeze';render()",context);
assert.match(get('screens').innerHTML,/streak_freeze_option_01.webp/,'Freeze choice must appear in the actual Home header');
vm.runInContext("streakKey='streak_01';selected.streak_01=5;render()",context);
assert.match(get('screens').innerHTML,/streak_01_option_05.webp/,'Stage variant selection must update Home header');
if(!config.candidates.ai_off[0]?.light){
  assert.equal(vm.runInContext("src('S2_clay','light','ai_off',false)",context),null,'Missing light art must not substitute dark art');
  assert.doesNotMatch(vm.runInContext("art('S2_clay','light','ai_off')",context),/src="null"|\/dark\//,'Missing light placeholder must not load null or dark image');
}
const modeImage={dataset:{},src:'initial-dark',hidden:false,getAttribute:()=> 'home_last_lesson.webp',closest:()=>null};
context.modeArtDoc={querySelectorAll:()=>[modeImage]};
if(!config.candidates.continue[0]?.light){
  vm.runInContext("show='light';applyOriginalArt(modeArtDoc)",context);
  assert.equal(modeImage.hidden,true,'Original iframe must hide dark art when the requested light pair is missing');
  vm.runInContext("show='dark';applyOriginalArt(modeArtDoc)",context);
  assert.equal(modeImage.hidden,false,'Returning to valid dark art must restore original visibility');
  assert.match(modeImage.src,/dark\/continue_option_01.webp/);
  vm.runInContext("show='both';render()",context);
}
assert.equal(config.candidates.streak_crown_500,undefined,'Owner-approved crown must have no replacement picker');
assert.equal(config.candidates.spire_tile,undefined,'Approved Spire crown must not acquire a replacement picker');
for(const key of ['ai_off']) {
  assert.ok(Array.isArray(config.candidates[key]),'Missing independent picker '+key);
  assert.ok(config.labels[key],'Missing picker label '+key);
}
assert.equal(vm.runInContext('typeof candidateLayer',context),'function');
assert.match(vm.runInContext("candidateLayer('dark','ai_off',24)",context),/ai_off_option_01/);
if(!config.candidates.ai_off[0]?.light) assert.equal(vm.runInContext("candidateLayer('light','ai_off',24)",context),'','A missing light pair must not show dark art as light');
const aiTile=new Element();aiTile.innerHTML='<svg>original-ai-icon</svg>';
let aiChecked='false';
const aiRow={querySelector:selector=>selector==='.gs-pt'?{textContent:'AI-диалоги'}:selector==='.gs-tile'?aiTile:{getAttribute:()=>aiChecked}};
context.specialDoc={querySelectorAll:selector=>selector==='.gs-pl2'?[aiRow]:[]};
vm.runInContext('applySpecialIcons(specialDoc)',context);
assert.match(aiTile.innerHTML,/ai_off_option_01/);
vm.runInContext('selected.ai_off=2;applySpecialIcons(specialDoc)',context);
assert.match(aiTile.innerHTML,/ai_off_option_02/);
aiChecked='true';vm.runInContext('applySpecialIcons(specialDoc)',context);
assert.equal(aiTile.innerHTML,'<svg>original-ai-icon</svg>','AI-on must restore its original icon');
assert.equal(vm.runInContext('typeof observeSpecialIcons',context),'function','Iframe switches need live wiring');
const liveObservers=[];
class FixtureObserver {
  constructor(callback){this.callback=callback;liveObservers.push(this);}
  observe(target,options){this.target=target;this.options=options;}
  disconnect(){this.disconnected=true;}
}
context.specialDoc.body={};context.specialDoc.defaultView={MutationObserver:FixtureObserver};
vm.runInContext('observeSpecialIcons(specialDoc)',context);
assert.deepEqual(Array.from(liveObservers[0].options.attributeFilter),['aria-checked']);
aiChecked='false';liveObservers[0].callback([{type:'attributes',attributeName:'aria-checked'}]);
assert.match(aiTile.innerHTML,/ai_off_option_02/,'Live off toggle updates icon without parent render');
aiChecked='true';liveObservers[0].callback([{type:'attributes',attributeName:'aria-checked'}]);
assert.equal(aiTile.innerHTML,'<svg>original-ai-icon</svg>','Live on toggle restores original without parent render');
vm.runInContext('observeSpecialIcons(specialDoc)',context);
assert.equal(liveObservers[0].disconnected,true,'Frame reload must disconnect old observer');
for(let rank=1;rank<=6;rank++) {
  assert.ok(Array.isArray(config.candidates['spire_rank_'+rank]),'Missing independent rank picker '+rank);
  assert.ok(config.labels['spire_rank_'+rank],'Missing rank label '+rank);
  for(const option of config.candidates['spire_rank_'+rank]) for(const mode of ['dark','light']) if(option[mode]) {
    assert.equal(typeof option[mode+'Status'],'string','Rank drafts must expose validation status');
  }
}
assert.equal(vm.runInContext('typeof rankForTier',context),'function');
for(let tier=0;tier<12;tier++) assert.equal(vm.runInContext('rankForTier('+tier+')',context),'spire_rank_'+(Math.floor(tier/2)+1));
for(let tier=0;tier<12;tier++) {
  const key='spire_rank_'+(Math.floor(tier/2)+1);
  const option=config.candidates[key].find(v=>v.number===vm.runInContext('selected.'+key,context))||config.candidates[key][0];
  if(!option?.light) assert.equal(vm.runInContext("rankLayer('light',"+tier+",24)",context),'','Missing light rank must not substitute dark art');
}
for(let rank=1;rank<=6;rank++) if(!config.candidates['spire_rank_'+rank].length) {
  assert.equal(vm.runInContext("src('S2_clay','dark','spire_rank_"+rank+"',false)",context),null,'Missing draft must not become a broken fallback image');
}
// Bounded DOM bridge fixture: exercise actual rank injection and repeat selection.
// This is not a browser-layout or screenshot verification.
let rankBridgeChecks=0;
if(config.candidates.spire_rank_6.length>=5) {
  const header=new Element();header.textContent='Гранит · до конца недели 2 д 14 ч';
  get('original').contentDocument={querySelectorAll:()=>[header]};
  vm.runInContext('spireTier=11;applyOriginalRanks()',context);
  assert.match(header.innerHTML,/Алмаз/);
  assert.match(header.innerHTML,/spire_rank_6_option_01/);rankBridgeChecks++;
  vm.runInContext('selected.spire_rank_6=5;applyOriginalRanks()',context);
  assert.match(header.innerHTML,/spire_rank_6_option_05/);rankBridgeChecks++;
  assert.equal(header.dataset.rankOriginal,'Гранит · до конца недели 2 д 14 ч');
  get('original').contentDocument=undefined;
}
const screenBase=get('original').srcdoc.match(/<base href="([^"]+)">/)[1];
assert.equal(new URL('kit.js',screenBase).href,'http://local-preview/docs/design/v2-app/kit.js','File-based fragment fix must preserve relative script paths');
assert.equal(new URL('#all',screenBase).href,'http://local-preview/docs/design/v2-app/spire.html#all','All-participants link must not navigate to404 directory');
assert.equal(Object.keys(config.originalHtml).length,config.pages.length);
for(const options of Object.values(config.candidates)) for(const option of options) for(const key of ['dark','light','darkAccent','lightAccent']) {
  if(option[key]) assert.ok(fs.existsSync(path.resolve(root,option[key])),option[key]);
}
// A revised base must use its own derived mask, never an earlier revision's mask.
let pairedRevisionChecks=0;
for(const options of Object.values(config.candidates)) for(const option of options) for(const mode of ['dark','light']) {
  if(option[mode+'Accent']) {
    assert.equal(option[mode+'Accent'],option[mode].replace(/\.webp$/,'.accent.webp'),'Wrong mask revision: '+option[mode]);
    pairedRevisionChecks++;
  }
}
let themeChecks=0;
for(const theme of Object.keys(config.themes)) for(const mode of ['dark','light']) for(const level of [0,.5,1]) {
  context.testTheme=theme;context.testMode=mode;context.testLevel=level;
  const t=vm.runInContext('theme=testTheme;intensity=testLevel;vars(testMode)',context);
  assert.equal(t.acc.toLowerCase(),config.themes[theme][mode][String(level)].tint.toLowerCase());themeChecks++;
  assert.equal(t.bgTop.toLowerCase(),config.themes[theme][mode][String(level)].bgTop.toLowerCase());
  assert.equal(t.bgBottom.toLowerCase(),config.themes[theme][mode][String(level)].bgBottom.toLowerCase());
}
for(const mode of ['dark','light']){context.testMode=mode;const v=vm.runInContext("theme='custom';vars(testMode)",context);assert.ok(v.bgTop.startsWith('oklch('));assert.ok(v.bgBottom.startsWith('oklch('));assert.ok(!v.bgTop.startsWith('linear-gradient'));}
const tower=fs.readFileSync(path.join(root,'tower-variants.html'),'utf8');
const towerScript=tower.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(towerScript);
const prefix=towerScript.slice(0,towerScript.indexOf("document.getElementById('root').innerHTML"));
const K={icon:()=>'',phone:()=>'',col:()=>'',block:()=>'',sheet:()=>'',energy:()=>'',coins:()=>'',coinImg:()=>'',coin:()=>''};
let towerChecks=0;
for(let tier=0;tier<12;tier++) for(let design=0;design<5;design++) {
  const ctx=vm.createContext({K,URLSearchParams,location:{search:'?tier='+tier+'&design='+design}});
  vm.runInContext(prefix,ctx);
  const svg=vm.runInContext('towerSvg({myFloor:4,sel:4})',ctx);
  assert.equal((svg.match(/data-floor="/g)||[]).length,15);
  assert.match(svg,/class="fl mine sel" data-floor="4"/);
  for(const floor of [5,10,15])assert.ok(svg.includes('data-floor="'+floor+'"'));
  towerChecks++;
}
const atlas=fs.readFileSync(path.join(root,'tower-atlas.html'),'utf8');
assert.equal((atlas.match(/<iframe /g)||[]).length,60);
const evidence={homeSelection:true,lightAndDarkCards:true,candidatePaths:true,streakHeaderChecks:2,missingThemeChecks:4,wrappedHiddenCssCheck:true,pairedRevisionChecks,rankBridgeChecks,specialBridgeChecks:3,liveAiToggleChecks:3,themeEndpointChecks:themeChecks,
  towerGeometryChecks:towerChecks,floorsPerTower:15,comparisonFrames:60,browserVisualVerification:'not performed'};
fs.writeFileSync(path.join(root,'verification-evidence.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence));
