import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, '.codex-tmp/responsive-20260909');
await fs.mkdir(out, { recursive: true });
const stubs = {
  'react-native-reanimated': `import React from 'react'; import {View, Text, Pressable} from 'react-native'; export default {View,Text,createAnimatedComponent:c=>c}; export const useSharedValue=v=>React.useRef({value:v}).current; export const useAnimatedStyle=f=>f(); export const withTiming=(v,c,cb)=>v; export const withSpring=v=>v; export const withDelay=(d,v)=>v; export const cancelAnimation=()=>{}; export const runOnJS=f=>f; export const Easing={out:f=>f,cubic:x=>x};`,
  'expo-linear-gradient': `import React from 'react'; import {View} from 'react-native'; export const LinearGradient=({colors,locations,start,end,...p})=><View {...p}/>;`,
  '@expo/vector-icons/Ionicons': `import React from 'react'; import {View} from 'react-native'; export default ({size=24})=><View style={{width:size,height:size}}/>;`,
  'expo-router': `export const useRouter=()=>({back(){}}); export const usePathname=()=>'/arena_match';`,
  'ThemeContext': `export const useTheme=()=>({themeMode:'dark',theme:{textPrimary:'#ffffff',textSecondary:'#aaa',accent:'#acee77',bgCard:'#222',bg:'#111'}, f:{body:17,h2:26}});`,
  'LangContext': `export const useLang=()=>({lang:'ru'});`,
  'v2_theme': `const P=new Proxy({bg:'#111',text:'#eee',muted:'#aaa',accent:'#acee77',okInk:'#111'},{get:(o,k)=>o[k]??'#444'}); export const useTournamentPalette=()=>P; export const hexToRgba=()=> '#444'; export const METAL={ctaGold:['#ffd','#dc7'],ctaGoldShelf:'#665',ctaGoldInk:'#111'}; export const radius={lg:26,md:18,sm:12}; export const v2motion={press:120,fast:180,slow:320};`,
  'V2Fx': `import React from 'react'; export const StarGlyph=()=>null; export const TournamentFxHost=React.forwardRef(()=>null);`,
  'use-haptics': `export const hapticTap=()=>{};export const hapticMediumImpact=()=>{};`,
  'use_arena_sound': `export const useArenaSound=()=>()=>{};`,
  'use_reduce_motion': `export const useReduceMotion=()=>true;`,
  'stable_safe_area_metrics': `export const useStableSafeAreaInsets=()=>({top:24,bottom:24,left:0,right:0});`,
  'navigation_back': `export const navigationFallbackForPath=()=>'/arena';export const safeRouterBack=()=>{};`,
  'ScreenGradient': `import React from 'react';import {View} from 'react-native';export default ({artBackdrop,style,...p})=><View {...p} style={[{flex:1,backgroundColor:'#14131c'},style]}/>;`,
  'learning_v2_intro_theme': `export const introTargetTextColor=()=>'#aaaaff';`,
  'keyboardAvoidance': `export const useKeyboardBottomInset=()=>0;`,
  'motionHybrid': `export const LUM={resolveMs:0,backdropMs:0,exitMs:0,ladder:[0,0],settle:{}};export const PRESS={downMs:0,release:{}};`,
  'i18n': `export const triLang=(lang,values)=>values[lang]??values.ru;`,
  'use_reward_impact_hybrid': `export const useRewardImpactHybrid=()=>({styles:new Proxy({},{get:()=>({})}),showRings:false,dustCount:0});`,
  'RewardImpactRings': `export default ()=>null;`,
  'RetiredRasterFallback': `import React from 'react';import {View} from 'react-native';export default ({size})=><View style={{width:size,height:size}}/>;`,
};
const stubPlugin = {name:'native-services-only',setup(b){
  b.onResolve({filter:/.*/},args=>{
    if(args.path==='react-native')return {path:'native-web-shim',namespace:'shim'};
    const key=Object.keys(stubs).find(k=>args.path===k || args.path.endsWith('/'+k));
    if(key)return {path:key,namespace:'stub'};
  });
  b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],loader:'jsx',resolveDir:root}));
  b.onLoad({filter:/.*/,namespace:'shim'},()=>({contents:`import React from 'react';import * as Native from 'react-native-web';export * from 'react-native-web';export const useWindowDimensions=()=>({...Native.useWindowDimensions(),fontScale:window.TEST_FONT_SCALE??1});export const Text=React.forwardRef(({style,...p},ref)=>{const s=Native.StyleSheet.flatten(style)??{};return <Native.Text ref={ref} {...p} style={[style,typeof s.fontSize==='number'?{fontSize:s.fontSize*(window.TEST_FONT_SCALE??1)}:null]}/>});`,loader:'jsx',resolveDir:root}));
}};
const source = `import React from 'react';import {createRoot} from 'react-dom/client';import {View,Text} from 'react-native';
import {ArenaScreen} from './components/arena/ArenaScreen';
import {ArenaQuestion} from './components/arena/ArenaQuestion';
import HybridAlertShell from './components/modal_fx/HybridAlertShell';
import BoonActivatedHybrid from './components/celebration/BoonActivatedHybrid';
import ResponsiveModalScrollView from './components/ResponsiveModalScrollView';
import PhraseCardSizer from './app/flashcards/PhraseCardSizer';
const root=createRoot(document.getElementById('root'));
window.mount=(mode)=>{window.submitted=0;if(mode==='sizer'){root.render(<View style={{width:'100%'}}><PhraseCardSizer minHeight={120} front={<Text>Short phrase</Text>} back={<Text testID="long-translation" style={{fontSize:22}}>{'Длинный перевод фразы. '.repeat(70)}</Text>}/></View>);return;}const task={taskId:'test-'+mode,mode:mode==='builder'?'translate_build':mode==='matching'?'speed_match':'guess_phrase',payload:{prompt:'Выберите правильный перевод длинной фразы, чтобы продолжить задание.',options:['Первый длинный вариант ответа на вопрос','Второй длинный вариант ответа на вопрос','Третий длинный вариант ответа на вопрос','Последний длинный вариант ответа на вопрос'],wordBank:['I','would','like','to','book','a','comfortable','room','for','tomorrow'],items:[{prompt:'reception'},{prompt:'map'},{prompt:'longer'},{prompt:'butter'}],rightOptions:['масло','ресепшн','карта','длиннее']}};
root.render(mode==='classic'?<ResponsiveModalScrollView><View style={{width:'100%',maxWidth:370,padding:24}}><Text style={{fontSize:22}}>{'Подробное сообщение. '.repeat(100)}</Text><button onClick={()=>window.submitted++}>Завершить</button></View></ResponsiveModalScrollView>:mode==='reward'?<BoonActivatedHybrid visible kicker="Награда" title="Ваш бонус активирован" subtitle={'Подробное описание полученной награды. '.repeat(20)} ctaLabel="Завершить" onClose={()=>window.submitted++}/> :mode==='alert'?<HybridAlertShell visible onRequestClose={()=>{}}><View style={{padding:24,backgroundColor:'#333'}}><Text style={{fontSize:22,color:'white'}}>{'Очень длинное сообщение, которое должно оставаться доступным. '.repeat(30)}</Text><button onClick={()=>window.submitted++}>Завершить</button></View></HybridAlertShell>:
<ArenaScreen title="Арена" subtitle="5 / 8" scroll={false} allowShortViewportScroll><View style={{minHeight:72,backgroundColor:'#334'}}><Text>Ты 8 vs 9 Соперник</Text></View><View style={{height:10}}/><View style={{flex:1,justifyContent:'center',gap:10}}><View style={{height:62,width:62,backgroundColor:'#665'}}/><ArenaQuestion task={task} locked={false} submitLabel="Ответить" onSubmit={()=>window.submitted++} onSpeedAttempt={async()=>true}/></View></ArenaScreen>);};`;
const bundle=await build({stdin:{contents:source,resolveDir:root,loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"test"','__DEV__':'false'},plugins:[stubPlugin],logLevel:'silent'});
const browser=await chromium.launch({headless:true,channel:'msedge'});
const rows=[];
try {
  for (const [width,height] of (process.env.RESPONSIVE_QUICK ? [[320,568]] : [[320,480],[320,568],[360,640],[375,667],[390,844],[568,320],[768,1024],[1024,768]])) {
    for(const fontScale of (process.env.RESPONSIVE_QUICK ? [1] : [1,1.5,2])){
    for(const mode of (process.env.RESPONSIVE_MODES?.split(',') ?? ['choices','builder','matching','alert','reward','classic','sizer'])){
      const page=await browser.newPage({viewport:{width,height}});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.setContent('<style>html,body,#root{margin:0;width:100%;height:100%;overflow:hidden}#root{display:flex;flex-direction:column}*{box-sizing:border-box}</style><div id="root"></div>');
      await page.evaluate(scale=>window.TEST_FONT_SCALE=scale,fontScale);
      await page.addScriptTag({content:bundle.outputFiles[0].text});
      await page.evaluate(mode=>window.mount(mode),mode);
      await page.waitForTimeout(100);
      let error=errors.join('; ');
      try{
        if(mode==='sizer'){
          for (const currentWidth of [width, Math.max(240, Math.floor(width / 2))]) {
            await page.setViewportSize({width:currentWidth,height});
            await page.waitForTimeout(150);
            const measured = await page.getByTestId('phrase-card-size').boundingBox();
            const translation = await page.getByTestId('long-translation').boundingBox();
            if (!measured || !translation || measured.height < translation.height + 29) throw Error('long back face does not fit: '+JSON.stringify({measured,translation}));
          }
        }else if(mode==='choices'||mode==='builder'){
          const button=page.getByRole('button',{name:'Ответить',exact:true});
          await button.waitFor({timeout:2000});
          const rect=await button.boundingBox();
          if(height/fontScale>=420&&(!rect||rect.y<0||rect.y+rect.height>height-20))throw Error('submit outside safe viewport: '+JSON.stringify(rect));
          const label=mode==='choices'?'Последний длинный вариант ответа на вопрос':'tomorrow';
          await page.getByRole('button',{name:label,exact:true}).click({timeout:2000});
          await page.setViewportSize(height/fontScale<420?{width:390,height:1000*fontScale}:{width:568,height:320});
          await button.click({timeout:2000});
          if(await page.evaluate(()=>window.submitted)!==1)throw Error('submit handler not delivered');
        }else if(mode==='alert'||mode==='reward'||mode==='classic'){
          await page.getByRole('button',{name:'Завершить'}).click({timeout:2000});
          if(await page.evaluate(()=>window.submitted)!==1)throw Error('alert handler not delivered');
        }else{
          await page.getByRole('button',{name:'butter',exact:true}).click({timeout:2000});
          await page.getByRole('button',{name:'длиннее',exact:true}).click({timeout:2000});
          await page.setViewportSize(height/fontScale<420?{width:390,height:1000*fontScale}:{width:568,height:320});
          if(await page.getByRole('button',{name:'butter',exact:true}).getAttribute('aria-disabled')!=='true')throw Error('matched pair lost on resize');
        }
      }catch(e){error=error||e.message.split('\n').slice(0,3).join(' ');}
      if((width===320&&fontScale===1) || error)await page.screenshot({path:path.join(out,`${mode}-${width}x${height}-${fontScale}.png`)});
      rows.push({width,height,fontScale,mode,status:error?'FAIL':'PASS',error});
      await page.close();
    }
    }
  }
} finally {await browser.close();}
await fs.writeFile(path.join(out,process.env.RESPONSIVE_MODES ? 'browser-results-focused.json' : 'browser-results.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify({pass:rows.filter(r=>r.status==='PASS').length,total:rows.length,failures:rows.filter(r=>r.status==='FAIL')}));
process.exitCode=rows.some(r=>r.status==='FAIL')?1:0;
