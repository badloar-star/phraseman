// зачем: макет основных страниц сайта в стиле PhraseMan 2.0 (вариант C «Живые темы», выбор владельца 2026-10-15):
// /app/, /download/, /faq/, /contact/, /links/ и четыре юридических документа. Только новый дизайн —
// все элементы и тексты текущего сайта сохранены (русские тексты переведены на «ты», смысл тот же),
// юридические документы — на английском, дословно: текст читается из knowly-www/legal/*/index.html при сборке,
// чтобы макет никогда не разошёлся с живым документом.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ic, pageHead, ASSET } from '../_shell.mjs';
import { phone, todayList, FAQ } from '../_build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const IMG = ASSET.SITE + '/approved';
const STORE_IOS = 'https://apps.apple.com/app/id6764800879';
const STORE_GP = 'https://play.google.com/store/apps/details?id=app.phraseman';
const MAIL = 'support.phraseman@gmail.com';

// Facebook — в общем наборе иконок нет, рисуем тем же штрихом
const fbIcon = `<svg class="i s18" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 8.5H17V5h-2.5A4.5 4.5 0 0 0 10 9.5V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5h-3V9.5a1 1 0 0 1 1-1z"/></svg>`;

const close = `
<section class="block close"><div class="wrap"><div class="glass">
  <h2 class="h2">Говори увереннее.<span class="l2">В знакомых ситуациях.</span></h2>
  <a class="btn btn-primary" href="download.html"><span data-en="Start for free">Начать бесплатно</span> ${ic('arrow', 's18 arr')}</a>
</div></div></section>`;

const storeBtns = (cls = '') => `
<div class="stores big ${cls}">
  <a class="store" href="${STORE_IOS}" aria-label="Скачать Phraseman в App Store" target="_blank" rel="noopener">${ic('apple')}<span><small>Загрузить в</small><b>App Store</b></span></a>
  <a class="store alt" href="${STORE_GP}" aria-label="Скачать Phraseman в Google Play" target="_blank" rel="noopener">${ic('play')}<span><small>Доступно в</small><b>Google Play</b></span></a>
</div>`;

const APP_ALT = 'Phraseman: уровень, уроки, карточки и прогресс в теме Индиго';

/* ---------------- /app/ ---------------- */
const STEPS = [
  ['app-lessons.webp', 'Книги и глобус — иконка уроков Phraseman', '01 / Понимать', '01 / Understand', 'Учи фразу.', 'Сразу со смыслом.', 'Готовые выражения из реальных ситуаций. Слушай озвучку и связывай слова с тем, что хочешь сказать.', '33%'],
  ['app-dialogs.webp', 'Объёмная иконка диалогов Phraseman', '02 / Говорить', '02 / Speak', 'Дай словам', 'свой голос.', 'Тренируй произношение, повторяй вслух и переходи к диалогам. От узнавания фразы — к её использованию.', '66%'],
  ['app-cards.webp', 'Карточки для повторения в Phraseman', '03 / Запоминать', '03 / Remember', 'Вспоминай.', 'Не начинай заново.', 'Карточки и интервальные повторения помогают возвращаться к пройденному и удерживать фразы в памяти.', '100%'],
];

const appPage = {
  file: 'app.html',
  title: 'Не просто знать. Уметь сказать.',
  group: 'Основные',
  path: '/app/',
  body: `
<section class="hero app-hero"><div class="wrap">
  <div>
    <span class="ov rise">Внутри Phraseman</span>
    <h1 class="rise d1">Не просто знать.<span class="l2">Уметь сказать.</span></h1>
    <p class="lead rise d2">Учи готовые фразы, тренируй произношение и закрепляй выученное с интервальными повторениями.</p>
    <div class="cta-row rise d3"><a class="btn btn-primary" href="download.html">Скачать приложение ${ic('arrow', 's18 arr')}</a></div>
  </div>
  <div class="rise d2">${phone(todayList, APP_ALT, '9:41')}</div>
</div></section>

<section class="block" id="method"><div class="wrap">
  <div class="head">
    <span class="ov" data-en="The Phraseman method">Метод Phraseman</span>
    <h2 class="h2" data-en-html="From familiar words&lt;span class=&quot;l2&quot;&gt;to speaking for yourself.&lt;/span&gt;">От знакомых слов —<span class="l2">к собственной речи.</span></h2>
    <p>Фраза целиком. Звучание. Практика.<br>И повторение, которое помогает сохранить выученное.</p>
  </div>
  <div class="steps">
    ${STEPS.map(([img, alt, n, en, a, b, p, w]) => `
    <article class="glass step"><div class="n"><span class="art"><img src="${IMG}/${img}" alt="${alt}" width="56" height="56" loading="lazy"></span><span data-en="${en}">${n}</span></div>
      <h3>${a}<br>${b}</h3><p>${p}</p><div class="trk"><b style="--w:${w}"></b></div></article>`).join('')}
  </div>
</div></section>
${close}`,
  css: `
.app-hero .wrap { grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); }
.app-hero h1 .l2 { display: block; }
.step .art { width: 56px; height: 56px; border-radius: 16px; background: var(--tile); display: grid; place-items: center; overflow: hidden; }
.step .art img { width: 46px; height: 46px; object-fit: contain; display: block; }
@media (max-width: 980px) { .app-hero .wrap { grid-template-columns: minmax(0, 1fr); } }`,
};

/* ---------------- /download/ ---------------- */
const downloadPage = {
  file: 'download.html',
  title: 'Твой голос. Теперь с тобой.',
  group: 'Основные',
  path: '/download/',
  body: `
<section class="hero dl-hero"><div class="wrap">
  <div class="dl-copy">
    <span class="ov rise">Phraseman · iOS и Android</span>
    <h1 class="rise d1">Твой голос.<span class="l2">Теперь с тобой.</span></h1>
    <p class="lead rise d2">Фразы из жизни. Практика произношения.<br>Повторение, которое становится привычкой.</p>
    <div class="rise d3">${storeBtns()}</div>
    <div class="qr dl-qr rise d3">
      <img src="${IMG}/qr.svg" alt="QR-код страницы скачивания" width="112" height="112">
      <div><b>Открыть на другом устройстве</b><p>Наведи камеру телефона<br>и выбери свой магазин.</p></div>
    </div>
  </div>
  <div class="rise d2">${phone(todayList, APP_ALT, '9:41')}</div>
</div></section>

<section class="block"><div class="wrap"><div class="glass next-card">
  <img class="energy" src="${IMG}/app-energy.webp" alt="" width="96" height="96" loading="lazy">
  <div class="copy">
    <h2 class="h2">Следующий шаг —<span class="l2">первое занятие.</span></h2>
    <p>Установи приложение, выбери свой уровень<br>и начни знакомство с Phraseman.</p>
    <a class="btn btn-primary" href="english-level-test.html">Узнать свой уровень ${ic('arrow', 's18 arr')}</a>
  </div>
</div></div></section>`,
  css: `
.dl-hero .wrap { grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); }
.dl-hero h1 .l2 { display: block; }
.dl-copy { display: grid; justify-items: start; }
.stores.big { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 36px; }
.stores.big .store { min-height: 60px; padding: 0 22px 0 18px; border-radius: 18px; gap: 12px; transition: transform 240ms var(--spring), filter 160ms; }
.stores.big .store:hover { filter: brightness(1.06); }
.stores.big .store:active { transform: scale(.97); transition-duration: 90ms; }
.stores.big .store small { font-size: 12px; }
.stores.big .store b { font-size: 18px; letter-spacing: -.01em; }
.store.alt { background: var(--card-solid); color: var(--text); border: 1px solid var(--edge); box-shadow: var(--shadow); }
.dl-qr { margin-top: 22px; padding: 14px 20px 14px 14px; gap: 18px; border-radius: 22px; max-width: 100%; }
.dl-qr img { width: 112px; height: 112px; padding: 8px; border-radius: 14px; }
.dl-qr b { font-size: 16px; }
.dl-qr p { color: var(--sec); font-size: 14px; margin-top: 4px; }
.next-card { --sx: 0%; --sy: 0%; border-radius: 34px; padding: clamp(28px, 6vw, 72px); display: grid; grid-template-columns: auto minmax(0, 1fr); gap: clamp(24px, 5vw, 56px); align-items: center; }
.next-card .energy { width: clamp(88px, 12vw, 140px); height: auto; aspect-ratio: 1; object-fit: contain; filter: drop-shadow(0 18px 30px rgba(0,0,0,.3)); }
@media (max-width: 980px) { .dl-hero .wrap { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 540px) {
  .next-card { grid-template-columns: minmax(0, 1fr); }
  .stores.big .store { flex: 1 1 100%; }
  .dl-qr img { width: 88px; height: 88px; }
}`,
};

/* ---------------- /faq/ ---------------- */
const FAQ_ALL = [...FAQ, ['Куда обратиться, если нужна помощь?', `Открой раздел поддержки. Там можно перейти к действующей форме обращения или написать на ${MAIL}.`]];
const faqPage = {
  file: 'faq.html',
  title: 'Ответы на вопросы',
  group: 'Основные',
  path: '/faq/',
  body: `
${pageHead({ ov: 'Ответы по делу', h1: 'Спросить —', l2: 'хорошее начало.', lead: 'Собрали главное о практике и приложении.' })}
<section class="faq-sec"><div class="wrap">
  <div class="glass faq" data-faq>${FAQ_ALL.map(([q, a]) => `<details name="faq"><summary>${q}<span class="pm">${ic('plus', 's18')}</span></summary><p>${a}</p></details>`).join('')}</div>
</div></section>
${close}`,
  css: `
.faq-sec .faq { margin-top: 0; max-width: 880px; }
.faq summary { transition: color 160ms; }
.faq summary:hover { color: var(--fill); }`,
  // зачем: на живом сайте открыт один пункт за раз; name="faq" делает это в новых браузерах, скрипт — в старых
  js: `
document.querySelectorAll('[data-faq]').forEach(function (box) {
  box.querySelectorAll('details').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      box.querySelectorAll('details').forEach(function (x) { if (x !== d && x.open) x.open = false; });
    });
  });
});`,
};

/* ---------------- /contact/ ---------------- */
// Одна и та же форма в разных состояниях макета: обычная, «Отправка…», успех, ошибка, нет адреса отправки.
const contactForm = (sfx, { status = '', sending = false } = {}) => `
<form class="glass form-card form" data-contact-form novalidate>
  <div class="hp" aria-hidden="true"><label for="trap-${sfx}">Company</label><input type="text" id="trap-${sfx}" name="company" tabindex="-1" autocomplete="off"></div>
  <div class="row2">
    <label class="field"><span>Имя (по желанию)</span><input class="input" type="text" name="name" maxlength="120" autocomplete="name"${sending ? ' disabled' : ''}></label>
    <label class="field"><span>Email для ответа *</span><input class="input" type="email" name="email" required maxlength="320" autocomplete="email"${sending ? ' disabled' : ''}></label>
  </div>
  <label class="field"><span>Тема</span>
    <span class="sel-wrap"><select class="select" name="topic"${sending ? ' disabled' : ''}><option value="support">Поддержка</option><option value="feedback">Отзыв</option><option value="legal">Юридический вопрос</option><option value="other">Другое</option></select>${ic('chev', 's18 sel-ch')}</span>
  </label>
  <label class="field"><span>Сообщение *</span><textarea class="textarea" name="message" required minlength="10" maxlength="5000" placeholder="Опиши вопрос или идею (не меньше 10 символов)"${sending ? ' disabled' : ''}></textarea></label>
  ${sending
    ? `<button type="submit" class="btn btn-primary send" disabled aria-busy="true"><span class="spinner on-cta" aria-hidden="true"></span><span>Отправка…</span></button>`
    : `<button type="submit" class="btn btn-primary send"><span>Отправить</span></button>`}
  <div class="status${status ? ' ' + status.kind : ''}" role="status" aria-live="polite">${status ? `${ic(status.kind === 'ok' ? 'check' : 'alert', 's18')}<span>${status.text}</span>` : ''}</div>
</form>`;

const contactPage = {
  file: 'contact.html',
  title: 'Давай поговорим',
  group: 'Основные',
  path: '/contact/',
  states: [['closed', 'Страница'], ['form', 'Форма открыта'], ['sending', 'Отправка…'], ['ok', 'Успех'], ['err', 'Ошибка'], ['nocfg', 'Нет адреса отправки']],
  body: `
<section class="phead ct-head"><div class="wrap split">
  <div class="copy">
    <span class="ov">Мы рядом</span>
    <h1>Хороший разговор<span class="l2">решает многое.</span></h1>
    <p class="lead">Не получается войти? Есть вопрос о занятиях?<br>Или идея, которой хочется поделиться?</p>
    <div class="mail"><a class="mail-link" href="mailto:${MAIL}">${MAIL} ${ic('out', 's18')}</a><span class="fine">Откроется твоё почтовое приложение.</span></div>
  </div>
  <div class="glass ct-card">
    <span class="ov">Поддержка рядом</span>
    <h2>Найдём ответ.</h2>
    <nav class="ct-links" aria-label="Поддержка">
      <a class="lrow" href="faq.html"><span class="tile">${ic('chat', 's18')}</span><span class="tx"><span class="tt">Вопросы о приложении</span></span>${ic('arrow', 's18 ch')}</a>
      <a class="lrow" href="premium.html"><span class="tile">${ic('star', 's18')}</span><span class="tx"><span class="tt">Plus, Pro и условия доступа</span></span>${ic('arrow', 's18 ch')}</a>
      <a class="lrow" href="russia.html"><span class="tile">${ic('card', 's18')}</span><span class="tx"><span class="tt">Оплата в России</span></span>${ic('arrow', 's18 ch')}</a>
      <a class="lrow" href="legal-data-deletion.html"><span class="tile">${ic('trash', 's18')}</span><span class="tx"><span class="tt">Удаление аккаунта и данных</span></span>${ic('arrow', 's18 ch')}</a>
    </nav>
    <a class="btn btn-primary ct-open" href="#contact-form" data-go="form" data-open-contact>Открыть форму поддержки ${ic('arrow', 's18 arr')}</a>
  </div>
</div></section>

<section id="contact-form" class="ct-form"><div class="wrap">
  <div data-state="closed"></div>
  <div data-state="form">${contactForm('f')}</div>
  <div data-state="sending">${contactForm('s', { sending: true })}</div>
  <div data-state="ok">${contactForm('o', { status: { kind: 'ok', text: 'Спасибо! Сообщение принято — мы его прочитаем и ответим.' } })}</div>
  <div data-state="err">${contactForm('e', { status: { kind: 'err', text: 'Не удалось отправить. Попробуй позже или напиши на почту.' } })}</div>
  <div data-state="nocfg">${contactForm('n', { status: { kind: 'err', text: `Не настроен адрес отправки. Напиши на ${MAIL}` } })}</div>
</div></section>`,
  css: `
.ct-head .split { align-items: start; }
.ct-head h1 { font-size: clamp(40px, 6vw, 76px); line-height: 1; letter-spacing: -.04em; }
.ct-head h1 .l2 { display: block; color: var(--sec); }
.ct-head .lead { font-size: var(--t-l); color: var(--sec); }
.mail { display: grid; gap: 8px; margin-top: 6px; }
.mail-link { display: inline-flex; align-items: center; gap: 10px; font-size: clamp(20px, 2.4vw, 26px); font-weight: 700; letter-spacing: -.01em; color: var(--text); overflow-wrap: anywhere; }
.mail-link svg { color: var(--fill); transition: transform 240ms var(--ease); }
.mail-link:hover svg { transform: translate(2px, -2px); }
.ct-card { --sx: 90%; --sy: 0%; padding: clamp(22px, 3.5vw, 32px); border-radius: 30px; display: grid; gap: 14px; }
.ct-card h2 { font-size: clamp(28px, 3.2vw, 38px); letter-spacing: -.03em; line-height: 1.1; }
.ct-links { margin: 4px -10px 0; }
.ct-links .lrow { padding: 12px 10px; border-radius: 16px; transition: background-color 160ms; }
.ct-links .lrow:hover { background: var(--control); }
.ct-links .lrow + .lrow::before { left: 72px; right: 10px; }
.ct-links .lrow:hover::before, .ct-links .lrow:hover + .lrow::before { opacity: 0; }
.ct-links .tile { width: 42px; height: 42px; border-radius: 12px; }
.ct-open { width: 100%; margin-top: 6px; }
.ct-form { scroll-margin-top: 100px; padding-top: clamp(8px, 2vw, 24px); }
.ct-form .form-card { max-width: 720px; margin-inline: auto; --sx: 10%; --sy: 0%; }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.sel-wrap { position: relative; display: block; }
.select { appearance: none; -webkit-appearance: none; padding-right: 44px; cursor: pointer; }
.sel-ch { position: absolute; right: 16px; top: 50%; transform: translateY(-50%) rotate(90deg); color: var(--sec); pointer-events: none; }
.input:disabled, .select:disabled, .textarea:disabled { opacity: .6; cursor: default; }
.send { width: 100%; }
.send:disabled { cursor: progress; filter: none; transform: none; }
.spinner.on-cta { width: 18px; height: 18px; border-width: 2px; border-color: color-mix(in srgb, var(--cta-ink) 25%, transparent); border-top-color: var(--cta-ink); }
.status { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; font-weight: 600; line-height: 1.45; }
.status:empty { display: none; }
.status.ok, .status.err { padding: 14px 16px; border-radius: 16px; background: var(--control); animation: fadeDown 360ms var(--ease); }
.status.ok svg { color: var(--fill); margin-top: 1px; }
.status.err { color: #F2766B; background: color-mix(in srgb, #F2766B 12%, var(--card-solid)); }
:root[data-mode="light"] .status.err { color: #C2382C; }
.status.err svg { margin-top: 1px; }
.status span { overflow-wrap: anywhere; }`,
  // зачем: оптимистичный отклик — «Отправка…» видна сразу после нажатия, повторное нажатие не шлёт второй раз
  js: `
(function () {
  var busy = false;
  function show(n) { if (window.__pmShow) window.__pmShow(n); try { history.replaceState(null, '', '#' + n); } catch (e) { console.warn('[CONTACT] якорь не записан:', e && e.message); } }
  document.querySelectorAll('[data-open-contact]').forEach(function (a) {
    a.addEventListener('click', function () {
      // зачем: общий переключатель листает к началу — по клику ведём прямо к форме, как на живом сайте
      setTimeout(function () { var f = document.getElementById('contact-form'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
    });
  });
  function copyValues(from) {
    var vals = {};
    from.querySelectorAll('[name]').forEach(function (el) { vals[el.name] = el.value; });
    document.querySelectorAll('[data-contact-form]').forEach(function (f) {
      if (f === from) return;
      f.querySelectorAll('[name]').forEach(function (el) { if (el.name in vals && el.name !== 'company') el.value = vals[el.name]; });
    });
  }
  document.querySelectorAll('[data-contact-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) { console.warn('[CONTACT] повторное нажатие — уже отправляем'); return; }
      var trap = form.querySelector('[name="company"]');
      if (trap && trap.value) { console.warn('[CONTACT] заполнена ловушка для ботов — тихо принимаем'); show('ok'); return; }
      busy = true;
      copyValues(form);
      show('sending');
      // макет: ответ сервера имитируем; на сайте здесь POST в submitWebsiteContact
      setTimeout(function () {
        busy = false;
        document.querySelectorAll('[data-state="ok"] [data-contact-form]').forEach(function (f) { f.reset(); });
        show('ok');
        console.log('[CONTACT] макет: отправлено успешно');
      }, 1400);
    });
  });
})();`,
};

/* ---------------- /links/ ---------------- */
const YT = [
  ['EN', 'Профессор Лингман · English', 'Английский на слух', 'https://www.youtube.com/@professorlingman'],
  ['ES', 'Профессор Лингман · Español', 'Испанский на слух', 'https://www.youtube.com/@ProfessorLingmanSpanish'],
  ['FR', 'Профессор Лингман · Français', 'Французский на слух', 'https://www.youtube.com/@mrLingmanfrench'],
  ['DE', 'Профессор Лингман · Deutsch', 'Немецкий язык', 'https://www.youtube.com/@mrlingmangerman'],
  ['IT', 'Профессор Лингман · Italiano', 'Итальянский на слух', 'https://www.youtube.com/@ProfessorLingmanItalian'],
  ['LA', 'Lingman Language Academy', 'English for English speakers', 'https://www.youtube.com/@englishlingman'],
];
const JOURNAL = [
  ['guide-conversation.webp', 'Разговор', 'Понимаю, но не могу ответить', 'guide-speaking-barrier.html'],
  ['guide-travel.webp', 'Путешествия', 'Весь мир начинается с «извините»', 'guide-travel.html'],
  ['guide-phrases.webp', 'Метод', 'Слова знакомые. А фраза не складывается?', 'guide-english-by-phrases.html'],
];
const ext = 'target="_blank" rel="noopener"';
const linksPage = {
  file: 'links.html',
  title: 'Phraseman и Профессор Лингман — все ссылки',
  group: 'Основные',
  path: '/links/',
  states: [['page', 'Страница'], ['copied', 'Ссылка скопирована'], ['url', 'Буфер недоступен']],
  body: `
<div class="wrap lk-top">
  <a class="lk-logo" href="index.html" aria-label="Phraseman — главная"><img src="${IMG}/brand.png" alt="" width="44" height="44"></a>
  <button type="button" class="theme-btn" data-theme-proxy aria-label="Тема сайта"><i></i></button>
</div>
<section class="lk"><div class="wrap lk-grid">
  <div class="lk-left">
    <h1 class="rise">Твой голос.<span class="l2">На другом языке.</span></h1>
    <p class="lead rise d1">Приложение Phraseman, каналы Профессора Лингмана и наше сообщество — всё в одном месте.</p>
    <div class="lk-cta rise d2">
      <a class="btn btn-primary" href="download.html" ${ext}>Скачать Phraseman бесплатно ${ic('arrow', 's18 arr')}</a>
      <div class="lk-stores">
        <a class="btn btn-ghost" href="${STORE_IOS}" ${ext}>${ic('apple', 's18')}App Store</a>
        <a class="btn btn-ghost" href="${STORE_GP}" ${ext}>${ic('play', 's18')}Google Play</a>
      </div>
    </div>
  </div>
  <div class="lk-right">
    <section class="lk-sec rise d1"><h3>Профессор Лингман на YouTube</h3>
      <div class="glass list">${YT.map(([c, t, s, u]) => `<a class="lrow" href="${u}" ${ext}><span class="tile code">${c}</span><span class="tx"><span class="tt">${t}</span><span class="st">${s}</span></span>${ic('youtube', 's18 ch')}</a>`).join('')}</div>
    </section>
    <section class="lk-sec rise d2"><h3>Сообщество</h3>
      <div class="lk-social">
        <a class="glass soc" href="https://t.me/lingmanacademy" ${ext}>${ic('telegram', 's18')}Telegram</a>
        <a class="glass soc" href="https://www.instagram.com/phraseman/" ${ext}>${ic('insta', 's18')}Instagram</a>
        <a class="glass soc" href="https://www.facebook.com/PhrasemanEnglish/" ${ext}>${fbIcon}Facebook</a>
      </div>
    </section>
    <section class="lk-sec rise d2"><h3>Попробовать</h3>
      <div class="glass list">
        <a class="lrow" href="english-level-test.html" ${ext}><span class="tile">${ic('check', 's18')}</span><span class="tx"><span class="tt">Тест уровня</span><span class="st">12–20 вопросов и именной сертификат</span></span>${ic('chev', 's18 ch')}</a>
        <a class="lrow" href="gift.html" ${ext}><span class="tile">${ic('gift', 's18')}</span><span class="tx"><span class="tt">Подарить доступ</span><span class="st">Сертификат на Plus или Pro</span></span>${ic('chev', 's18 ch')}</a>
      </div>
    </section>
    <section class="lk-sec rise d3"><h3>Из журнала</h3>
      <div class="lk-cards">${JOURNAL.map(([img, cat, t, u]) => `<a class="glass lk-card" href="${u}" ${ext}><img src="${IMG}/${img}" alt="" loading="lazy" width="112" height="84"><span class="tx"><span class="ov">${cat}</span><b>${t}</b></span></a>`).join('')}</div>
    </section>
  </div>
</div>
<div class="wrap lk-foot">
  <button type="button" class="btn btn-ghost" data-share>${ic('out', 's18')}Поделиться страницей</button>
  <span>© 2026 Knowly · Phraseman</span>
</div></section>
<div data-state="page"></div>
<div data-state="copied"><div class="toast" role="status" aria-live="polite">${ic('check', 's18 ok-ic')}Ссылка скопирована</div></div>
<div data-state="url"><div class="toast" role="status" aria-live="polite">${ic('link', 's18 ok-ic')}https://knowlyapps.com/links/</div></div>`,
  css: `
/* зачем: на живом сайте у /links/ своя компактная шапка (только логотип) и свой подвал */
.page > header.top, .page > footer { display: none; }
.lk-top { display: flex; justify-content: space-between; align-items: center; padding-top: 20px; }
.lk-logo img { width: 44px; height: 44px; border-radius: 12px; display: block; box-shadow: 0 8px 22px rgba(0,0,0,.25); transition: transform 240ms var(--spring); }
.lk-logo:active img { transform: scale(.94); }
.lk { padding-block: clamp(24px, 5vw, 56px) 32px; }
.lk-grid { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: clamp(32px, 6vw, 88px); align-items: start; }
.lk-left { position: sticky; top: 110px; display: grid; gap: 22px; }
.lk-left h1 { font-size: clamp(42px, 6vw, 76px); line-height: 1; letter-spacing: -.04em; }
.lk-left h1 .l2 { display: block; color: var(--sec); }
.lk-left .lead { font-size: var(--t-l); color: var(--sec); max-width: 34ch; }
.lk-cta { display: grid; gap: 12px; justify-items: start; margin-top: 8px; }
.lk-stores { display: flex; flex-wrap: wrap; gap: 10px; }
.lk-stores .btn { min-height: 46px; padding: 0 18px; font-size: 15px; }
.lk-right { display: grid; gap: 34px; }
.lk-sec h3 { font-size: 13px; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; color: var(--sec); margin: 0 0 12px 4px; }
.lk-sec .list { padding: 4px 0; }
a.lrow { transition: background-color 160ms; }
a.lrow:hover { background: color-mix(in srgb, var(--control) 60%, transparent); }
.tile.code { font-weight: 800; font-size: 14px; letter-spacing: .04em; }
.lk-sec .lrow + .lrow::before { left: 84px; }
.lk-social { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.soc { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px; padding: 0 14px; border-radius: 18px; font-weight: 700; font-size: 15px; transition: transform 240ms var(--spring); }
.soc:active { transform: scale(.97); }
.soc svg { color: var(--fill); }
.lk-cards { display: grid; gap: 10px; }
.lk-card { display: flex; align-items: center; gap: 16px; padding: 10px 18px 10px 10px; border-radius: 20px; transition: transform 300ms var(--ease); }
.lk-card:hover { transform: translateY(-2px); }
.lk-card img { width: 112px; height: 84px; border-radius: 14px; object-fit: cover; flex: none; filter: saturate(.85); }
.lk-card .tx { display: grid; gap: 4px; min-width: 0; }
.lk-card .ov { font-size: 11px; }
.lk-card b { font-size: 16px; line-height: 1.3; letter-spacing: -.01em; }
.lk-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-top: clamp(40px, 6vw, 72px); padding-top: 24px; font-size: var(--t-xs); color: var(--muted); }
.toast .ok-ic { flex: none; }
@media (max-width: 980px) { .lk-grid { grid-template-columns: minmax(0, 1fr); } .lk-left { position: static; } }
@media (max-width: 540px) {
  .lk-social { grid-template-columns: minmax(0, 1fr); }
  .lk-card img { width: 88px; height: 66px; }
  .lk-cta .btn-primary { width: 100%; }
  .lk-stores { width: 100%; } .lk-stores .btn { flex: 1; }
  .lk-foot { justify-content: center; text-align: center; }
}`,
  // зачем: «Поделиться» — системное меню на телефоне, копирование адреса на компьютере; тост показываем сразу
  js: `
(function () {
  var proxy = document.querySelector('[data-theme-proxy]'), real = document.querySelector('[data-theme-open]');
  if (proxy && real) proxy.addEventListener('click', function (e) { e.stopPropagation(); real.click(); });
  else console.warn('[LINKS] кнопка темы не найдена', !!proxy, !!real);
  var tt;
  function say(state) {
    if (window.__pmShow) window.__pmShow(state);
    clearTimeout(tt); tt = setTimeout(function () { if (window.__pmShow) window.__pmShow('page'); }, 1800);
  }
  document.querySelectorAll('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = 'https://knowlyapps.com/links/';
      if (navigator.share) {
        navigator.share({ title: 'Phraseman · Профессор Лингман', url: url }).catch(function (err) { console.warn('[LINKS] share cancelled', err && err.name); });
        return;
      }
      if (navigator.clipboard) {
        say('copied');
        navigator.clipboard.writeText(url).catch(function (err) { console.warn('[LINKS] clipboard failed', err && err.name); say('url'); });
      } else { console.warn('[LINKS] буфер обмена недоступен — показываем адрес'); say('url'); }
    });
  });
})();`,
};

/* ---------------- юридические документы ---------------- */
const LEGAL_HREF = { '/legal/privacy/': 'legal-privacy.html', '/legal/privacy-ios/': 'legal-privacy-ios.html', '/legal/terms/': 'legal-terms.html', '/legal/data-deletion/': 'legal-data-deletion.html', '/': 'index.html' };
const slug = (s, i) => 's' + (i + 1) + '-' + s.toLowerCase().replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();

// Абзац со строками «- …» через <br> — это список: вводная строка + пункты (текст пунктов дословный).
function renderPara(inner) {
  const parts = inner.split(/<br\s*\/?>/).map((x) => x.trim());
  if (!parts.some((x) => x.startsWith('- '))) return `<p>${inner}</p>`;
  let out = '', items = [];
  const flush = () => { if (items.length) { out += `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`; items = []; } };
  for (const x of parts) {
    if (x.startsWith('- ')) items.push(x.slice(2));
    else { flush(); out += `<p>${x}</p>`; }
  }
  flush();
  return out;
}

function readLegal(name) {
  const src = readFileSync(join(ROOT, 'knowly-www', 'legal', name, 'index.html'), 'utf8');
  const a = src.indexOf('<div class="legal-document">');
  const b = src.indexOf('</main>');
  if (a < 0 || b < 0) throw new Error(`[LEGAL] не найден текст документа ${name}`);
  let doc = src.slice(a + '<div class="legal-document">'.length, b)
    .replace(/<\/div>\s*(<\/div>\s*)*$/, '')
    .replace(/ style="[^"]*"/g, '')
    .replace(/href="(\/[^"]*)"/g, (m, h) => `href="${LEGAL_HREF[h] || 'https://knowlyapps.com' + h}"`);
  const h1 = stripTags(doc.match(/<h1>([\s\S]*?)<\/h1>/)[1]);
  const meta = doc.match(/<p class="meta">([\s\S]*?)<\/p>/)[1].replace(/\s+/g, ' ').trim();
  doc = doc.replace(/<h1>[\s\S]*?<\/h1>/, '').replace(/<p class="meta">[\s\S]*?<\/p>/, '');
  const toc = [];
  doc = doc.replace(/<h2>([\s\S]*?)<\/h2>/g, (m, t) => { const id = slug(stripTags(t), toc.length); toc.push([id, t.trim()]); return `<h2 id="${id}">${t.trim()}</h2>`; });
  doc = doc.replace(/<p>([\s\S]*?)<\/p>/g, (m, inner) => renderPara(inner.trim()));
  return { h1, meta, toc, html: doc.trim() };
}

const legalPage = (file, name, title) => {
  const d = readLegal(name);
  return {
    file, title, group: 'Документы', path: `/legal/${name}/`,
    body: `
${pageHead({ crumbs: `<a class="crumbs back" href="index.html">${ic('chev', 's16 flip')}На главную</a>`, h1: d.h1, lead: d.meta })}
<section class="legal"><div class="wrap doc-layout">
  <details class="glass toc" open data-toc><summary>Содержание</summary><nav aria-label="Содержание">${d.toc.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav></details>
  <article class="prose">${d.html}</article>
</div></section>`,
    css: `
.phead h1 { font-size: clamp(34px, 5vw, 60px); line-height: 1.05; max-width: 22ch; overflow-wrap: anywhere; }
.phead .lead { font-size: 15px; color: var(--sec); max-width: none; }
.phead .lead strong { color: var(--text); font-weight: 700; }
.crumbs.back { display: inline-flex; gap: 6px; font-weight: 600; justify-self: start; padding: 8px 14px 8px 10px; border-radius: 999px; background: var(--control); color: var(--text); transition: filter 160ms; }
.crumbs.back:hover { filter: brightness(1.12); color: var(--text); }
.flip { transform: rotate(180deg); }
.legal { padding-bottom: clamp(32px, 6vw, 72px); }
.toc { gap: 0; }
.toc summary { list-style: none; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); padding: 4px 10px 10px; }
.toc summary::-webkit-details-marker { display: none; }
.toc summary::after { content: ""; width: 8px; height: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translateY(-3px); transition: transform 240ms var(--ease); }
.toc[open] summary::after { transform: rotate(-135deg) translateY(-1px); }
.toc nav { display: grid; gap: 2px; }
.prose { overflow-wrap: anywhere; }
.prose h2 { scroll-margin-top: 110px; }
.prose strong { color: var(--text); }
@media (max-width: 980px) { .toc nav { max-height: 46vh; overflow: auto; } }`,
    // зачем: подсветка текущего раздела в оглавлении; на телефоне оглавление свёрнуто, чтобы текст был сразу
    js: `
(function () {
  var toc = document.querySelector('[data-toc]');
  if (!toc) { console.warn('[LEGAL] нет оглавления'); return; }
  if (matchMedia('(max-width: 980px)').matches) toc.open = false;
  var links = {}; toc.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var heads = Array.prototype.slice.call(document.querySelectorAll('.prose h2[id]'));
  function mark() {
    var cur = heads[0];
    heads.forEach(function (h) { if (h.getBoundingClientRect().top < 140) cur = h; });
    Object.keys(links).forEach(function (id) { links[id].classList.toggle('on', cur && cur.id === id); });
  }
  // зачем: таймер, а не кадр анимации — в фоновой вкладке кадры не идут, а подсветка должна обновиться
  var tm = 0;
  addEventListener('scroll', function () { if (tm) return; tm = setTimeout(function () { tm = 0; mark(); }, 80); }, { passive: true });
  mark();
})();`,
  };
};

export default [
  appPage,
  downloadPage,
  faqPage,
  contactPage,
  linksPage,
  legalPage('legal-privacy.html', 'privacy', 'Конфиденциальность'),
  legalPage('legal-privacy-ios.html', 'privacy-ios', 'Privacy Policy (iOS)'),
  legalPage('legal-terms.html', 'terms', 'Условия использования'),
  legalPage('legal-data-deletion.html', 'data-deletion', 'Удаление данных'),
];
