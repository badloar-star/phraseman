(() => {
 'use strict';
 const menu = document.querySelector('.menu-button');
 const nav = document.querySelector('#main-nav');
 function closeMenu() {nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Открыть меню');}
 menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav?.classList.contains('open')){closeMenu();menu.focus();}});
 nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
 document.querySelectorAll('#main-nav a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
 const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);const el=document.getElementById(id);if(el){e.preventDefault();window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-92,behavior:reduceMotion.matches?'instant':'smooth'});if(a.classList.contains('skip')){el.setAttribute('tabindex','-1');el.focus({preventScroll:true});}}}));
 document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(b=>{const selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
  let visible=0;document.querySelectorAll('.guide-card').forEach(card=>{const category=card.querySelector('.eyebrow')?.textContent;const filter=button.dataset.filter;const show=filter==='all'||(filter==='Метод'?['Метод','Привычка','С чего начать'].includes(category):filter==='Разговор'?['Разговор','Произношение'].includes(category):category===filter);card.hidden=!show;if(show)visible++;});
  const empty=document.querySelector('.filter-empty');if(empty)empty.hidden=visible>0;
 }));
 document.querySelectorAll('[data-gift]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-gift]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});document.querySelector('#gift-plan').textContent=button.dataset.gift;}));
 document.querySelector('#recipient')?.addEventListener('input',e=>{document.querySelector('#recipient-preview').textContent=e.target.value.trim()||'Кое-кому особенному';});
 const goals={travel:['Начните с фразы для кафе.','Разберите несколько выражений, которые пригодятся в поездке.','/guides/english-phrases-for-travel/'],talk:['Дайте разговору шанс.','Начните с коротких знакомых фраз. Понимать и говорить — разные навыки, и оба можно практиковать.','/guides/speaking-barrier/'],work:['Выберите знакомую ситуацию.','Возьмите короткую фразу, которая пригодится в разговоре с коллегой, и потренируйтесь произносить её целиком.','/guides/english-by-phrases/'],self:['Пусть это будет ваше время.','Выделите удобные 15 минут и начните с небольшой практики без гонки.','/guides/english-15-minutes-a-day/']};
 document.querySelectorAll('[data-goal]').forEach(button=>button.addEventListener('click',()=>{const [title,text,url]=goals[button.dataset.goal];document.querySelector('.goal-choices').hidden=true;const result=document.querySelector('#goal-result');result.hidden=false;result.innerHTML=`<h3>${title}</h3><p style="margin-top:16px">${text}</p><a class="button primary full" href="${url}">Посмотреть материал ↗</a><a class="small-link" href="/start/">Выбрать другую цель</a><a class="small-link" href="https://knowlyapps.com/start/">Открыть полный подбор на текущем сайте ↗</a>`;}));
 let selectedLanguage='en';
 const testLink=document.querySelector('#real-test-link');
 document.querySelectorAll('[data-test-language]').forEach(button=>button.addEventListener('click',()=>{selectedLanguage=button.dataset.testLanguage;document.querySelectorAll('[data-test-language]').forEach(b=>{const chosen=b===button;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));b.querySelector('i').textContent=chosen?'✓':'→';});if(testLink)testLink.href=`https://knowlyapps.com/english-level-test/?test=${selectedLanguage}&ui=ru`;}));
 const questions={
 en:[['Could I ___ a coffee, please?',['have','has','having'],0,'После could используется начальная форма глагола: have.'],['Nice to meet you.',['Приятно познакомиться.','До скорого.','Я вас не слышу.'],0,'Так говорят при знакомстве.'],['Could you say that again?',['Не могли бы вы повторить?','Как вас зовут?','Где выход?'],0,'Вежливая просьба повторить сказанное.']],
 de:[['Ich ___ aus Berlin.',['komme','kommt','kommen'],0,'С ich используется форма komme.'],['Danke!',['Спасибо!','До завтра!','Простите!'],0,'Danke означает «спасибо».'],['Wie heißen Sie?',['Как вас зовут?','Который час?','Где кафе?'],0,'Вежливый вопрос об имени.']],
 fr:[['Je ___ un café.',['voudrais','voudrait','voudrions'],0,'С je здесь используется voudrais.'],['Merci beaucoup.',['Большое спасибо.','Добрый вечер.','До завтра.'],0,'Так благодарят по-французски.'],['Comment allez-vous ?',['Как у вас дела?','Как вас зовут?','Где вы живёте?'],0,'Вежливый вопрос о том, как дела.']],
 it:[['Io ___ italiano.',['parlo','parla','parliamo'],0,'С io используется parlo.'],['Grazie mille.',['Большое спасибо.','До встречи.','Мне приятно.'],0,'Так выражают благодарность.'],['Come si chiama?',['Как вас зовут?','Что это?','Где кафе?'],0,'Вежливый вопрос об имени.']],
 es:[['Yo ___ español.',['hablo','habla','hablamos'],0,'С yo используется hablo.'],['Muchas gracias.',['Большое спасибо.','Очень приятно.','Доброе утро.'],0,'Так говорят «большое спасибо».'],['¿Cómo se llama?',['Как вас зовут?','Где вокзал?','Который час?'],0,'Вежливый вопрос об имени.']]
 };
 let questionIndex=0, answered=false;
 const panel=document.querySelector('#test-panel');
 function focusTitle(){const title=panel.querySelector('h2');title?.setAttribute('tabindex','-1');title?.focus({preventScroll:true});}
 function renderQuestion(){
  answered=false;const [question,answers]=questions[selectedLanguage][questionIndex];
  // Rotate display positions so the demonstration does not always reward the first option.
  const order=[[1,0,2],[2,1,0],[0,2,1]][questionIndex];
  panel.innerHTML=`<div class="test-progress" aria-label="Пример ${questionIndex+1} из 3">${[0,1,2].map(i=>`<span class="${i<=questionIndex?'done':''}"></span>`).join('')}</div><span class="eyebrow">ДЕМОНСТРАЦИЯ · ${questionIndex+1} / 3</span><h2>Выберите подходящий ответ</h2><p class="question-title">${question}</p><div class="answer-options">${order.map(i=>`<button data-answer="${i}">${answers[i]}</button>`).join('')}</div><div id="answer-feedback" aria-live="polite"></div><button id="next-question" class="button primary full" disabled>${questionIndex===2?'Завершить пример':'Дальше'} →</button><a class="small-link" href="/english-level-test/">Вернуться к выбору языка</a>`;
  panel.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{if(answered)return;answered=true;button.classList.add('selected');const [, ,correct,explanation]=questions[selectedLanguage][questionIndex];const right=Number(button.dataset.answer)===correct;panel.querySelectorAll('[data-answer]').forEach(b=>b.disabled=true);panel.querySelector('#answer-feedback').innerHTML=`<div class="answer-feedback"><b>${right?'Верно.':'Разберём вместе.'}</b><p>${explanation}</p></div>`;panel.querySelector('#next-question').disabled=false;}));
  panel.querySelector('#next-question').addEventListener('click',()=>{questionIndex++;if(questionIndex<3){renderQuestion();}else{panel.innerHTML=`<div class="demo-result-icon" aria-hidden="true">✓</div><span class="eyebrow">ПЕРВЫЙ ШАГ СДЕЛАН</span><h2>А теперь —<br>найдём ваш уровень.</h2><p class="result-copy">Вы посмотрели три примера. Этого недостаточно для оценки CEFR. Для ориентировочного результата пройдите полный тест.</p><a class="button primary full" href="https://knowlyapps.com/english-level-test/?test=${selectedLanguage}&ui=ru">Пройти полный тест ↗</a><a class="small-link" href="/english-level-test/">Вернуться к выбору языка</a>`;focusTitle();}});
  focusTitle();
 }
 document.querySelector('#start-demo')?.addEventListener('click',()=>{questionIndex=0;renderQuestion();});
 // Studio changes only visual presentation in this isolated preview.
 window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent)return;const data=event.data;if(!data||data.type!=='phraseman-preview-style')return;if(['citrus','apricot','sage'].includes(data.palette))document.documentElement.dataset.palette=data.palette;document.documentElement.classList.toggle('no-motion',data.motion===false);window.dispatchEvent(new Event('preview-motion-change'));});
 if(window.parent!==window)window.parent.postMessage({type:'phraseman-preview-route',path:location.pathname},location.origin);
})();
