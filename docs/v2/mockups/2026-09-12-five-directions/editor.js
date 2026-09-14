/* Local visual editor. Exports explicit values and source mappings, never writes app code. */
(() => {
  'use strict';
  const api=window.V2_PROTOTYPE;
  const STORAGE_KEY=window.V2_OWNER_PRESET?'phraseman-v2-owner-approved-20260912':'phraseman-v2-five-directions-editor-v2';
  const VERSION=2;
  const sourceMap={lessons:'app/(tabs)/lessons.tsx',map:'components/learning-v2/LearningV2PulseCourse.tsx',nodes:'components/learning-v2/LearningV2PulseCourse.tsx',modal:'components/LearningV2SessionOutcomeSheet.tsx',intro0:'app/learning_v2_session_intro.tsx',intro1:'app/learning_v2_session_intro.tsx',intro2:'app/learning_v2_session_intro.tsx',word:'components/learning-v2/LearningV2NewWordEncounterOverlay.tsx',pocket:'components/learning-v2/LearningV2WordPocketOverlayV1.tsx',complete:'components/feedback/ResultsSequence.tsx + components/FeedbackRatingCard.tsx'};
  const controls=[
    ['width','Ширина',20,390,1,'px'],['height','Высота',16,780,1,'px'],['x','Положение X',-200,200,1,'px'],['y','Положение Y',-300,300,1,'px'],
    ['padding','Внутренний отступ',0,72,1,'px'],['marginTop','Отступ сверху',-80,100,1,'px'],['marginBottom','Отступ снизу',-80,100,1,'px'],['gap','Расстояние внутри',0,64,1,'px'],
    ['borderRadius','Скругление',0,160,1,'px'],['fontSize','Размер текста',8,72,1,'px'],['lineHeight','Высота строки',10,96,1,'px'],['letterSpacing','Межбуквенный интервал',-2,5,.1,'px'],
    ['scale','Масштаб элемента',.4,1.8,.01,''],['rotate','Поворот',-25,25,1,'deg'],['opacity','Непрозрачность',.1,1,.01,''],['animationDuration','Период анимации',.2,12,.1,'s'],
  ];
  const controlByName=new Map(controls.map(c=>[c[0],c]));
  const screenControls=[['pagePadding','Отступы страницы',0,44,1,20],['cardRadius','Скругление блоков',8,60,1,28],['cardGap','Расстояние между блоками',0,40,1,14],['headingSize','Размер заголовков',16,44,1,28],['bodySize','Размер учебного текста',12,28,1,17],['targetHeight','Высота кнопок',44,96,1,56],['nodeSize','Размер узла',60,144,1,104],['mapStep','Расстояние между сессиями',110,210,1,140],['motionPeriod','Период движения',.2,12,.1,4]];
  const screenByName=new Map(screenControls.map(c=>[c[0],c]));
  const blank=()=>({version:VERSION,theme:'dark',viewport:{width:390,height:844},edits:{},notes:{}});
  let settings=blank(),saving=true;
  let selectedStyle='atlas',selectedKey='',selectedScope='*',picking=false,history=[],future=[];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getHost=()=>document.querySelector('[data-style="'+selectedStyle+'"] .phone-content');
  const screen=()=>getHost()?.dataset.screen||'lessons';
  const actualState=()=>getHost()?.dataset.state||'normal';
  const scope=()=>selectedScope==='*'?'*':actualState();
  const contextKey=()=>[selectedStyle,screen(),scope()].join('/');
  function validDocument(value){
    if(!value||value.version!==VERSION||!value.edits||typeof value.edits!=='object'||Array.isArray(value.edits))throw new Error('Нужен файл настроек версии 2.');
    const clean=blank();
    if(Object.hasOwn(window.V2_THEME_TOKENS,value.theme))clean.theme=value.theme;
    const styles=new Set(api.directions.map(d=>d.id)),screens=new Set(api.screens.map(s=>s[0]));
    for(const [key,entry]of Object.entries(value.edits)){
      const parts=key.split('/');
      if(parts.length!==3||!styles.has(parts[0])||!screens.has(parts[1])||!entry||typeof entry!=='object')throw new Error('Неизвестный экран в настройках.');
      if(parts[2]!=='*'&&!api.variants[parts[1]].some(v=>v[0]===parts[2]))throw new Error('Неизвестное состояние.');
      const output={screen:{},elements:{}};
      for(const [name,v]of Object.entries(entry.screen||{})){
        const rule=screenByName.get(name);if(!rule||typeof v!=='number'||!Number.isFinite(v)||v<rule[2]||v>rule[3])throw new Error('Некорректный параметр экрана.');output.screen[name]=v;
      }
      for(const [element,props]of Object.entries(entry.elements||{})){
        if(!(element==='root'||element.startsWith('root/'))||!/^[a-zA-Z0-9_./:=-]+$/.test(element)||element.length>2000||!props||typeof props!=='object')throw new Error('Некорректный элемент.');
        const safe={};
        for(const [name,v]of Object.entries(props)){
          const rule=controlByName.get(name);if(!rule||typeof v!=='number'||!Number.isFinite(v)||v<rule[2]||v>rule[3])throw new Error('Некорректный размер или положение.');safe[name]=v;
        }
        output.elements[element]=safe;
      }
      clean.edits[key]=output;
    }
    for(const [key,valueNote]of Object.entries(value.notes||{}))if(typeof valueNote==='string'&&key.length<150&&key!=='__proto__')clean.notes[key]=valueNote.slice(0,5000);
    return clean;
  }
  if(window.V2_OWNER_PRESET)settings=validDocument(window.V2_OWNER_PRESET);
  try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)settings=validDocument(JSON.parse(saved));}catch{saving=false;}
  const panel=document.createElement('aside');panel.className='editor-panel';panel.setAttribute('aria-label','Редактор макетов');
  panel.innerHTML='<div class="editor-head"><h2>Редактор макета</h2><button class="editor-close" aria-label="Закрыть редактор">×</button></div><p class="editor-caption">Выберите экран сверху. Включите выбор элемента и нажмите на блок в телефоне. Все размеры — в пикселях макета, без масштаба галереи.</p><div class="editor-status" role="status"></div><label>Вариант<select id="edit-style">'+api.directions.map(d=>'<option value="'+d.id+'">'+esc(d.name)+'</option>').join('')+'</select></label><label style="margin-top:12px">Область правок<select id="edit-scope"><option value="*">Экран во всех состояниях</option><option value="state">Только текущее состояние</option></select></label><div class="editor-selection-tag" id="editor-context"></div><button class="editor-pick" aria-pressed="false">Выбрать элемент на экране</button><label class="editor-check"><input type="checkbox" id="edit-grid"> Сетка 8 px</label><div class="editor-metrics" id="edit-metrics"></div><p class="editor-alert" id="edit-alert"></p><details open><summary>Экран целиком</summary><div id="screen-controls"></div></details><details open><summary>Выбранный элемент</summary><div id="element-label" class="editor-selection-tag">Пока не выбран</div><button class="editor-pick" id="select-parent">Выбрать родительский блок</button><div id="element-controls"></div></details><label>Комментарий для внедрения<textarea class="editor-note" maxlength="5000" placeholder="Что важно сохранить в этом экране"></textarea></label><div class="editor-actions" style="margin-top:16px"><button id="edit-undo">Отменить</button><button id="edit-redo">Вернуть</button><button id="reset-element">Сброс элемента</button><button id="reset-screen">Сброс экрана</button><button class="export-settings" id="export-settings">Сохранить файл для внедрения</button><button id="import-settings">Загрузить настройки</button><button id="copy-settings">Копировать JSON</button></div><input type="file" id="settings-file" accept="application/json,.json" hidden><p class="editor-caption">Автосохранение работает в этом браузере. Файл JSON содержит выбранную тему, экран, состояние, значения, метрики и соответствующие файлы приложения.</p>';
  document.body.append(panel);
  const $=s=>panel.querySelector(s);
  const status=message=>{$('.editor-status').textContent=message;};
  const userStyle=document.createElement('style');userStyle.id='v2-owner-adjustments';document.head.append(userStyle);
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));saving=true;status('Сохранено в этом браузере');}catch{saving=false;status('Автосохранение недоступно — экспортируйте файл');}}
  function checkpoint(){history.push(JSON.stringify(settings));if(history.length>100)history.shift();future=[];}
  function entry(){return settings.edits[contextKey()]??=( {screen:{},elements:{}} );}
  function assignKeys(host){
    function visit(parent,prefix){const counts=new Map();for(const el of parent.children){
      if(!(el instanceof HTMLElement)||el.classList.contains('flying-rune')||el.classList.contains('toast')||el.classList.contains('pick-shield'))continue;
      const firstClass=[...el.classList].find(c=>!['current','active','done','correct','wrong-answer','edit-selected'].includes(c));
      const signature=el.dataset.action?'action-'+el.dataset.action+'-'+(el.dataset.lesson||el.dataset.session||el.dataset.choice||el.dataset.chapter||el.dataset.word||''):el.dataset.row?'row-'+el.dataset.row:el.tagName.toLowerCase()+(firstClass?'-'+firstClass:'');
      const ordinal=(counts.get(signature)||0)+1;counts.set(signature,ordinal);
      const key=prefix+'/'+signature+':'+ordinal;el.dataset.editKey=key;visit(el,key);
    }}
    host.dataset.editKey='root';visit(host,'root');
  }
  const toCss=name=>name.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
  function declarations(props){
    const out=[];for(const [name,v]of Object.entries(props)){if(name==='x'||name==='y')continue;const rule=controlByName.get(name);if(rule)out.push(toCss(name)+':'+v+rule[5]+'!important');}
    if('x'in props||'y'in props)out.push('translate:'+(props.x||0)+'px '+(props.y||0)+'px!important');
    if('height'in props)out.push('min-height:0!important;max-height:none!important;flex-shrink:0!important');
    if('width'in props)out.push('min-width:0!important');
    return out.join(';');
  }
  function screenCss(prefix,values){const rules=[];const put=(selectors,body)=>rules.push(selectors.split(',').map(s=>prefix+' '+s.trim()).join(',')+'{'+body+'}');
    for(const [key,value]of Object.entries(values)){
      if(key==='pagePadding')put('.content-scroll,.word-layer','padding-left:'+value+'px!important;padding-right:'+value+'px!important');
      if(key==='cardRadius')put('.lesson-row,.route-lesson,.teaching-card,.intro-scene,.dialog,.pocket-card,.node-sample,.word-card,.completion-feedback,.completion-reward','border-radius:'+value+'px!important');
      if(key==='cardGap')put('.lesson-list,.answer-list,.pocket-grid,.node-gallery','gap:'+value+'px!important');
      if(key==='headingSize')put('h2,h3','font-size:'+value+'px!important');
      if(key==='bodySize')put('.intro-body,.teacher-message,.explanation-modules p,.outcome,.word-definition','font-size:'+value+'px!important');
      if(key==='targetHeight')put('.primary,.answer','min-height:'+value+'px!important');
      if(key==='nodeSize')put('.orb','width:'+value+'px!important;height:'+value+'px!important');
      if(key==='mapStep')put('.map-row','height:'+value+'px!important');
      if(key==='motionPeriod')put('.orb *','animation-duration:'+value+'s!important');
    }return rules.join('\n');
  }
  function resolvedElementProps(document,key,element,props){const [style,page]=key.split('/');return{...document.edits[[style,page,'*'].join('/')]?.elements?.[element],...props};}
  function apply(){
    const rules=[];
    // General rules first, state-specific overrides last.
    for(const [key,value]of Object.entries(settings.edits).sort(([a],[b])=>Number(!a.endsWith('/*'))-Number(!b.endsWith('/*')))){
      const [style,page,stateName]=key.split('/');
      const prefix='[data-style="'+style+'"] .phone-content[data-screen="'+page+'"]'+(stateName==='*'?'':'[data-state="'+stateName+'"]');
      rules.push(screenCss(prefix,value.screen));
      for(const [element,props]of Object.entries(value.elements)){
        const resolved=resolvedElementProps(settings,key,element,props);
        rules.push(prefix+(element==='root'?'':' ')+'[data-edit-key="'+element+'"]{'+declarations(resolved)+'}');
        if('animationDuration'in resolved)rules.push(prefix+' [data-edit-key="'+element+'"] *{animation-duration:'+resolved.animationDuration+'s!important}');
      }
    }
    userStyle.textContent=rules.join('\n');
    document.documentElement.dataset.theme=settings.theme;
    for(const [token,value]of Object.entries(window.V2_THEME_TOKENS[settings.theme]))document.documentElement.style.setProperty('--'+token,value);
    document.querySelector('#theme-select').value=settings.theme;
    requestAnimationFrame(()=>{repairMapGeometry();syncPickShields();showSelection();updateMetrics();});
  }
  function repairMapGeometry(){document.querySelectorAll('.map-track').forEach(track=>{
    const rows=[...track.querySelectorAll('.map-row')];
    rows.forEach((row,i)=>{const next=rows[i+1];if(!next||row.classList.contains('chapter-end'))return;
      const host=row.closest('.phone-content'),scale=host.getBoundingClientRect().width/host.offsetWidth;if(!scale)return;
      const a=row.querySelector('.orb').getBoundingClientRect(),b=next.querySelector('.orb').getBoundingClientRect(),rowRect=row.getBoundingClientRect();
      const dx=(b.left+b.width/2-a.left-a.width/2)/scale,dy=(b.top+b.height/2-a.top-a.height/2)/scale;
      row.style.setProperty('--line-start-x',(a.left+a.width/2-rowRect.left)/scale+'px');row.style.setProperty('--line-start-y',(a.top+a.height/2-rowRect.top)/scale+'px');
      row.style.setProperty('--line-angle',-Math.atan2(dx,dy)*180/Math.PI+'deg');row.style.setProperty('--line-length',Math.hypot(dx,dy)+'px');
    });
  });}
  const selected=()=>getHost()?.querySelector('[data-edit-key="'+selectedKey+'"]')||(selectedKey==='root'?getHost():null);
  function showSelection(){document.querySelectorAll('.edit-selected').forEach(el=>el.classList.remove('edit-selected'));if(document.body.classList.contains('editor-open'))selected()?.classList.add('edit-selected');}
  function measured(el){if(!el)return null;const host=el.closest('.phone-content'),rect=el.getBoundingClientRect(),base=host.getBoundingClientRect(),ratio=base.width/host.offsetWidth||1,cs=getComputedStyle(el);return{x:Math.round((rect.left-base.left)/ratio),y:Math.round((rect.top-base.top)/ratio),width:Math.round(rect.width/ratio),height:Math.round(rect.height/ratio),fontSize:parseFloat(cs.fontSize),radius:parseFloat(cs.borderTopLeftRadius),padding:parseFloat(cs.paddingLeft),scrollHeight:el.scrollHeight,touchTarget:el.matches('button')?rect.width/ratio>=44&&rect.height/ratio>=44:null};}
  function updateMetrics(){const element=selected()||getHost(),m=measured(element);if(!m)return;
    $('#edit-metrics').innerHTML=[['X / Y',m.x+' / '+m.y],['Ширина × высота',m.width+' × '+m.height],['Текст / радиус',m.fontSize+' / '+m.radius],['Высота содержимого',m.scrollHeight]].map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('');
    const warnings=[];if(m.touchTarget===false)warnings.push('Область нажатия меньше 44 × 44 px.');if(m.x<0||m.x+m.width>390)warnings.push('Элемент выходит за горизонтальные границы телефона.');
    if(element.scrollWidth>element.clientWidth+2&&getComputedStyle(element).overflowX==='hidden')warnings.push('Содержимое может обрезаться по ширине.');
    $('#edit-alert').textContent=warnings.join(' ');
  }
  function controlsMarkup(list,values,type){return list.map(([key,label,min,max,step,unit])=>{
    const value=values[key]??(type==='screen'?list.find(c=>c[0]===key)[5]:0);
    return '<div class="editor-control"><label for="'+type+'-'+key+'">'+label+'</label><input aria-label="'+label+', значение" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'" data-kind="'+type+'" data-prop="'+key+'"><input id="'+type+'-'+key+'" aria-label="'+label+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'" data-kind="'+type+'" data-prop="'+key+'"><button data-clear-kind="'+type+'" data-clear-prop="'+key+'">'+(Object.hasOwn(values,key)?'↶ Вернуть исходное':'Исходный стиль')+'</button></div>';
  }).join('');}
  function refreshControls(){
    const base=settings.edits[[selectedStyle,screen(),'*'].join('/')],current=settings.edits[contextKey()];
    $('#editor-context').textContent=api.directions.find(d=>d.id===selectedStyle).name+' · '+api.screens.find(s=>s[0]===screen())?.[1]+' · '+actualState();
    $('#screen-controls').innerHTML=controlsMarkup(screenControls,{...base?.screen,...current?.screen},'screen');
    const el=selected();$('#element-label').textContent=el?(el.getAttribute('aria-label')||el.textContent.trim().slice(0,70)||el.className):'Выберите элемент в телефоне';
    if(el){const cs=getComputedStyle(el),m=measured(el),defaults={};controls.forEach(([k,minLabel,min,max])=>{const value=k==='x'||k==='y'||k==='rotate'?0:k==='scale'||k==='opacity'?1:k==='animationDuration'?parseFloat(cs.animationDuration)||4:k==='width'||k==='height'?m[k]:parseFloat(cs[k])||min;defaults[k]=Math.min(max,Math.max(min,value));});
      const merged={...defaults,...base?.elements?.[selectedKey],...current?.elements?.[selectedKey]};
      $('#element-controls').innerHTML=controlsMarkup(controls,merged,'element');
    }else $('#element-controls').innerHTML='<p class="editor-caption">Размер, позиция, отступы, текст и движение появятся после выбора.</p>';
    $('.editor-note').value=settings.notes[contextKey()]||'';showSelection();updateMetrics();
  }
  function choose(el){selectedStyle=el.closest('[data-style]').dataset.style;selectedKey=el.dataset.editKey;$('#edit-style').value=selectedStyle;refreshControls();}
  function onRender(id,host){assignKeys(host);if(id===selectedStyle){selectedKey=selectedKey&&host.querySelector('[data-edit-key="'+selectedKey+'"]')?selectedKey:'';refreshControls();}apply();}
  function exportDocument(){const measurements=[];document.querySelectorAll('.phone-content').forEach(host=>{
    const style=host.closest('[data-style]').dataset.style,page=host.dataset.screen;
    if(!host.getBoundingClientRect().width){measurements.push({style,screen:page,state:host.dataset.state,source:sourceMap[page],measured:false,reason:'Variant is hidden in focused view; no geometry claimed'});return;}
    const elements=[...host.querySelectorAll('.phone-header,.lesson-row,.map-row,.orb,.dialog,.intro-heading,.intro-scene,.answer,.primary,.word-card,.pocket-button,.completion-header,.completion-badge,.completion-title,.completion-reward,.completion-feedback,.completion-rating-star,.completion-feedback-input')];
    measurements.push({style,screen:page,state:host.dataset.state,source:sourceMap[page],measured:true,elements:elements.map(el=>({key:el.dataset.editKey,...measured(el)}))});
  });return{...settings,selection:{style:selectedStyle,screen:screen(),state:actualState()},exportedAt:new Date().toISOString(),prototype:'docs/v2/mockups/2026-09-12-five-directions/index.html',sourceMap,measurements,notesForImplementation:'edits are exact per-style/per-screen overrides; measurements describe currently rendered screens only; viewport is 390x844; values are CSS px, intended as logical RN dp; no runtime deployment performed'};}
  function download(){const blob=new Blob([JSON.stringify(exportDocument(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='phraseman-learning-v2-owner-settings.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Файл настроек сохранён в загрузки браузера');}
  function hitBelowShield(event,shield){return document.elementsFromPoint(event.clientX,event.clientY).filter(el=>el!==shield&&el.closest('.phone-content')===shield.parentElement).map(el=>el.closest('[data-edit-key]')).find(Boolean);}
  function syncPickShields(){document.querySelectorAll('.phone-content').forEach(host=>{
    let shield=host.querySelector('.pick-shield');if(!picking){shield?.remove();return;}if(shield)return;
    shield=document.createElement('div');shield.className='pick-shield';shield.setAttribute('aria-hidden','true');host.append(shield);
    shield.addEventListener('pointerdown',event=>{const el=hitBelowShield(event,shield);if(el){event.preventDefault();event.stopPropagation();choose(el);}});
    shield.addEventListener('wheel',event=>{const el=hitBelowShield(event,shield),scroll=el?.closest('.content-scroll,.dialog,.word-layer');if(scroll){event.preventDefault();scroll.scrollTop+=event.deltaY;}},{passive:false});
  });}
  function toggle(open){document.body.classList.toggle('editor-open',open);document.querySelector('#editor-toggle').setAttribute('aria-expanded',String(open));if(!open){picking=false;document.body.classList.remove('editor-picking');$('.editor-pick').setAttribute('aria-pressed','false');}syncPickShields();refreshControls();}
  document.querySelector('#editor-toggle').addEventListener('click',()=>toggle(!document.body.classList.contains('editor-open')));$('.editor-close').addEventListener('click',()=>toggle(false));
  $('.editor-pick').addEventListener('click',()=>{picking=!picking;document.body.classList.toggle('editor-picking',picking);$('.editor-pick').setAttribute('aria-pressed',String(picking));syncPickShields();status(picking?'Нажмите на элемент. Колёсико прокручивает экран под выделением.':'Можно проверять обычные действия макета');});
  document.querySelector('#gallery').addEventListener('click',event=>{if(!picking)return;event.preventDefault();event.stopImmediatePropagation();if(event.target.closest('.pick-shield'))return;const el=event.target.closest('[data-edit-key]');if(el)choose(el);},true);
  $('#edit-style').addEventListener('change',event=>{selectedStyle=event.target.value;selectedKey='';refreshControls();});$('#edit-scope').addEventListener('change',event=>{selectedScope=event.target.value;refreshControls();});$('#edit-grid').addEventListener('change',event=>document.body.classList.toggle('editor-grid',event.target.checked));
  $('#select-parent').addEventListener('click',()=>{const parent=selected()?.parentElement?.closest('[data-edit-key]');if(parent)choose(parent);});
  let inputTransaction=null;
  panel.addEventListener('pointerdown',event=>{if(event.target.matches('input[data-prop]'))inputTransaction=null;});
  panel.addEventListener('focusout',event=>{if(event.target.matches('input[data-prop]'))inputTransaction=null;});
  panel.addEventListener('change',event=>{if(event.target.matches('input[data-prop]'))inputTransaction=null;});
  panel.addEventListener('input',event=>{const input=event.target;if(!input.dataset.prop)return;
    const prop=input.dataset.prop,kind=input.dataset.kind,rule=(kind==='screen'?screenByName:controlByName).get(prop),value=Number(input.value);if(!Number.isFinite(value)||value<rule[2]||value>rule[3])return;
    if(kind==='element'&&!selectedKey)return;
    if(inputTransaction!==input){checkpoint();inputTransaction=input;}
    const target=kind==='screen'?entry().screen:(entry().elements[selectedKey]??={});target[prop]=value;
    panel.querySelectorAll('[data-kind="'+kind+'"][data-prop="'+prop+'"]').forEach(other=>{if(other!==input)other.value=String(value);});apply();persist();
  });
  panel.addEventListener('click',event=>{const b=event.target.closest('[data-clear-prop]');if(!b)return;checkpoint();const target=b.dataset.clearKind==='screen'?entry().screen:entry().elements[selectedKey];if(target)delete target[b.dataset.clearProp];apply();persist();refreshControls();});
  $('.editor-note').addEventListener('change',event=>{checkpoint();settings.notes[contextKey()]=event.target.value;persist();});
  $('#reset-element').addEventListener('click',()=>{checkpoint();delete entry().elements[selectedKey];apply();persist();refreshControls();});$('#reset-screen').addEventListener('click',()=>{checkpoint();delete settings.edits[contextKey()];apply();persist();refreshControls();});
  $('#edit-undo').addEventListener('click',()=>{if(!history.length)return;future.push(JSON.stringify(settings));settings=JSON.parse(history.pop());apply();persist();refreshControls();});$('#edit-redo').addEventListener('click',()=>{if(!future.length)return;history.push(JSON.stringify(settings));settings=JSON.parse(future.pop());apply();persist();refreshControls();});
  document.querySelector('#theme-select').addEventListener('change',event=>{if(!Object.hasOwn(window.V2_THEME_TOKENS,event.target.value))return;checkpoint();settings.theme=event.target.value;apply();persist();});
  $('#export-settings').addEventListener('click',download);$('#copy-settings').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(exportDocument(),null,2));status('JSON скопирован — его можно передать для внедрения');}catch{status('Буфер недоступен. Используйте сохранение файла.');}});
  $('#import-settings').addEventListener('click',()=>$('#settings-file').click());$('#settings-file').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>5_000_000)throw new Error('Файл слишком большой.');const next=validDocument(JSON.parse(await file.text()));checkpoint();settings=next;apply();persist();refreshControls();status('Настройки загружены');}catch(error){status('Не загружено: '+error.message);}event.target.value='';});
  window.addEventListener('resize',()=>requestAnimationFrame(()=>{repairMapGeometry();updateMetrics();}));document.querySelector('#gallery').addEventListener('scroll',updateMetrics,true);
  window.V2_EDITOR={onRender,exportDocument,validDocument,controls,screenControls,getSettings:()=>structuredClone(settings)};
  document.querySelectorAll('.phone-content').forEach(assignKeys);apply();refreshControls();status(saving?'Автосохранение включено':'Автосохранение недоступно — используйте экспорт');
})();
