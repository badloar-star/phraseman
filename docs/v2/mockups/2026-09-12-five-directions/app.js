/* Local design prototype. All balances and progress below are demonstration state. */
(() => {
  'use strict';
  const data = window.V2_DESIGN_DATA;
  const runeAsset = '../../../../assets/images/level-spin-rewards/stars_10.webp';
  const directions = [
    {id:'atlas',name:'Пульс',tagline:'Прогресс, который ощущается.',note:'Крупные панели и боковое кольцо прогресса. Карта — мягкая цепочка. Модал раскрывается вокруг объёмного диска.',motion:'Диск с живым ободом',motionNote:'Лицо диска остаётся под пальцем. Световой обод обходит его по кругу; при нажатии диск утапливается на 5 px.'},
    {id:'clay',name:'Модули',tagline:'Большие блоки. Прямое действие.',note:'Асимметричная сетка модулей. Карта собрана из платформ; интро — из слов, которые можно потрогать.',motion:'Механическая клавиша',motionNote:'Округлое лицо и глубокая опора. Мягкий подъём на 2 px, короткое нажатие с явным возвратом.'},
    {id:'editorial',name:'Панорама',tagline:'Содержание на первом плане.',note:'Широкие полосы уроков с крупными номерами. На карте — капсулы с пояснениями. Интро сопоставляет пример и правило.',motion:'Объёмная капсула',motionNote:'Внешнее кольцо плавно раскрывается, показывая следующий шаг. Блик движется по поверхности, точка нажатия неподвижна.'},
    {id:'transit',name:'Траектория',tagline:'Следующий шаг всегда виден.',note:'Каталог на вертикальной шкале. Сфера стоит на опоре, сведения и запуск разделены на два крупных блока. Интро идёт репликами.',motion:'Сфера на опоре',motionNote:'Сфера чуть приподнимается над основанием, её тень сужается. Нажатие возвращает сферу на опору.'},
    {id:'folio',name:'Орбиты',tagline:'Курс складывается в навыки.',note:'Парные панели с крупными кругами. Карта — открытые дуги. В интро ученик возвращает недостающий элемент фразы.',motion:'Чеканный круг',motionNote:'Монета поворачивается на 4° в обе стороны. Внутреннее кольцо и торец дают глубину; завершённый шаг получает чеканную отметку.'},
  ];
  
  const screens = [
    ['lessons','Уроки'],['map','Карта'],['nodes','Узлы + движение'],['modal','Модал сессии'],
    ['intro0','Интро 1'],['intro1','Интро 2'],['intro2','Интро 3'],['word','Новое слово'],['pocket','Карман слов'],['complete','Финал сессии'],
  ];
  const variants = {
    lessons:[['normal','Весь курс'],['new','Первый вход'],['offline','Без сети'],['loading','Загрузка']],
    map:[['normal','Текущая сессия 5'],['first','Самое начало'],['middle','Сессия 25'],['last','Последняя сессия'],['offline','Без сети']],
    nodes:[['normal','Все состояния'],['reduced','Без движения']],
    modal:[['normal','Текущая'],['completed','Пройденная'],['locked','Закрытая'],['checkpoint','Проверка главы'],['loading','Подготовка'],['offline','Нет локальных материалов']],
    intro0:[['normal','До ответа'],['wrong','После ошибки'],['correct','Верный ответ'],['exhausted','Попытки закончились']],
    intro1:[['normal','До ответа'],['wrong','После ошибки'],['correct','Верный ответ'],['exhausted','Попытки закончились']],
    intro2:[['normal','До ответа'],['wrong','После ошибки'],['correct','Верный ответ'],['exhausted','Попытки закончились']],
    word:[['normal','Лицевая сторона'],['flipped','Перевод'],['saved','Сохранено'],['reduced','Без движения']],
    pocket:[['normal','Открытые слова'],['empty','Пока нет слов']],
    complete:[['normal','Полная анимация'],['counting','Начисление XP'],['rewards','Руны и награды'],['feedback','Оценка и отзыв'],['reduced','Без движения']],
  };
  const svgPaths = {
    arrow:'<path d="m9 5 7 7-7 7"/>',back:'<path d="m15 5-7 7 7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
    book:'<path d="M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z"/>',
    check:'<path d="m5 12 4 4L19 6"/>',play:'<path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
    heart:'<path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
    shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 11 3 3 5-5"/>',
    mic:'<rect x="8" y="3" width="8" height="12" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    volume:'<path d="M11 4 5 9H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/>',
    bookmark:'<path d="M6 3h12v19l-6-4-6 4Z"/>',home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
    bars:'<path d="M4 20v-5M10 20V9M16 20V4M22 20V1"/>',battery:'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M23 10v4M5 10h11v4H5Z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    person:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    chat:'<path d="M21 12a9 9 0 0 1-9 9c-2 0-4-.6-5-1.5L2 22l1.5-5A9 9 0 1 1 21 12Z"/><path d="M7 9h10M7 13h7"/>',
    pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    energy:'<path d="m13 2-9 12h7l-1 8 10-13h-8Z"/>',
    offline:'<path d="m3 3 18 18M2 8c6-5 14-5 20 0M6 12c4-3 8-3 12 0M9 16c2-1 4-1 6 0M12 20h.01"/>',
    flag:'<path d="M5 22V3c4-3 8 4 14 0v11c-6 4-10-3-14 0"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
    spark:'<path d="m12 2 1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5ZM19 17l.6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6Z"/>',
  };
  const icon = (name, extra='') => `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${svgPaths[name]||svgPaths.book}</svg>`;
  const esc = value => String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const semantic = text => esc(text).replace(/`([^`]+)`/g,'<strong class="target">$1</strong>');
  const initialState = () => ({screen:'lessons',status:'normal',filter:'a1',lesson:1,current:5,selected:5,intro:0,answers:{},attempts:{},runes:48,hearts:3,words:['here','ready','fine','happy'],saved:new Set(),flipped:false,modal:false,scrollTop:0,inspection:null,rating:0,feedback:'',completionRun:0});
  const state = Object.fromEntries(directions.map(d=>[d.id,initialState()]));
  const gallery = document.querySelector('#gallery');
  const ownerMode = Boolean(window.V2_OWNER_PRESET);
  let selectedScreen = 'lessons';
  let focused = false;
  let focusedStyle = 'atlas';
  let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activityIcons = ['chat','person','home','pin','book','clock','chat','mic'];
  const words = {here:['здесь','/hɪə/'],ready:['готов','/ˈredi/'],fine:['в порядке','/faɪn/'],happy:['рад','/ˈhæpi/']};
  const btn = (action,label,body,cls='icon-btn',extra='') => `<button class="${cls}" data-action="${action}" aria-label="${esc(label)}" ${extra}>${body}</button>`;
  function pocketButton(s) {
    return btn('pocket',`Карман слов: ${s.words.length}`,`<span class="mini-stack"><b>${esc(s.words.at(-1)||'Aa')}</b></span>${s.words.length?`<span class="pocket-count">${s.words.length}</span>`:''}`,'pocket-button');
  }
  function balance(s) {return `<div class="balance" aria-label="${s.runes} рун"><img src="${runeAsset}" alt=""><span class="rune-counter">${s.runes}</span></div>`;}
  function header(s, title, subtitle='', back=false, session=false) {
    if (session) return `<div class="phone-header session-header">${btn('map','Вернуться на карту',icon('close'),'back')}<div class="heading-block"><span class="kicker">${s.intro+1} / 3 · ВВЕДЕНИЕ</span><span class="attempts" aria-label="Осталось попыток: ${s.hearts}">${Array.from({length:3},(_,i)=>`<span style="opacity:${i<s.hearts?1:.22}">${icon('heart')}</span>`).join('')}</span></div><div class="header-tools">${pocketButton(s)}${balance(s)}</div></div>`;
    return `<div class="phone-header">${back?btn('lessons','Все уроки',icon('back'),'back'):''}<div class="heading-block">${subtitle?`<span class="kicker">${esc(subtitle)}</span>`:''}<h2>${esc(title)}</h2></div><div class="header-tools">${back?pocketButton(s):''}${balance(s)}${!back?'<div class="balance energy-balance" aria-label="Энергия: 86">'+icon('energy')+'<span>86</span></div>':''}</div></div>`;
  }
  function bottomNav(active='lessons') {return `<nav class="bottom-nav" aria-label="Разделы приложения">${[['home','Главная'],['lessons','Уроки'],['pocket','Слова'],['progress','Прогресс']].map(([key,label])=>btn(key,label,`${icon(key==='lessons'?'book':key==='pocket'?'grid':key==='progress'?'bars':'home')}<span>${label}</span>`,key===active?'active':'')).join('')}</nav>`;}
  function offline() {return `<div class="offline-banner">${icon('offline')}<span>Вы без сети. Сохранённые занятия доступны.</span></div>`;}
  function progressRing(value,total,label,extra='') {
    const pct=Math.min(100,Math.max(0,value/total*100));
    return '<span class="progress-ring '+extra+'" style="--p:'+pct+'" aria-label="'+value+' из '+total+'"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="42"/><circle class="ring-fill" cx="50" cy="50" r="42" pathLength="100" stroke-dasharray="'+pct+' 100"/></svg><span class="ring-label">'+label+'</span></span>';
  }
  function lessonList(id,s) {
    const all=data.lessons.filter(l=>s.filter==='a1'?l.id<=8:s.filter==='a2'?l.id>8&&l.id<=16:s.filter==='b1'?l.id>16&&l.id<=32:true);
    const done=s.status==='new'?0:4;
    const items=all.map(l=>{
      const current=l.id===1, count=current?done:0;
      const number=String(l.id).padStart(2,'0');
      const title='<h3>'+esc(l.title)+'</h3>';
      const meta='<span class="lesson-meta">'+(current?(count?count+' из 56 сессий':'Начните здесь'):'56 сессий')+'</span>';
      const tag='<span class="lesson-tag">Урок '+l.id+'</span>';
      const arrow='<span class="card-arrow">'+icon('arrow')+'</span>';
      const ring=progressRing(count,56,current?'<b>'+count+'</b><small>из 56</small>':'<b>'+number+'</b>');
      const segments='<span class="chapter-segments" aria-label="7 глав">'+Array.from({length:7},(_,i)=>'<i class="'+(i===0&&current?'started':'')+'"></i>').join('')+'</span>';
      let inner;
      if(id==='atlas')inner='<span class="lesson-copy">'+tag+title+'</span>'+progressRing(count,56,'');
      if(id==='clay')inner='<span class="module-top">'+tag+'<span class="module-symbol">'+icon(activityIcons[(l.id-1)%8])+'</span></span>'+title+'<span class="module-bottom">'+meta+arrow+'</span>'+segments;
      if(id==='editorial')inner='<span class="panorama-index">'+number+'</span><span class="lesson-copy">'+tag+title+segments+meta+'</span>'+arrow;
      if(id==='transit')inner='<span class="route-index">'+(current?icon('play'):number)+'</span><span class="route-lesson">'+tag+title+'<span class="route-foot">'+meta+arrow+'</span></span>';
      if(id==='folio')inner='<span class="orbit-lesson-top">'+ring+arrow+'</span>'+tag+title+meta;
      return '<button class="lesson-row '+(current?'current':'')+'" data-layout="'+id+'" data-action="open-lesson" data-lesson="'+l.id+'" aria-label="Урок '+l.id+'. '+esc(l.title)+'">'+inner+'</button>';
    }).join('');
    const overview=id==='atlas'?'':id==='editorial'?'<div class="course-overview panorama-overview"><strong>32</strong><span>урока<br>от A1 до B1</span><span class="overview-mark">'+icon('book')+'</span></div>':id==='folio'?'<div class="course-overview orbit-overview"><span>Ваш английский</span><b>32 навыка — один курс</b></div>':'<div class="course-overview"><span>Английский · A1 → B1</span><b>32 урока</b></div>';
    const filters='<div class="course-filters" aria-label="Уровень">'+[['a1','A1'],['a2','A2'],['b1','B1']].map(([v,label])=>btn('filter',label,label,'course-filter','data-filter="'+v+'" aria-pressed="'+(s.filter===v)+'"')).join('')+'</div>';
    return header(s,'Уроки')+'<div class="content-scroll catalog-scroll">'+overview+filters+(s.status==='offline'?offline():'')+(s.status==='loading'?'<div class="lesson-list">'+Array.from({length:5},()=>'<div class="skeleton"><span></span><i></i><i></i></div>').join('')+'</div>':'<div class="lesson-list catalog-'+id+'">'+items+'</div>')+'</div>'+bottomNav();
  }
  
  function orb(type,n=5,label='',id='atlas',decorative=false) {
    const mark=type==='completed'?'check':type==='checkpoint'||n%8===0?'shield':type==='current'?'play':'lock';
    const tag=decorative?'div':'button';
    const status=type==='completed'?'done':type==='current'?'current':'idle';
    const attributes=decorative?'aria-hidden="true"':'data-action="session" data-session="'+n+'" data-type="'+type+'" aria-label="'+esc(label||'Сессия '+n+', '+(type==='current'?'текущая':type==='completed'?'пройдена':type==='checkpoint'?'проверка главы':'закрыта'))+'"';
    const core='<span class="orb-face">'+icon(mark)+(type==='checkpoint'?'':'<span class="orb-number">'+n+'</span>')+'</span>';
    const structure=id==='atlas'?'<span class="orb-bezel"></span>'+core:id==='clay'?'<span class="orb-base"></span>'+core:id==='editorial'?'<span class="orb-petals"><i></i><i></i><i></i></span>'+core:id==='transit'?'<span class="orb-ground"></span><span class="orb-ball">'+core+'</span>':'<span class="orb-edge"></span><span class="orb-coin">'+core+'</span>';
    return '<'+tag+' class="orb orb-'+id+' '+status+'" '+attributes+' style="--delay:-'+n%5*.7+'s">'+structure+'</'+tag+'>';
  }
  
  function lessonMap(id,s,withModal=false) {
    const l=data.lessons[s.lesson-1],current=s.lesson===1?s.current:1,chapter=Math.ceil(current/8);
    const waves={atlas:[-48,0,52,36,-20,-56,-12,40],clay:[-64,64,64,-64,-64,64,64,-64],editorial:[-113,-113,-113,-113,-113,-113,-113,-113],transit:[-92,92,-92,92,-92,92,-92,92],folio:[0,64,90,64,0,-64,-90,-64]};
    const steps={atlas:132,clay:136,editorial:132,transit:140,folio:128};
    const rows=Array.from({length:56},(_,idx)=>{
      const n=idx+1,checkpoint=n%8===0,type=n<current?'completed':n===current?'current':'locked';
      const x=waves[id][idx%8],dx=waves[id][(idx+1)%8]-x,step=steps[id];
      const heading=idx%8===0?'<div class="chapter-heading" data-chapter="'+Math.ceil(n/8)+'"><span>Глава '+Math.ceil(n/8)+' из 7</span><b>'+((n-1)/8*8+1)+'–'+(Math.ceil(n/8)*8)+' сессии</b></div>':'';
      const caption=checkpoint?(n===56?'Итог урока':'Проверка главы'):n===current?'Ваш следующий шаг':n<current?'Пройдено':'Сессия '+n;
      const detail=id==='clay'?'<div class="platform-label"><span>'+n+' / 56</span><b>'+caption+'</b></div>':id==='editorial'?'<div class="capsule-info"><b>'+caption+'</b><span>'+((n-1)%8===7?'Вспоминаем без подсказок':'Короткая практика')+'</span>'+(n===current?'<strong>Открыть занятие '+icon('arrow')+'</strong>':'')+'</div>':id==='transit'?'<div class="station-info"><b>'+caption+'</b><span>'+n+' / 56</span></div>':'<div class="node-caption">'+caption+'</div>';
      return heading+'<div class="map-row '+(n<current?'done':'')+' '+(checkpoint?'chapter-end':'')+' '+(n===current?'active-row':'')+'" data-row="'+n+'" style="--x:'+x+'px;--step:'+step+'px;--line-angle:'+(-Math.atan(dx/step)*180/Math.PI)+'deg;--line-length:'+Math.hypot(dx,step)+'px"><div class="map-node-wrap">'+orb(type,n,'',id)+detail+(n===current&&id!=='editorial'&&id!=='transit'?'<span class="current-bubble">Вы здесь</span>':'')+'</div></div>';
    }).join('');
    return header(s,l.title,'',true).replace('phone-header','phone-header map-header')+(id==='atlas'?'':'<div class="map-summary"><span>'+progressRing(current-1,56,'<b>'+Math.round((current-1)/56*100)+'<small>%</small></b>')+'</span><div><b>'+Math.max(0,current-1)+' из 56 сессий</b><span>Глава '+chapter+' · ещё '+(8-(current-1)%8)+' до проверки</span></div></div>')+'<div class="chapter-strip" aria-label="Перейти к главе">'+Array.from({length:7},(_,i)=>btn('chapter','Глава '+(i+1),String(i+1),i+1===chapter?'active':'','data-chapter="'+(i+1)+'"')).join('')+'</div><div class="content-scroll map-scroll">'+(s.status==='offline'?offline():'')+'<div class="map-track map-'+id+'">'+rows+'</div></div>'+btn('recenter','Вернуться к текущей сессии',icon('target'),'recenter')+(withModal?sessionModal(id,s):'');
  }
  
  function sessionModal(id,s) {
    const status=s.inspection||s.status,locked=status==='locked',completed=status==='completed',checkpoint=status==='checkpoint',unavailable=status==='offline',loading=status==='loading';
    const title=locked?'Этот шаг впереди':completed?'Навык уже с вами':checkpoint?'Проверка главы':'Первые фразы о себе';
    const outcome=locked?'Завершите предыдущий шаг, чтобы открыть эту сессию.':completed?'Вернитесь к знакомым фразам. Пройденное останется с вами.':checkpoint?'Примените знакомые слова и фразы с меньшим количеством подсказок.':unavailable?'Материалы занятия пока не сохранены. Подключитесь к сети и повторите подготовку.':'Скажите, что вы здесь, готовы и рады. Сначала разберёмся — затем попробуем.';
    const action=locked||unavailable?'dismiss':loading?'noop':'start',cta=locked?'Вернуться на карту':unavailable?'На карту':loading?'Подготавливаем…':completed?'Повторить сессию':checkpoint?'Начать проверку':'Начать сессию';
    const close=btn('dismiss','Закрыть сведения о сессии',icon('close'),'dialog-close');
    const label='<span class="dialog-kicker">Сессия '+s.selected+' · Глава '+Math.ceil(s.selected/8)+'</span>';
    const heading='<h2 id="'+id+'-dialog-title">'+title+'</h2><p class="outcome">'+outcome+'</p>';
    const art='<div class="dialog-art">'+orb(locked?'locked':completed?'completed':checkpoint?'checkpoint':'current',s.selected,'',id,true)+'</div>';
    const stats=locked||unavailable?'':'<div class="dialog-stats"><div>'+icon('clock')+'<b>~5</b><span>минут</span></div><div>'+icon('book')+'<b>'+ (checkpoint?'0':'4')+'</b><span>новых слова</span></div><div>'+icon('heart')+'<b>3</b><span>попытки</span></div></div>';
    const steps=locked||unavailable?'':'<div class="session-steps"><span><b>01</b> Разобраться</span><i></i><span><b>02</b> Попробовать</span></div>';
    const start=btn(action,cta,loading?'<span class="spinner"></span>'+cta:cta+icon('arrow'),'primary',loading?'disabled':'');
    const skip=!locked&&!checkpoint&&!unavailable&&!loading?btn('skip','Перейти к практике без теории','Сразу к практике','text-button'):'';
    let content;
    if(id==='atlas')content='<div class="modal-scene">'+art+label+heading+'</div>'+stats+'<div class="modal-action">'+start+skip+'</div>';
    if(id==='clay')content='<div class="sheet-handle"></div>'+label+'<div class="module-modal-lead">'+heading+'</div><div class="module-modal-preview">'+art+'<div><b>I am here.</b><span>Я здесь.</span></div></div>'+steps+stats+start+skip;
    if(id==='editorial')content=label+heading+'<div class="panorama-example">'+art+'<div><span>Ваша первая фраза</span><b>I am<br>here.</b></div></div>'+steps+stats+'<div class="modal-action">'+start+skip+'</div>';
    if(id==='transit')content='<div class="route-modal-card">'+label+'<div class="route-modal-lead">'+art+'<div>'+heading+'</div></div>'+steps+'</div><div class="route-modal-dock">'+stats+start+skip+'</div>';
    if(id==='folio')content='<div class="orbit-modal-top">'+label+'<div class="orbit-ready">'+art+'<span>'+(completed?'Освоено':locked?'Впереди':'Готовы к старту')+'</span></div></div>'+heading+stats+start+skip;
    return '<div class="dialog-layer modal-'+id+'" data-overlay="session"><section class="dialog dialog-'+id+'" role="dialog" aria-modal="true" aria-labelledby="'+id+'-dialog-title">'+close+content+'</section></div>';
  }
  
  function nodeScreen(id,s) {
    const d=directions.find(d=>d.id===id);
    return header(s,'У каждого шага свой характер','ДВИЖЕНИЕ · ЧЕТЫРЕ СОСТОЯНИЯ')+`<div class="content-scroll" style="padding:0"><div class="node-gallery">${[['completed','Пройдено',3],['current','Вы здесь',5],['locked','Впереди',6],['checkpoint','Проверка',8]].map(([type,label,n])=>`<div class="node-sample">${orb(type,n,label,id)}<span>${label}</span></div>`).join('')}</div><div class="motion-card"><b>${d.motion}</b>${d.motionNote}</div><div class="motion-card">Нажмите на любой узел: откроется полноценный модал. Состояние различимо по форме, символу и подписи.</div></div>`;
  }
  function introScene(id,s) {
    const words=['I','am',['here','ready','fine'][s.intro]],translation=['Я здесь.','Я готов.','У меня всё хорошо.'][s.intro];
    const sentence=words.join(' ')+'.';
    if(id==='clay')return '<div class="intro-scene scene-builder"><span class="scene-label">Потрогайте фразу</span><div class="interactive-formula">'+words.map((w,i)=>btn('formula','Показать роль слова '+w,w,'word-tile','data-slot="'+i+'"')).join('')+'</div><div class="formula-hint">Кто говорит · связка · о себе</div><div class="translation">'+translation+'</div></div>';
    if(id==='folio')return '<div class="intro-scene scene-orbit"><div class="orbit-formula"><span>'+words[0]+'</span>'+btn('repair','Вернуть am в фразу','＋','repair-tile')+'<span>'+words[2]+'.</span></div><div class="translation">Верните связку, чтобы фраза стала целой</div></div>';
    if(id==='transit')return '<div class="intro-scene scene-conversation"><span class="speaker-avatar">'+icon('person')+'</span><div><span class="scene-label">Попробуйте сказать</span><div class="example">'+sentence+'</div><div class="translation">'+translation+'</div></div></div>';
    if(id==='editorial')return '<div class="intro-scene scene-comparison"><div><span class="scene-label">По-английски</span><div class="example">'+words[0]+' <strong>am</strong><br>'+words[2]+'.</div></div><div class="translation"><span>По-русски</span><b>'+translation+'</b></div></div>';
    return '<div class="intro-scene scene-rule"><span class="scene-label">Сразу в речь</span><div class="example">'+words[0]+' <strong>am</strong> '+words[2]+'.</div><div class="translation">'+translation+'</div></div>';
  }
  function introScreen(id,s) {
    const p=data.intros[s.intro],answer=s.answers[s.intro],correct=answer===p.correct,wrong=answer!==undefined&&!correct;
    const order=s.intro===0?[1,0,2]:s.intro===1?[2,1,0]:[0,2,1];
    const paragraphs=p.body.split(/\n\s*\n/).map(t=>'<p>'+semantic(t.replace(/\n/g,' '))+'</p>');
    const choices=order.map((choice,idx)=>'<button class="answer '+(answer===choice?(correct?'correct':'wrong-answer'):'')+'" data-action="answer" data-choice="'+choice+'" aria-label="'+esc(p.choices[choice].text)+(answer===choice?(correct?', верно':', попробуйте ещё'):'')+'" '+(correct?'disabled':'')+'><span class="answer-letter">'+String.fromCharCode(65+idx)+'</span><span>'+esc(p.choices[choice].text)+'</span>'+(answer===choice&&correct?icon('check'):'')+'</button>').join('');
    let feedback='';
    if(correct)feedback='<div class="feedback" role="status"><b>'+icon('check')+' Получилось!</b><span>'+(s.intro===2?'Теперь применим это на практике.':'Вы уже можете сказать эту фразу.')+'</span></div>';
    if(wrong){const wrongIndex=answer<p.correct?answer:answer-1;feedback='<div class="feedback error" role="status"><b>Попробуйте ещё раз</b><span>'+esc(p.feedback[wrongIndex]||'Прочитайте объяснение и попробуйте ещё раз.')+'</span></div>';}
    const heading='<h2 class="intro-heading">'+esc(p.title)+'</h2>';
    const scene=introScene(id,s);
    const body='<div class="intro-body">'+paragraphs.join('')+'</div>';
    const question='<section class="question-zone"><p class="question-label">'+esc(p.prompt)+'</p><div class="answer-list">'+choices+'</div>'+feedback+'</section>';
    let teaching;
    if(id==='atlas')teaching=heading+'<section class="teaching-card">'+body+scene+'</section>';
    if(id==='clay')teaching=heading+scene+'<div class="explanation-modules">'+paragraphs.map((p,i)=>'<section><span class="explanation-number">'+(i+1)+'</span>'+p+'</section>').join('')+'</div>';
    if(id==='editorial')teaching=heading+scene+'<section class="panorama-explanation">'+body+'</section>';
    if(id==='transit')teaching=heading+'<div class="conversation-thread">'+paragraphs.map(p=>'<div class="teacher-message">'+p+'</div>').join('')+scene+'</div>';
    if(id==='folio')teaching=heading+scene+'<section class="orbit-explanation">'+body+'</section>';
    const exhausted=s.hearts===0?'<div class="dialog-layer"><section class="dialog recovery" role="dialog" aria-modal="true" aria-labelledby="'+id+'-recovery-title">'+btn('map','Вернуться на карту',icon('close'),'dialog-close')+'<div class="recovery-symbol">'+icon('heart')+'</div><h2 id="'+id+'-recovery-title">Сделаем ещё один подход</h2><p class="outcome">Попытки закончились. Знакомая ловушка будет заметнее.</p>'+btn('restart-intro','Начать вводный пример заново','Попробовать снова','primary')+btn('map','Вернуться на карту','Вернуться на карту','text-button')+'</section></div>':'';
    return header(s,'','',true,true)+'<div class="intro-progress" aria-label="Интро '+(s.intro+1)+' из 3">'+[0,1,2].map(i=>'<i class="'+(i<=s.intro?'reached':'')+'"></i>').join('')+'</div><div class="content-scroll intro-scroll intro-'+id+'">'+teaching+question+'</div><div class="intro-footer">'+btn('intro-back','Предыдущее интро',icon('back'),'back',s.intro===0?'disabled':'')+btn('intro-next',s.intro===2?'К практике':'Дальше',s.intro===2?'К практике':'Дальше','primary',correct?'':'disabled')+btn('report','Сообщить об ошибке',icon('flag'),'icon-btn')+'</div>'+exhausted;
  }
  
  function wordScreen(id,s) {
    if(!s.words.includes('here'))s.words.push('here');
    const flipped=s.flipped||s.status==='flipped';
    const saved=s.saved.has('here');
    return header(s,'','',true,true)+`<div class="content-scroll"><h2 class="intro-heading">Послушайте и выберите</h2><div class="motion-card">Сначала познакомимся со словом.</div></div><div class="word-layer"><div class="eyebrow">НОВОЕ СЛОВО · 1 ИЗ 4</div><div class="word-card ${flipped?'flipped':''}"><button class="card-flip-area" data-action="flip" aria-label="${flipped?'здесь, перевернуть карточку':'here, перевернуть и узнать перевод'}"><span class="word-front" aria-hidden="${flipped}"><span class="word-main">here</span><span class="word-ipa">/hɪə/</span></span><span class="word-back" aria-hidden="${!flipped}"><span class="word-main">здесь</span></span></button>${btn('audio','Прослушать here',icon('volume'),'icon-btn',`data-word="here"`)}${btn('save',saved?'Убрать из сохранённых':'Сохранить слово',icon('bookmark'),'icon-btn bookmark',`aria-pressed="${saved}" `)}</div><p class="word-definition">${esc(data.wordDefinition)}</p><p class="word-hint">Нажмите на карточку, чтобы перевернуть</p>${btn('collect-word','Продолжить, слово полетит в карман','Продолжить','primary')}</div>`;
  }
  function pocketScreen(id,s) {
    const empty=s.status==='empty';
    const visible=empty?[]:s.words;
    return header(s,'Ваши слова',`${visible.length} ОТКРЫТО`,true).replace('data-action="lessons" aria-label="Все уроки"','data-action="close-pocket" aria-label="Вернуться к предыдущему экрану"')+`<div class="content-scroll">${visible.length?`<div class="course-summary"><span>Только то, с чем вы уже познакомились</span></div><div class="pocket-grid">${visible.map(w=>`<article class="pocket-card"><button class="pocket-flip" data-action="pocket-flip" data-word="${esc(w)}" aria-label="${esc(w)}, показать перевод"><b>${esc(w)}</b><span>${esc(words[w][1])}</span></button><div class="pocket-card-tools">${btn('audio',`Прослушать ${w}`,icon('volume'),'icon-btn',`data-word="${esc(w)}"`)}${btn('save',s.saved.has(w)?'Убрать из сохранённых':'Сохранить слово',icon('bookmark'),'icon-btn',`data-word="${esc(w)}" aria-pressed="${s.saved.has(w)}"`)}</div></article>`).join('')}</div><div class="motion-card" style="margin:25px 0">Слова остаются здесь после занятия. Нажмите на карточку, чтобы вспомнить значение.</div>`:`<div class="empty-state">${icon('book')}<h3>Здесь будут ваши слова</h3><p>Первое новое слово появится в кармане, как только вы познакомитесь с его карточкой.</p>${btn('word','Посмотреть первую карточку','Познакомиться со словом','primary')}</div>`}</div>${bottomNav('pocket')}`;
  }
  function completionFeedback(s) {
    const stars=Array.from({length:5},(_,i)=>btn('rate-complete',`Оценка ${i+1}`,icon('star'),'completion-rating-star '+(i<s.rating?'selected':''),`data-rating="${i+1}" aria-pressed="${i<s.rating}"`)).join('');
    return `<section class="completion-feedback"><span class="completion-section-label">ВАШЕ ВПЕЧАТЛЕНИЕ</span><h3>Всё было понятно?</h3><div class="completion-rating" role="radiogroup" aria-label="Оценка">${stars}</div><textarea class="completion-feedback-input" data-action="completion-feedback" maxlength="2000" placeholder="Где застрял? Что объяснить иначе?" aria-label="Комментарий к сессии">${esc(s.feedback)}</textarea>${btn('send-completion-feedback','Отправить оценку и комментарий','Отправить','completion-send',s.rating||s.feedback.trim()?'':'disabled')}</section>`;
  }
  function completionRewards(s) {
    return `<div class="completion-reward-grid"><div class="completion-reward xp-reward"><span class="reward-icon">XP</span><b class="reward-number" data-value="120">+120</b><small>опыта</small></div><div class="completion-reward rune-reward"><img src="${runeAsset}" alt=""><b class="reward-number" data-value="8">+8</b><small>рун</small></div><div class="completion-reward multiplier-reward">${icon('spark')}<b>XP ×1.5</b><small>серия 7 дней</small></div></div>`;
  }
  function completionScreen(id,s) {
    const status=s.status||'normal';
    const close=btn('map','Вернуться на карту',icon('close'),'back completion-close');
    const replay=btn('replay-complete','Повторить анимацию наград',icon('play')+'<span>Повторить начисление</span>','completion-replay');
    const cta=btn('finish-session','Продолжить путь','Продолжить путь '+icon('arrow'),'primary completion-primary');
    const sound='<div class="completion-sound-plan" aria-label="Звуковая последовательность"><span>ЗВУКИ ИЗ RESULTS SEQUENCE</span><b>медаль → 3 звезды → XP → руны → финал</b></div>';
    const feedback=completionFeedback(s),rewards=completionRewards(s);
    const stars='<div class="completion-stars" aria-label="Три звезды"><i>★</i><i>★</i><i>★</i></div>';
    const badge='<div class="completion-badge">'+icon('trophy')+'<span>СЕССИЯ 8</span></div>';
    const title='<div class="completion-title"><span>ГЛАВА 1 ЗАВЕРШЕНА</span><h2>Отличная работа</h2><p>Следующая сессия уже открыта</p></div>';
    const className=`content-scroll completion-screen completion-${id} completion-stage-${status} completion-run-${s.completionRun%2}`;
    let content='';
    if(id==='atlas')content=`<div class="completion-atlas-hero">${badge}${stars}${title}</div><div class="completion-atlas-ledger">${rewards}</div>${sound}${feedback}${cta}${replay}`;
    if(id==='clay')content=`<div class="completion-clay-stage">${title}<div class="completion-clay-medal">${badge}${stars}</div></div><div class="completion-clay-bento">${rewards}${sound}</div>${feedback}<div class="completion-actions">${cta}${replay}</div>`;
    if(id==='editorial')content=`<div class="completion-editorial-cover"><div class="completion-editorial-index"><span>СЕССИЯ</span><b>08</b></div><div>${badge}${title}${stars}</div></div><div class="completion-editorial-score"><span>ВАШ РЕЗУЛЬТАТ</span><b>120</b><small>XP ЗА СЕССИЮ</small></div>${rewards}${sound}${feedback}${cta}${replay}`;
    if(id==='transit')content=`<div class="completion-transit-head">${badge}${title}</div><div class="completion-transit-line"><div>${stars}<b>Три звезды</b><span>точность закреплена</span></div><div>${rewards}<b>Награды начислены</b><span>XP и руны уже в балансе</span></div><div>${icon('lock')}<b>Сессия 9 открыта</b><span>следующая остановка</span></div></div>${sound}${feedback}${cta}${replay}`;
    if(id==='folio')content=`<div class="completion-folio-orbit"><div class="folio-ring ring-one"></div><div class="folio-ring ring-two"></div>${badge}<div class="folio-score"><b>120</b><span>XP</span></div>${stars}</div>${title}<div class="completion-folio-receipt"><span>НАГРАДЫ СЕССИИ</span>${rewards}<i></i><b>Новый шаг открыт · 9 / 56</b></div>${sound}${feedback}${cta}${replay}`;
    return `<div class="completion-header">${close}<span>Итоги сессии</span><div class="completion-balance"><img src="${runeAsset}" alt=""><b>${s.runes+8}</b></div></div><div class="${className}">${content}</div>`;
  }
  function effectiveState(s){
    if(s.screen==='intro')return s.hearts===0?'exhausted':s.answers[s.intro]===undefined?'normal':s.answers[s.intro]===data.intros[s.intro].correct?'correct':'wrong';
    if(s.screen==='word')return s.status==='reduced'?'reduced':s.flipped||s.status==='flipped'?'flipped':s.saved.has('here')?'saved':'normal';
    if(s.screen==='pocket')return s.words.length?'normal':'empty';
    if(s.screen==='complete')return s.status;
    return s.inspection||s.status;
  }
  function syncEditorState(id){const host=document.querySelector('[data-style="'+id+'"] .phone-content');if(host){host.dataset.state=effectiveState(state[id]);window.V2_EDITOR?.onRender(id,host);}}
  function renderPhone(id,{center=false}={}) {
    const s=state[id];
    const host=document.querySelector(`[data-style="${id}"] .phone-content`);
    if(!host)return;
    const device=host.closest('.device');
    device.classList.toggle('reduced',s.status==='reduced');
    const renderers={lessons:lessonList,map:lessonMap,nodes:nodeScreen,modal:(a,b)=>lessonMap(a,b,true),intro:introScreen,word:wordScreen,pocket:pocketScreen,complete:completionScreen};
    host.innerHTML=renderers[s.screen](id,s);
    host.dataset.screen=s.screen==='intro'?'intro'+s.intro:s.screen;
    host.dataset.state=effectiveState(s);
    window.V2_EDITOR?.onRender(id,host);
    if(center)requestAnimationFrame(()=>centerMap(id));
    else if(s.screen==='map'||s.screen==='modal')requestAnimationFrame(()=>{const scroll=host.querySelector('.map-scroll');if(scroll)scroll.scrollTop=s.mapScrollTop||0;});
    if(host.querySelector('.dialog'))requestAnimationFrame(()=>host.querySelector('.dialog-close')?.focus({preventScroll:true}));
    if(s.screen==='intro'&&s.answers[s.intro]!==undefined)requestAnimationFrame(()=>{const scroll=host.querySelector('.content-scroll');scroll.scrollTop=scroll.scrollHeight;});
    if(s.screen==='word') scheduleAutoFlip(id);
  }
  function centerMap(id,chapter) {
    const host=document.querySelector(`[data-style="${id}"] .phone-content`);
    const scroll=host?.querySelector('.map-scroll');
    const s=state[id];
    const row=chapter?host.querySelector(`.map-track [data-chapter="${chapter}"]`):host.querySelector(`[data-row="${s.lesson===1?s.current:1}"]`);
    if(scroll&&row){
      if(scroll.clientWidth===0)return;
      const scrollRect=scroll.getBoundingClientRect(),hostRect=host.getBoundingClientRect();
      const scale=scrollRect.width/scroll.clientWidth;
      const target=(chapter?row:row.querySelector('.orb')).getBoundingClientRect();
      const desired=chapter?scrollRect.top+24*scale:hostRect.top+hostRect.height/2;
      scroll.scrollTop=centeredScrollTop(scroll.scrollTop,chapter?target.top:target.top+target.height/2,desired,scale);
      s.mapScrollTop=scroll.scrollTop;
    }
    if(chapter)host.querySelectorAll('.chapter-strip button').forEach((b,i)=>b.classList.toggle('active',i+1===chapter));
  }
  function centeredScrollTop(current,targetCenter,desiredCenter,scale){return Math.max(0,current+(targetCenter-desiredCenter)/scale);}
  function enterPocket(s){
    if(s.screen==='pocket')return false;
    s.pocketReturn={screen:s.screen,status:s.status};
    s.screen='pocket';s.status='normal';return true;
  }
  function leavePocket(s){
    s.screen=s.pocketReturn?.screen||'lessons';
    s.status=s.pocketReturn?.status||'normal';s.pocketReturn=null;
  }
  function drawGallery() {
    gallery.innerHTML=directions.map((d,i)=>`<article class="direction ${d.id===focusedStyle?'selected':''}" data-style="${d.id}"><div class="direction-caption"><span class="direction-number">0${i+1}</span><h2>${d.name}</h2><p>${d.tagline}</p></div><div class="device-wrap"><div class="device"><div class="statusbar"><span>9:41</span><span class="status-icons">${icon('bars')}${icon('battery')}</span></div><div class="phone-content"></div><div class="home-indicator"></div></div></div><p class="direction-note">${d.note}</p></article>`).join('');
    directions.forEach(d=>renderPhone(d.id));
  }
  function configureScreen(screen,status='normal') {
    selectedScreen=screen;
    if(ownerMode){focused=screen!=='complete';focusedStyle=screen==='word'?'editorial':'atlas';document.body.classList.toggle('focused',focused);document.body.classList.add('owner-approved');document.querySelector('#compare-toggle').textContent=focused?'Сравнить 5 рядом':'Смотреть крупнее';document.querySelectorAll('.direction').forEach(d=>d.classList.toggle('selected',d.dataset.style===focusedStyle));document.querySelectorAll('[data-direction]').forEach(d=>d.setAttribute('aria-selected',String(d.dataset.direction===focusedStyle)));}
    directions.forEach(d=>{
      const s=state[d.id];
      s.screen=screen.startsWith('intro')?'intro':screen;
      s.status=status;s.inspection=null;s.filter='all';
      if(screen==='map'||screen==='modal'){s.lesson=1;s.current=status==='first'?1:status==='middle'?25:status==='last'?56:status==='checkpoint'?8:5;s.selected=status==='completed'?3:status==='locked'?7:status==='checkpoint'?8:5;}
      if(screen.startsWith('intro')){s.intro=Number(screen.slice(-1));s.answers={};s.attempts={};s.hearts=3;s.runes=status==='correct'?3:0;const p=data.intros[s.intro];if(status==='correct')s.answers[s.intro]=p.correct;if(status==='wrong'||status==='exhausted'){s.answers[s.intro]=p.correct===0?1:0;s.hearts=status==='exhausted'?0:2;s.attempts[s.intro]=status==='exhausted'?4:2;}}
      if(screen==='word'){s.flipped=status==='flipped';s.words=[];if(status==='saved')s.saved.add('here');}
      if(screen==='pocket')s.words=status==='empty'?[]:['here','ready','fine','happy'];
      if(screen==='complete'){s.status=status;s.runes=48;s.rating=status==='feedback'?4:0;s.feedback='';s.completionRun++;}
      renderPhone(d.id,{center:true});
    });
    document.querySelectorAll('.screen-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.screen===screen)));
    document.querySelector('#state-select').innerHTML=variants[screen].map(([v,label])=>`<option value="${v}" ${v===status?'selected':''}>${label}</option>`).join('');
  }
  function toast(id,text) {
    const host=document.querySelector(`[data-style="${id}"] .phone-content`);
    host.querySelector('.toast')?.remove();
    const node=document.createElement('div');node.className='toast';node.setAttribute('role','status');node.textContent=text;host.append(node);setTimeout(()=>node.remove(),3000);
  }
  const autoFlipTimers=new Map();
  function scheduleAutoFlip(id) {
    clearTimeout(autoFlipTimers.get(id));
    if(state[id].flipped||state[id].status==='flipped')return;
    autoFlipTimers.set(id,setTimeout(()=>{
      if(state[id].screen!=='word')return;
      state[id].flipped=true;
      const card=document.querySelector(`[data-style="${id}"] .word-card`);
      if(card){updateWordFace(card,true);syncEditorState(id);}
    },3000));
  }
  function updateWordFace(card,flipped){
    card.classList.toggle('flipped',flipped);
    card.querySelector('.card-flip-area').setAttribute('aria-label',flipped?'здесь, перевернуть карточку':'here, перевернуть и узнать перевод');
    card.querySelector('.word-front').setAttribute('aria-hidden',String(flipped));
    card.querySelector('.word-back').setAttribute('aria-hidden',String(!flipped));
  }
  function reduced(id){return paused||state[id].status==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function flyRunes(id,origin,count) {
    const host=document.querySelector(`[data-style="${id}"] .phone-content`);
    const target=host.querySelector('.balance img');
    if(!target)return;
    host.querySelector('.rune-counter').textContent=state[id].runes;
    host.querySelector('.balance').setAttribute('aria-label',`${state[id].runes} рун`);
    if(reduced(id))return;
    const h=host.getBoundingClientRect(),t=target.getBoundingClientRect();
    const scale=h.width/host.offsetWidth;
    const from={x:(origin.x-h.x)/scale,y:(origin.y-h.y)/scale};
    const to={x:(t.x+t.width/2-h.x)/scale,y:(t.y+t.height/2-h.y)/scale};
    for(let i=0;i<count;i++){
      const rune=document.createElement('img');rune.src=runeAsset;rune.alt='';rune.className='flying-rune';rune.style.left=`${from.x-12}px`;rune.style.top=`${from.y-12}px`;host.append(rune);
      const dx=to.x-from.x,dy=to.y-from.y;
      const flight=rune.animate([{transform:'translate(0,0) scale(1)',opacity:0},{transform:`translate(${dx*.25}px,${dy*.25-40}px) scale(1.13)`,opacity:1,offset:.3},{transform:`translate(${dx}px,${dy}px) scale(.6)`,opacity:1}],{duration:620,delay:i*90,easing:'cubic-bezier(.33,.52,.25,.99)',fill:'both'});
      flight.onfinish=()=>{rune.remove();if(i===count-1){target.parentElement.classList.remove('bump');requestAnimationFrame(()=>target.parentElement.classList.add('bump'));}};
    }
  }
  async function collectWord(id,button) {
    const s=state[id];if(button.disabled)return;button.disabled=true;
    clearTimeout(autoFlipTimers.get(id));
    const host=button.closest('.phone-content'),card=host.querySelector('.word-card'),target=host.querySelector('.pocket-button .mini-stack');
    if(!s.words.includes('here'))s.words.push('here');
    if(!reduced(id)&&card&&target){
      const h=host.getBoundingClientRect(),a=card.getBoundingClientRect(),b=target.getBoundingClientRect(),scale=h.width/host.offsetWidth;
      const clone=document.createElement('div');clone.className='flying-card';clone.textContent=s.flipped?'здесь':'here';Object.assign(clone.style,{left:`${(a.left-h.left)/scale}px`,top:`${(a.top-h.top)/scale}px`,width:`${a.width/scale}px`,height:`${a.height/scale}px`});host.append(clone);card.style.opacity='0';
      const dx=(b.left+b.width/2-a.left-a.width/2)/scale,dy=(b.top+b.height/2-a.top-a.height/2)/scale;
      const flight=clone.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${dx}px,${dy}px) scale(.12)`}],{duration:460,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
      await flight.finished.catch(()=>{});clone.remove();
    }
    if(s.screen!=='word')return;
    enterPocket(s);renderPhone(id);toast(id,'Слово здесь. Вернитесь к нему в любой момент.');
  }
  function speak(id,word) {
    if(!('speechSynthesis'in window)){toast(id,'Озвучивание недоступно в этом браузере.');return;}
    speechSynthesis.cancel();const speech=new SpeechSynthesisUtterance(word);speech.lang='en-GB';speech.rate=.88;speech.onerror=()=>toast(id,'Не удалось запустить голос браузера.');speechSynthesis.speak(speech);
  }
  function playCompletionSounds(id) {
    if(reduced(id))return;
    const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextCtor)return;
    const context=new AudioContextCtor();
    const notes=[523.25,659.25,783.99,987.77,1174.66];
    notes.forEach((frequency,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.115;
      oscillator.type=index<3?'sine':'triangle';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.09,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+.14);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.16);
    });
    setTimeout(()=>context.close().catch(()=>{}),1100);
  }
  gallery.addEventListener('input',event=>{
    const input=event.target.closest('[data-action="completion-feedback"]');if(!input)return;
    const article=input.closest('[data-style]');if(!article)return;
    state[article.dataset.style].feedback=input.value;
    const send=article.querySelector('[data-action="send-completion-feedback"]');if(send)send.disabled=!(input.value.trim()||state[article.dataset.style].rating);
  });
  gallery.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
    const article=button.closest('[data-style]');if(!article)return;
    const id=article.dataset.style,s=state[id],action=button.dataset.action;
    focusedStyle=id;
    if(action==='noop')return;
    if(action==='lessons'||action==='home'){s.screen='lessons';s.status='normal';s.inspection=null;renderPhone(id);return;}
    if(action==='filter'){s.filter=button.dataset.filter;renderPhone(id);return;}
    if(action==='open-lesson'){s.lesson=Number(button.dataset.lesson);s.screen='map';s.status='normal';renderPhone(id,{center:true});return;}
    if(action==='map'){s.screen='map';s.status='normal';s.inspection=null;renderPhone(id,{center:true});return;}
    if(action==='chapter'){centerMap(id,Number(button.dataset.chapter));return;}
    if(action==='recenter'){centerMap(id);return;}
    if(action==='session'){
      if(button.closest('.dialog'))return;
      s.mapScrollTop=article.querySelector('.map-scroll')?.scrollTop||0;
      s.selected=Number(button.dataset.session);s.inspection=button.dataset.type==='current'?(s.selected%8===0?'checkpoint':'normal'):button.dataset.type;s.screen='modal';renderPhone(id);return;
    }
    if(action==='dismiss'){s.screen='map';s.inspection=null;s.status='normal';renderPhone(id);requestAnimationFrame(()=>article.querySelector(`[data-session="${s.selected}"]`)?.focus({preventScroll:true}));return;}
    if(action==='start'||action==='restart-intro'){s.screen='intro';s.intro=0;s.status='normal';s.answers={};s.attempts={};s.hearts=3;s.runes=0;renderPhone(id);return;}
    if(action==='skip'||action==='word'){s.screen='word';s.status='normal';s.flipped=false;s.words=['ready','fine','happy'];renderPhone(id);return;}
    if(action==='pocket'){
      if(!enterPocket(s))return;
      s.mapScrollTop=article.querySelector('.map-scroll')?.scrollTop||s.mapScrollTop||0;
      renderPhone(id);return;
    }
    if(action==='close-pocket'){leavePocket(s);renderPhone(id);return;}
    if(action==='progress'){toast(id,`Вы прошли ${s.current-1} сессии. Карта открывается на следующем шаге.`);return;}
    if(action==='report'){toast(id,'В приложении здесь открывается форма сообщения об ошибке. Макет ничего не отправляет.');return;}
    if(action==='answer'){
      const p=data.intros[s.intro];if(s.hearts===0||s.answers[s.intro]===p.correct)return;
      const a=Number(button.dataset.choice),rect=button.getBoundingClientRect();
      s.answers[s.intro]=a;s.attempts[s.intro]=s.attempts[s.intro]||1;
      const award=a===p.correct?(s.attempts[s.intro]===1?3:s.attempts[s.intro]===2?2:1):0;
      if(award)s.runes+=award;else{s.attempts[s.intro]++;s.hearts=Math.max(0,s.hearts-1);}
      renderPhone(id);
      if(s.hearts>0)requestAnimationFrame(()=>article.querySelector(award?'[data-action="intro-next"]':`[data-choice="${a}"]`)?.focus({preventScroll:true}));
      if(award)flyRunes(id,{x:rect.left+rect.width/2,y:rect.top+rect.height/2},award);
      return;
    }
    if(action==='intro-next'){if(s.answers[s.intro]!==data.intros[s.intro].correct)return;if(s.intro<2){s.intro++;renderPhone(id);}else{s.screen='word';s.status='normal';s.flipped=false;s.words=['ready','fine','happy'];renderPhone(id);}return;}
    if(action==='intro-back'){s.intro=Math.max(0,s.intro-1);renderPhone(id);return;}
    if(action==='formula'){button.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));article.querySelector('.formula-hint').textContent=['Кто говорит: я','Скрепка после I','Одно слово о себе'][Number(button.dataset.slot)];return;}
    if(action==='repair'){button.outerHTML='<strong class="target" >am</strong>';article.querySelector('.intro-scene .translation').textContent='Связка на месте. Фраза целая.';return;}
    if(action==='flip'){clearTimeout(autoFlipTimers.get(id));s.flipped=!s.flipped;s.status='normal';updateWordFace(article.querySelector('.word-card'),s.flipped);syncEditorState(id);return;}
    if(action==='save'){const word=button.dataset.word||'here';if(s.saved.has(word))s.saved.delete(word);else s.saved.add(word);button.setAttribute('aria-pressed',String(s.saved.has(word)));button.setAttribute('aria-label',s.saved.has(word)?'Убрать из сохранённых':'Сохранить слово');syncEditorState(id);toast(id,s.saved.has(word)?'Слово сохранено в ваши карточки':'Слово осталось в кармане урока');return;}
    if(action==='audio'){speak(id,button.dataset.word);return;}
    if(action==='collect-word'){void collectWord(id,button);return;}
    if(action==='pocket-flip'){const w=button.dataset.word;const flipped=button.dataset.flipped==='true';button.dataset.flipped=String(!flipped);button.querySelector('b').textContent=flipped?w:words[w][0];button.querySelector('span').textContent=flipped?words[w][1]:w;return;}
    if(action==='rate-complete'){s.rating=Number(button.dataset.rating);renderPhone(id);return;}
    if(action==='send-completion-feedback'){toast(id,'Спасибо! Отзыв сохранён в макете.');button.disabled=true;button.textContent='Отправлено';return;}
    if(action==='replay-complete'){s.status='normal';s.completionRun++;renderPhone(id);requestAnimationFrame(()=>playCompletionSounds(id));return;}
    if(action==='finish-session'){s.screen='map';s.status='normal';s.current=Math.min(56,s.current+1);renderPhone(id,{center:true});return;}
  });
  gallery.addEventListener('keydown',event=>{
    if(event.target.matches('[role="button"]')&&(event.key==='Enter'||event.key===' ')){event.preventDefault();event.target.click();}
    const modal=event.target.closest('.dialog');
    if(modal&&event.key==='Escape'){event.preventDefault();modal.querySelector('.dialog-close').click();}
    if(modal&&event.key==='Tab'){
      const items=[...modal.querySelectorAll('button:not([disabled])')],first=items[0],last=items.at(-1);
      if(event.shiftKey&&event.target===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&event.target===last){event.preventDefault();first.focus();}
    }
  });
  document.querySelector('#screen-tabs').innerHTML=screens.map(([key,label])=>`<button class="screen-tab" data-screen="${key}" role="tab" aria-selected="${key===selectedScreen}">${label}</button>`).join('');
  document.querySelector('#screen-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-screen]');if(b)configureScreen(b.dataset.screen);});
  document.querySelector('#state-select').addEventListener('change',event=>configureScreen(selectedScreen,event.target.value));
  document.querySelector('#direction-tabs').innerHTML=directions.map((d,i)=>`<button data-direction="${d.id}" aria-selected="${d.id===focusedStyle}">0${i+1} · ${d.name}</button>`).join('');
  document.querySelector('#direction-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-direction]');if(!b)return;focusedStyle=b.dataset.direction;document.querySelectorAll('.direction').forEach(d=>d.classList.toggle('selected',d.dataset.style===focusedStyle));document.querySelectorAll('[data-direction]').forEach(d=>d.setAttribute('aria-selected',String(d.dataset.direction===focusedStyle)));renderPhone(focusedStyle,{center:true});});
  document.querySelector('#compare-toggle').addEventListener('click',event=>{focused=!focused;document.body.classList.toggle('focused',focused);event.target.textContent=focused?'Сравнить 5 рядом':'Смотреть крупнее';document.querySelectorAll('.direction').forEach(d=>d.classList.toggle('selected',d.dataset.style===focusedStyle));requestAnimationFrame(()=>directions.forEach(d=>centerMap(d.id)));});
  document.querySelector('#motion-toggle').addEventListener('click',event=>{paused=!paused;document.body.classList.toggle('motion-paused',paused);event.target.setAttribute('aria-pressed',String(paused));event.target.textContent=paused?'Включить анимации':'Пауза анимаций';if(paused)document.getAnimations().forEach(a=>{if(Number.isFinite(a.effect?.getComputedTiming().endTime))a.finish();});});
  document.querySelector('#reset').addEventListener('click',()=>{directions.forEach(d=>state[d.id]=initialState());configureScreen('lessons');});
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();configureScreen('lessons');});
  document.body.classList.toggle('motion-paused',paused);
  window.V2_PROTOTYPE={state,directions,screens,variants,renderPhone,configureScreen,centerMap,effectiveState};
  drawGallery();configureScreen(window.V2_INITIAL_SCREEN || 'lessons');
  if('ResizeObserver' in window){
    const fit=new ResizeObserver(entries=>entries.forEach(({target,contentRect})=>{const device=target.querySelector('.device');device.style.zoom=String(Math.min(1,contentRect.width/device.offsetWidth));}));
    document.querySelectorAll('.device-wrap').forEach(wrap=>fit.observe(wrap));
  }
})();
