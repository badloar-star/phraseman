/* global landscape:writable, clearOverlay:writable, setScene:writable, setPalette:writable, progressByLesson:writable, unlockedLesson:writable, app:writable, icon:writable, lessons:writable, grammars:writable, modal:writable, state:writable, paletteStyle:writable, selectLesson:writable, firstAvailable:writable, showMap:writable, device:writable, emblem:writable, showAtlasClassic:writable, showCheckpoint:writable, showLesson:writable, completeDemo:writable */
'use strict';
// Presentation choreography. No wallet, production progress or network writes.
let horizonOrdinal = 0;
let transitionJob = 0;
let countFrame = 0;
let rewardVariant = 'normal';
let activePresentation = null;
let lastReceipt = null;
const demoReceipts = Object.freeze({
  normal: Object.freeze({id:'demo-normal',runes:54,stars:2,accuracy:95,time:'4:32',clean:17,second:1,assisted:1,skipped:1,review:false}),
  review: Object.freeze({id:'demo-review',runes:43,stars:1,accuracy:80,time:'5:08',clean:12,second:3,assisted:1,skipped:4,review:true}),
  zero: Object.freeze({id:'demo-zero',runes:0,stars:0,accuracy:0,time:'2:10',clean:0,second:0,assisted:0,skipped:20,review:true})
});
function quietMotion(){return document.body.classList.contains('motion-off')||matchMedia('(prefers-reduced-motion: reduce)').matches;}
function stopPresentation(){finishVisibleCounters();clearTimeout(transitionJob);transitionJob=0;cancelAnimationFrame(countFrame);countFrame=0;document.querySelector('.world-transition')?.remove();activePresentation=null;}
function finishVisibleCounters(){cancelAnimationFrame(countFrame);countFrame=0;document.querySelectorAll('[data-count-to]').forEach(el=>{el.textContent=el.dataset.countTo;});}
function runeImage(className=''){return `<img class="rune-image ${className}" src="art/rune.webp" alt="" aria-hidden="true" width="64" height="64">`;}
function portalWindow(ordinal){return `<div class="world-portal variant-${ordinal%7}" aria-hidden="true"><div class="portal-halo"></div><div class="portal-rim"><div class="portal-sky"><span class="world-sun"></span><span class="distant-ridge ridge-one"></span><span class="distant-ridge ridge-two"></span><div class="portal-land">${landscape(ordinal%7)}</div><div class="portal-mist"></div></div></div><div class="portal-step step-back"></div><div class="portal-step step-front"></div><span class="portal-sigil">${String(ordinal+1).padStart(2,'0')}</span></div>`;}
function renderHorizons(direction=0){
  stopPresentation();clearOverlay();setScene('atlas');
  const ordinal=horizonOrdinal;
  setPalette(ordinal%7);
  const count=progressByLesson.get(ordinal)?.size??0;
  const chapter=Math.min(7,Math.floor(count/8)+1);
  const accessible=ordinal<=unlockedLesson;
  app.innerHTML=`<section class="screen horizons-screen"><header class="app-header"><span class="wordmark">Горизонты</span><button class="language-chip" data-action="language"><span>EN</span> Английский ${icon('back','style="width:10px;height:10px;transform:rotate(-90deg)"')}</button></header><div class="horizon-topline"><span class="eyebrow">${['ПЕРВЫЕ ОТКРЫТИЯ','НОВЫЕ ВОЗМОЖНОСТИ','СВОЙ ГОЛОС','СВОБОДА В СЛОВАХ'][Math.floor(ordinal/8)]}</span><button data-action="all-horizons">Все 32 урока ${icon('layers')}</button></div><div class="horizon-content scroll-area"><div class="world-stage ${direction>0?'from-right':direction<0?'from-left':''}" tabindex="0" role="group" aria-label="Выбор мира. Стрелки влево и вправо переключают уроки."><span class="world-ordinal" aria-hidden="true">${String(ordinal+1).padStart(2,'0')}</span>${ordinal>0?`<button class="world-neighbor neighbor-left" data-action="previous-world" aria-label="Предыдущий мир">${icon('back')}<span>${String(ordinal).padStart(2,'0')}</span></button>`:''}<button class="portal-trigger" data-action="enter-world" aria-label="Открыть мир ${ordinal+1}: ${lessons[ordinal]}">${portalWindow(ordinal)}</button>${ordinal<31?`<button class="world-neighbor neighbor-right" data-action="next-world" aria-label="Следующий мир">${icon('arrow')}<span>${String(ordinal+2).padStart(2,'0')}</span></button>`:''}</div><div class="world-description" aria-live="polite"><div class="eyebrow">МИР ${String(ordinal+1).padStart(2,'0')} · УРОВЕНЬ ${['A1','A2','A2+','B1'][Math.floor(ordinal/8)]}</div><h2>${lessons[ordinal]}</h2><p>${grammars[ordinal]}</p><div class="world-chapters" aria-label="${count} из 56 сессий пройдено">${Array.from({length:7},(_,i)=>`<span class="${count>=(i+1)*8?'done':i===chapter-1&&accessible?'now':''}"></span>`).join('')}</div><div class="world-progress"><span>${accessible?`${count} / 56 сессий`:'Этот горизонт ещё впереди'}</span><span>${accessible?'Глава '+chapter+' / 7':'Можно заглянуть внутрь'}</span></div></div></div><footer class="world-footer"><button class="primary" data-action="enter-world">${accessible?'Войти в мир':'Заглянуть в мир'} ${icon('arrow')}</button><button class="world-shortcut" data-action="resume-current">${icon('play')}Сразу к моему занятию</button><nav class="horizon-utility" aria-label="Навигация раздела"><button data-action="dictionary">${icon('book')}Мои слова</button><button data-action="journey">${icon('flag')}Мой путь</button></nav><div class="world-dots"><span>${String(ordinal+1).padStart(2,'0')}</span><i></i><span>32</span></div></footer></section>`;
}
function changeHorizon(delta){const next=Math.max(0,Math.min(31,horizonOrdinal+delta));if(next===horizonOrdinal)return;const restoreFocus=!!document.activeElement?.closest('.world-stage');horizonOrdinal=next;renderHorizons(delta);if(restoreFocus)app.querySelector('.world-stage')?.focus({preventScroll:true});}
function allHorizons(){
  modal(`<div class="eyebrow" style="margin-top:15px">ТВОЙ ПУТЬ К СВОБОДНОЙ РЕЧИ</div><h2>Каждый мир —<br>новое умение.</h2><nav class="level-tabs horizon-levels" aria-label="Уровень курса">${['A1','A2','A2+','B1'].map((label,i)=>`<button data-horizon-level="${i}" aria-pressed="${state.level===i}" class="${state.level===i?'active':''}">${label}</button>`).join('')}</nav><div class="horizon-index">${lessons.slice(state.level*8,state.level*8+8).map((title,i)=>{const n=state.level*8+i;return `<button data-horizon="${n}" style="${paletteStyle(n%7)}"><span class="index-number">${String(n+1).padStart(2,'0')}</span><span><strong>${title}</strong><small>${grammars[n]}</small></span>${icon(n<=unlockedLesson?'arrow':'lock')}</button>`;}).join('')}</div>`,false,'Все уроки');
}
function openHorizon(){
  stopPresentation();
  selectLesson(horizonOrdinal);state.chapter=Math.min(6,Math.floor((firstAvailable()-1)/8));setPalette(state.lesson%7);
  showMap();setScene('portal');
  if(quietMotion())return;
  const layer=document.createElement('div');layer.className=`world-transition passage-${state.palette}`;layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<div class="passage-glow"></div><div class="passage-world">${portalWindow(state.lesson)}</div><div class="passage-title"><span>ГОРИЗОНТ ${String(state.lesson+1).padStart(2,'0')}</span><strong>${lessons[state.lesson]}</strong></div>`;
  device.append(layer);
  activePresentation='portal';
  transitionJob=setTimeout(()=>{layer.remove();activePresentation=null;transitionJob=0;},1450);
}
function receiptForResult(kind){
  const receipt=demoReceipts[rewardVariant];
  return Object.freeze({...receipt,kind,lesson:state.lesson,session:state.selected});
}
function rewardPanel(receipt){
  return `<div class="rune-award ${receipt.runes===0?'no-award':''}" role="group" aria-label="За сессию заработано ${receipt.runes} рун"><div class="rune-orbit-art">${runeImage('award-rune')}${receipt.runes>0?Array.from({length:7},(_,i)=>`<span class="flying-rune" style="--i:${i};--dx:${[-90,80,-64,75,-40,46,0][i]}px;--dy:${[-44,-50,38,30,-70,66,-90][i]}px">${runeImage()}</span>`).join(''):''}</div><div class="rune-award-copy"><span>ЗАРАБОТАНО ЗА СЕССИЮ</span><div class="rune-total"><b aria-hidden="true">+</b><strong data-count-to="${receipt.runes}" aria-hidden="true">${quietMotion()?receipt.runes:0}</strong><small>рун</small></div><p>${receipt.runes>0?'Твой результат уже сохранён':'В этот раз без новых рун'}</p></div><button class="reward-info" data-action="rune-details" aria-label="Как получились ${receipt.runes} рун">${icon('info')}</button></div>`;
}
function renderRewardResult(kind='result',replay=false){
  stopPresentation();clearOverlay();
  if(!replay||!lastReceipt)lastReceipt=receiptForResult(kind);
  const receipt=lastReceipt;
  // Commit fixture progress before playing decoration. No balance exists here.
  for(let n=1;n<=receipt.session;n++)state.completed.add(n);
  state.resultKind=kind;setScene(rewardVariant==='zero'?'reward-zero':rewardVariant==='review'?'reward-review':kind);
  const checkpoint=kind!=='result',final=kind==='final';
  const title=receipt.runes===0?'Практика<br>продолжается.':final?'Целый мир.<br>Теперь твой.':checkpoint?'Уверенность<br>становится твоей.':'Ещё ближе<br>к свободной речи.';
  app.innerHTML=`<section class="screen result-screen enriched-result"><header class="result-header"><button class="icon-button" data-action="map" aria-label="Вернуться на карту">${icon('close')}</button><span class="eyebrow">${final?'МИР ПРОЙДЕН':checkpoint?'ПРОВЕРКА ЗАВЕРШЕНА':'СЕССИЯ ЗАВЕРШЕНА'}</span><span style="width:30px"></span></header><div class="result-body"><div class="result-art"><span class="result-orbit"></span><span class="result-orbit second"></span>${emblem(kind)}${receipt.runes>0?Array.from({length:9},(_,i)=>`<span class="spark" style="--i:${i}"></span>`).join(''):''}</div>${!checkpoint?`<div class="result-stars" aria-label="${receipt.stars} из 3 звёзд">${[0,1,2].map(i=>icon('star',`style="--i:${i};${i>=receipt.stars?'fill:none;opacity:.35':''}"`)).join('')}</div>`:''}<h2>${title}</h2><p class="reward-subtitle">${final?'Семь глав позади. Новый горизонт ждёт.':checkpoint?'Вот что получилось и к чему можно вернуться.':receipt.runes===0?'Сохранённый прогресс остаётся с тобой.':'Практика закончилась. Умение осталось.'}</p>${rewardPanel(receipt)}${checkpoint?`<div class="skill-outcomes">${receipt.clean>0?`<div>${icon('check')}<span><strong>Закрепилось</strong><small>Пройденный материал</small></span></div>`:''}${receipt.review?`<div class="review-skill">${icon('repeat')}<span><strong>Стоит повторить</strong><small>Места, где понадобилась помощь</small></span></div>`:''}</div>`:''}<div class="result-metrics"><div class="metric" style="--i:0"><strong>${receipt.accuracy}%</strong><small>верных ответов</small></div><div class="metric" style="--i:1"><strong>${receipt.time}</strong><small>время</small></div><div class="metric" style="--i:2"><strong>${checkpoint?8:20}</strong><small>${checkpoint?'сессий в главе':'заданий'}</small></div></div><div class="result-insight">${icon(checkpoint?'flag':'book')}<span>${checkpoint?'Результат проверки сохранён.<br>Можно вернуться к пройденному.':'Изученные слова остаются<br>в словаре твоего мира.'}</span></div></div><footer class="result-footer"><button class="primary" data-action="result-next">${final?'Следующий горизонт':checkpoint?'Увидеть новую главу':'Продолжить путь'}${icon('arrow')}</button><button class="secondary" data-action="result-repeat">Повторить анимацию</button></footer></section>`;
  animateReceipt(receipt);
}
function animateReceipt(receipt){
  const target=app.querySelector('[data-count-to]');if(!target)return;
  if(quietMotion()||document.hidden||receipt.runes===0){target.textContent=String(receipt.runes);return;}
  activePresentation='count';let start=null;
  const tick=now=>{if(!target.isConnected){countFrame=0;activePresentation=null;return;}if(start===null)start=now;const progress=Math.max(0,Math.min(1,(now-start-220)/1050));target.textContent=String(Math.round(receipt.runes*(1-Math.pow(1-progress,3))));if(progress<1)countFrame=requestAnimationFrame(tick);else{target.textContent=String(receipt.runes);target.closest('.rune-award').classList.add('count-complete');countFrame=0;activePresentation=null;}};
  countFrame=requestAnimationFrame(tick);
}
function showRuneDetails(){if(!lastReceipt)return;const r=lastReceipt;modal(`<div class="eyebrow" style="margin-top:20px">ЗА ЭТУ СЕССИЮ</div><h2>Каждая руна<br>на своём месте.</h2><div class="rune-breakdown">${[['С первой попытки',r.clean,3],['Со второй попытки',r.second,2],['С помощью или позже',r.assisted,1],['Пропущено',r.skipped,0]].map(([label,count,rate])=>`<div><span>${label}<small>${count} × ${rate}</small></span><strong>${count*rate}</strong></div>`).join('')}<div class="breakdown-total"><span>Всего рун</span><strong>${r.runes}</strong></div></div><p class="body-copy">Звёзды отдельно показывают качество прохождения. Это не руны и не общий баланс.</p><button class="primary" data-action="close" style="margin-top:22px">Понятно</button>`,false,'Расчёт рун');}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const action=button.dataset.action,scene=button.dataset.scene;
  if(action==='enter-world'&&performance.now()<swipeUntil){event.stopImmediatePropagation();return;}
  if(button.dataset.palette!==undefined&&state.scene==='atlas'){event.stopImmediatePropagation();horizonOrdinal=Number(button.dataset.palette);renderHorizons();return;}
  if(button.dataset.lesson!==undefined){event.stopImmediatePropagation();horizonOrdinal=Number(button.dataset.lesson);openHorizon();return;}
  if(action==='atlas')horizonOrdinal=state.lesson;
  if(action==='start'||action==='demo-result')rewardVariant='normal';
  if(action==='motion-toggle'){finishVisibleCounters();if(activePresentation==='portal')stopPresentation();}
  const own=['enter-world','next-world','previous-world','all-horizons','resume-current','rune-details','result-repeat','result-next'].includes(action)||button.dataset.horizon!==undefined||button.dataset.horizonLevel!==undefined||['portal','reward-review','reward-zero','classic'].includes(scene);
  if(own)event.stopImmediatePropagation();
  if(button.dataset.horizon!==undefined){horizonOrdinal=Number(button.dataset.horizon);renderHorizons();return;}
  if(button.dataset.horizonLevel!==undefined){state.level=Number(button.dataset.horizonLevel);clearOverlay();allHorizons();return;}
  if(scene==='classic'){stopPresentation();showAtlasClassic();return;}
  if(scene==='portal'){openHorizon();return;}
  if(scene==='reward-review'||scene==='reward-zero'){rewardVariant=scene==='reward-zero'?'zero':'review';state.selected=8;renderRewardResult('chapter');return;}
  if(scene&&['result','chapter','final'].includes(scene)){rewardVariant='normal';}
  if(!own&&(scene||action==='map'||action==='atlas'||action==='close'))stopPresentation();
  switch(action){
    case 'enter-world':openHorizon();break;
    case 'next-world':changeHorizon(1);break;
    case 'previous-world':changeHorizon(-1);break;
    case 'all-horizons':state.level=Math.floor(horizonOrdinal/8);allHorizons();break;
    case 'resume-current':stopPresentation();selectLesson(unlockedLesson);state.chapter=Math.min(6,Math.floor((firstAvailable()-1)/8));setPalette(state.lesson%7);showMap();if(firstAvailable()%8===0){showCheckpoint(firstAvailable());}else{showLesson(firstAvailable());}break;
    case 'rune-details':showRuneDetails();break;
    case 'result-repeat':renderRewardResult(state.resultKind,true);break;
    case 'result-next':stopPresentation();horizonOrdinal=state.selected===56?Math.min(31,state.lesson+1):state.lesson;completeDemo();break;
  }
});
let swipeStart=null;let swipeUntil=0;
document.addEventListener('pointerdown',event=>{if(event.target.closest('.world-stage'))swipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};});
document.addEventListener('pointercancel',()=>{swipeStart=null;});
document.addEventListener('pointerup',event=>{if(!swipeStart||event.pointerId!==swipeStart.id)return;const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;swipeStart=null;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){swipeUntil=performance.now()+400;changeHorizon(dx<0?1:-1);}});
document.addEventListener('keydown',event=>{if(event.target.closest('.world-stage')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();changeHorizon(event.key==='ArrowRight'?1:-1);}if(event.key==='Escape'&&activePresentation==='portal')stopPresentation();});
document.addEventListener('change',event=>{if(event.target.id==='reduce-motion'&&event.target.checked){finishVisibleCounters();if(activePresentation==='portal')stopPresentation();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishVisibleCounters();if(activePresentation==='portal')stopPresentation();}});
