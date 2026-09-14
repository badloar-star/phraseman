import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const root=process.cwd();
const dir=path.join(root,'docs/v2/mockups/2026-09-12-five-directions');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'product.css'),'utf8');
const editorCss=fs.readFileSync(path.join(dir,'editor.css'),'utf8');
const source=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const postcss=require('postcss'); postcss.parse(css);postcss.parse(editorCss);
for(const match of [...html.matchAll(/(?:src|href)="([^"#]+)"/g),...css.matchAll(/url\(['"]?([^'"()]+)['"]?\)/g)]){
  if(/^(https?:|data:)/.test(match[1]))continue;
  assert.ok(fs.existsSync(path.resolve(dir,match[1])),`Missing local asset ${match[1]}`);
}
const rootNode={addEventListener(){},classList:{toggle(){}},querySelectorAll:()=>[]};
const context={window:{},document:{querySelector:()=>rootNode,querySelectorAll:()=>[],body:rootNode},matchMedia:()=>({matches:true}),Set,Map,setTimeout,clearTimeout};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(dir,'data.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(dir,'theme-tokens.js'),'utf8'),context);
const instrumented=source.replace("drawGallery();configureScreen(window.V2_INITIAL_SCREEN || 'lessons');", "window.renderProbe={directions,screens,variants,initialState,lessonList,lessonMap,nodeScreen,sessionModal,introScreen,wordScreen,pocketScreen,completionScreen,centeredScrollTop,enterPocket,leavePocket};");
vm.runInContext(instrumented,context);
const api=context.window.renderProbe;
const effectiveState=context.window.V2_PROTOTYPE.effectiveState;
assert.equal(api.directions.length,5);
assert.equal(context.window.V2_DESIGN_DATA.lessons.length,32);
assert.equal(api.initialState().filter,'a1','The catalog opens on the level containing lesson 1');
// Evaluate only the owner's pure title reader, never its publishing/build entry point.
const courseRoot=path.join(root,'content/learning-v2-course');
const ownerBuilder=fs.readFileSync(path.join(courseRoot,'pipeline/build_mockup.mjs'),'utf8');
const titleReader=/function curriculumLessonTitles\(lang\) \{[\s\S]*?\n\}/.exec(ownerBuilder)?.[0];
assert.ok(titleReader,'Owner mock title reader must remain identifiable');
const ownerTitles=vm.runInNewContext(`${titleReader}; curriculumLessonTitles('en')`,{fs,path,ROOT:courseRoot});
assert.equal(ownerTitles.size,32);
assert.equal(Object.keys(context.window.V2_THEME_TOKENS).length,9);
for(const lesson of context.window.V2_DESIGN_DATA.lessons){
  assert.equal(lesson.title,ownerTitles.get(`l${String(lesson.id).padStart(2,'0')}`),`Lesson ${lesson.id}: use Система, never Арка`);
}
const renderer={lessons:api.lessonList,map:api.lessonMap,nodes:api.nodeScreen,modal:api.sessionModal,intro0:api.introScreen,intro1:api.introScreen,intro2:api.introScreen,word:api.wordScreen,pocket:api.pocketScreen,complete:api.completionScreen};
for(const scale of [0.61,0.89,1]) {const y=api.centeredScrollTop(100,800,390,scale);assert.ok(Math.abs(800-(y-100)*scale-390)<0.001,'Node must land at phone center at every zoom');}
const active=api.initialState();active.screen='intro';active.intro=2;active.answers={0:0,1:0,2:0};active.runes=9;const answers=active.answers;
assert.equal(api.enterPocket(active),true);assert.equal(api.enterPocket(active),false);api.leavePocket(active);assert.equal(active.screen,'intro');assert.equal(active.intro,2);assert.equal(active.answers,answers);assert.equal(active.runes,9);
active.screen='word';active.status='normal';active.flipped=false;api.enterPocket(active);api.leavePocket(active);assert.equal(active.screen,'word');assert.equal(active.status,'normal');assert.equal(active.flipped,false);
const introState=api.initialState();introState.screen='intro';introState.inspection='completed';
assert.equal(effectiveState(introState),'normal','Modal inspection cannot leak into intro state');
introState.answers[0]=1;assert.equal(effectiveState(introState),'wrong');
introState.answers[0]=0;assert.equal(effectiveState(introState),'correct');
introState.hearts=0;assert.equal(effectiveState(introState),'exhausted');
const cardState=api.initialState();cardState.screen='word';cardState.flipped=true;assert.equal(effectiveState(cardState),'flipped');
cardState.flipped=false;cardState.saved.add('here');assert.equal(effectiveState(cardState),'saved');
let renders=0;
for(const d of api.directions){
  for(const [screen,states] of Object.entries(api.variants))for(const [status]of states){
    const s=api.initialState();s.status=status;if(screen==='lessons')s.filter='a1';if(screen.startsWith('intro')){s.intro=Number(screen.at(-1));if(status==='exhausted')s.hearts=0;const page=context.window.V2_DESIGN_DATA.intros[s.intro];if(status==='correct')s.answers[s.intro]=page.correct;if(status==='wrong')s.answers[s.intro]=(page.correct+1)%3;}
    const markup=renderer[screen](d.id,s);renders++;
    assert.ok(!markup.includes('undefined'),`${d.id}/${screen}/${status} undefined`);
    assert.ok(!markup.includes('Войти в мир'));
    if(screen==='lessons'&&status!=='loading'){
      assert.equal((markup.match(/data-action="open-lesson"/g)||[]).length,8);
      const text=markup.replace(/&#39;/g,"'").replace(/&amp;/g,'&');
      for(const title of [...ownerTitles.values()].slice(0,8))assert.ok(text.includes(title),`${d.id}: A1 title`);
    }
    if(screen==='map'){assert.equal((markup.match(/data-row="/g)||[]).length,56);assert.ok(markup.includes(ownerTitles.get('l01')));assert.ok(!markup.includes('Продолжить сессию'));}
    if(screen==='modal'){assert.ok(markup.includes('role="dialog"'));assert.equal((markup.match(/data-action="session"/g)||[]).length,0,'Modal art must not be a dead button');}
    if(screen.startsWith('intro'))assert.equal((markup.match(/data-choice="/g)||[]).length,3);
    if(screen==='word'){assert.ok(s.words.includes('here'),'Word unlocks on presentation');assert.ok(markup.includes(context.window.V2_DESIGN_DATA.wordDefinition));}
    if(screen==='complete'){assert.equal((markup.match(/data-action="rate-complete"/g)||[]).length,5);assert.ok(markup.includes('data-action="completion-feedback"'));assert.ok(markup.includes('stars_10.webp'));assert.ok(markup.includes('+120'));assert.ok(markup.includes('+8'));}
  }
}
const levelRanges={a1:[1,2,3,4,5,6,7,8],a2:[9,10,11,12,13,14,15,16],b1:[17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]};
for(const d of api.directions)for(const [level,expected] of Object.entries(levelRanges)){
  const s=api.initialState();s.filter=level;
  const markup=api.lessonList(d.id,s);
  const visible=[...markup.matchAll(/data-lesson="(\d+)"/g)].map(match=>Number(match[1]));
  assert.deepEqual(visible,expected,`${d.id}/${level}: selected level is the catalog data set`);
}
const variants = new Set();postcss.parse(css).walkRules(rule=>{if(/direction\[data-style=/.test(rule.selector))variants.add(rule.selector.match(/data-style=(\w+)/)[1])});assert.equal(variants.size,5,'All five structural style overrides');
postcss.parse(css).walkRules(rule=>{
  if(!rule.selector.includes('[data-style='))return;
  rule.walkDecls(decl=>assert.ok(!['--accent','--bg','--surface','--ink','font-family'].includes(decl.prop),'Styles cannot redefine shared palette or font'));
});
for(const name of ['lessonList','lessonMap','sessionModal','introScreen','completionScreen']){
  const signatures=new Set(api.directions.map(d=>{
    const markup=api[name](d.id,api.initialState());
    // Structure must differ even when text, classes and attributes are removed.
    return [...markup.matchAll(/<\/?[a-z][^>]*>/g)].map(m=>m[0].match(/^<\/?[a-z]+/)[0]).join('');
  }));
  assert.equal(signatures.size,5,`${name}: five different DOM structures, not recolors`);
}
console.log(`PASS: ${renders} template states; 5 styles; 32 lesson titles; 56 map nodes; 3 intro questions per style; local assets and CSS syntax. This is source/template verification, NOT browser/device visual QA.`);

// Editor pure contracts run without a browser or simulated layout engine.
const editorSource=fs.readFileSync(path.join(dir,'editor.js'),'utf8');
const editorBootstrap=editorSource.slice(0,editorSource.indexOf('  const panel=document.createElement'));
const extract=(from,to)=>editorSource.slice(editorSource.indexOf(from),editorSource.indexOf(to,editorSource.indexOf(from)));
const editorContext={window:{V2_PROTOTYPE:context.window.V2_PROTOTYPE,V2_THEME_TOKENS:context.window.V2_THEME_TOKENS},localStorage:{getItem:()=>null},document:{},HTMLElement:class{},Map,Set};
vm.runInNewContext(editorBootstrap+extract('  const toCss=','  function apply()')+'window.probe={validDocument,declarations,screenCss,resolvedElementProps,controls,screenControls,blank};})();',editorContext);
const editor=editorContext.window.probe;
assert.equal(editor.controls.length,16);assert.equal(editor.screenControls.length,9);
let scopes=0;
for(const d of api.directions)for(const [page,states]of Object.entries(api.variants))for(const status of ['*',...states.map(s=>s[0])]){
  const settings=editor.blank();const key=[d.id,page,status].join('/');
  settings.edits[key]={screen:{bodySize:20,mapStep:168},elements:{'root/button-action:1':{width:142,height:96,x:-20,y:17,animationDuration:2.3}}};
  settings.notes[key]='Сохранить большие элементы';
  const roundtrip=editor.validDocument(JSON.parse(JSON.stringify(settings)));
  assert.equal(roundtrip.edits[key].elements['root/button-action:1'].width,142);
  assert.equal(roundtrip.notes[key],'Сохранить большие элементы');scopes++;
}
const invalid=editor.blank();invalid.edits['atlas/intro0/completed']={screen:{},elements:{}};
assert.throws(()=>editor.validDocument(invalid),/состояние/);
for(const props of [{fontSize:Infinity},{x:999},{color:'url(bad)'},{width:'100; color:red'}]){
  const bad=editor.blank();bad.edits['atlas/lessons/*']={screen:{},elements:{root:props}};assert.throws(()=>editor.validDocument(bad));
}
const injection=editor.blank();injection.edits['atlas/lessons/*']={screen:{},elements:{'root/"]{color:red}':{width:20}}};assert.throws(()=>editor.validDocument(injection));
assert.ok(editor.declarations({x:20,y:-14,scale:1.2}).includes('translate:20px -14px!important'));
assert.ok(editor.declarations({x:20,y:-14,scale:1.2}).includes('scale:1.2!important'),'Keep layout offset independent of transform animation');
assert.ok(editor.screenCss('[data-screen="map"]',{nodeSize:120,mapStep:170}).includes('height:170px!important'));
const inherited=editor.blank();inherited.edits['atlas/intro0/*']={screen:{},elements:{root:{x:40}}};
const merged=editor.resolvedElementProps(inherited,'atlas/intro0/correct','root',{y:20});
assert.equal(merged.x,40);assert.equal(merged.y,20);assert.ok(editor.declarations(merged).includes('translate:40px 20px!important'));
for(const name of ['--line-start-x','--line-start-y']){assert.ok(editorSource.includes(name));assert.ok(css.includes(name));}
assert.ok(editorSource.includes('measured:false'),'Hidden variants must not claim zero-size geometry');
assert.ok(editorSource.includes('elementsFromPoint'),'Picker can target disabled controls through its shield');
assert.ok(editorSource.includes('if(inputTransaction!==input){checkpoint();inputTransaction=input;}'),'Typing/paste creates undo history');
console.log(`PASS: editor ${scopes} style/screen/state import-export scopes; 25 controls; invalid values/selectors rejected; effective state projection. Browser interaction and visual QA remain unverified.`);




