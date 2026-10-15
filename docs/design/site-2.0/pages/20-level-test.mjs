// зачем: макет страницы /english-level-test/ в стиле PhraseMan 2.0 (вариант C «Живые темы») со ВСЕМИ
// состояниями теста: стартовый экран, лендинг теста, загрузка/ошибка, вопрос с таймером 45 с, выход,
// «Сообщить об ошибке», результат, сертификат (5 тем, 6 языков), экран следующего шага.
// Тексты — дословно из инвентаризации (C:\Temp\claude\site_inventory.md, раздел 5) и словаря
// knowly-www/english-level-test/i18n.js, переведены на «ты». Поток кликабелен: Начать → загрузка → вопросы → результат.
import { ic, ASSET } from '../_shell.mjs';

const FLAGS = '../../../../knowly-www/english-level-test/assets/flags-svg';
const LOGO = `${ASSET.SITE}/phraseman-icon-128.png`;

// Языки теста: ключ, родное название, родительный падеж для русских фраз.
const LANGS = [
  ['en', 'English', 'английского языка'],
  ['de', 'Deutsch', 'немецкого языка'],
  ['fr', 'Français', 'французского языка'],
  ['it', 'Italiano', 'итальянского языка'],
  ['es', 'Español', 'испанского языка'],
];
// Язык интерфейса теста (меню в шапке приложения).
const UI_LOCALES = [['ru', 'Русский', 'RU'], ['en', 'English', 'EN'], ['de', 'Deutsch', 'DE'], ['es', 'Español', 'ES'], ['it', 'Italiano', 'IT'], ['fr', 'Français', 'FR']];
const LEVELS = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const THEMES = [['gold', 'Шампань'], ['dark', 'Аметист'], ['emerald', 'Платина'], ['rose', 'Коралл'], ['royal', 'Королевский']];

// Данные, которые уходят в скрипт страницы.
const DATA = {
  levels: LEVELS,
  desc: {
    'Pre-A1': 'Pre-A1 — ты узнаёшь отдельные слова и выражения в тексте.',
    A1: 'A1 — ты понимаешь простые знакомые фразы в письменном виде.',
    A2: 'A2 — ты интерпретируешь короткие повседневные тексты и грамматику.',
    B1: 'B1 — ты понимаешь основное содержание письменных текстов.',
    B2: 'B2 — ты уверенно интерпретируешь сложные тексты, регистр и письменные смыслы.',
    C1: 'C1 — ты точно интерпретируешь сложные письменные тексты и нюансы регистра.',
    C2: 'C2 — ты понимаешь сложные письменные тексты, импликации и тонкие различия.',
  },
  cta: {
    base: ['Начни с понятной базы', 'Тренируй живой английский с Phraseman по несколько минут в день.', 'Начать учить английский'],
    mid: ['Укрепляй английский', 'Тренируй живой английский и закрывай пробелы с Phraseman.', 'Продолжить английский'],
    top: ['Поддерживай английский', 'Тренируй живой английский каждый день с Phraseman.', 'Совершенствовать английский'],
  },
  gen: Object.fromEntries(LANGS.map(([k, , g]) => [k, g])),
  native: Object.fromEntries(LANGS.map(([k, n]) => [k, n])),
  // название языка теста внутри сертификата на языке сертификата
  certLang: {
    ru: { en: 'английского языка', de: 'немецкого языка', fr: 'французского языка', it: 'итальянского языка', es: 'испанского языка' },
    en: { en: 'English', de: 'German', fr: 'French', it: 'Italian', es: 'Spanish' },
    de: { en: 'Englisch', de: 'Deutsch', fr: 'Französisch', it: 'Italienisch', es: 'Spanisch' },
    es: { en: 'inglés', de: 'alemán', fr: 'francés', it: 'italiano', es: 'español' },
    it: { en: 'inglese', de: 'tedesco', fr: 'francese', it: 'italiano', es: 'spagnolo' },
    fr: { en: 'anglais', de: 'allemand', fr: 'français', it: 'italien', es: 'espagnol' },
  },
  cert: {
    ru: { bodyTitle: 'Сертификат', certifies: 'Настоящий сертификат выдан', completed: 'за прохождение проверки уровня {L} Phraseman', received: 'с предварительной оценкой по шкале CEFR', summary: '{c} верно из {a}', informal: 'Это неофициальная текстовая оценка, а не аккредитованная языковая квалификация.' },
    en: { bodyTitle: 'Certificate of Completion', certifies: 'This certifies that', completed: 'completed the Phraseman {L} Level Check', received: 'and received an estimated CEFR level of', summary: '{c} correct out of {a}', informal: 'This is an informal text-based assessment, not an accredited language qualification.' },
    de: { bodyTitle: 'Unverbindliche Ergebnisbescheinigung', certifies: 'Hiermit wird bestätigt, dass', completed: 'den Phraseman-Einstufungstest für {L} abgeschlossen hat', received: 'und dabei folgende rein textbasierte CEFR-Einschätzung erhalten hat:', summary: '{c} von {a} richtig', informal: 'Dies ist eine informelle textbasierte Einstufung und kein akkreditierter Sprachnachweis.' },
    es: { bodyTitle: 'Certificado de finalización', certifies: 'Se certifica que', completed: 'ha completado la prueba de nivel de {L} de Phraseman', received: 'y ha obtenido la siguiente estimación de nivel según el MCER:', summary: '{c} de {a} respuestas correctas', informal: 'Esta es una evaluación informal basada únicamente en ejercicios escritos, no una certificación lingüística acreditada.' },
    it: { bodyTitle: 'Certificato di completamento', certifies: 'Si certifica che', completed: 'ha completato il test Phraseman di livello di {L}', received: 'e ha ottenuto una stima del livello QCER pari a', summary: '{c} risposte corrette su {a}', informal: 'Questa è una valutazione informale basata su testi, non una certificazione linguistica accreditata.' },
    fr: { bodyTitle: 'Certificat de résultat', certifies: 'Ce certificat atteste que', completed: 'a terminé le test de niveau de {L} de Phraseman', received: 'et a obtenu l’estimation de niveau suivante selon le CECRL :', summary: 'Score : {c} / {a}', informal: 'Il s’agit d’une évaluation écrite informelle, et non d’une certification linguistique accréditée.' },
  },
  // реальные задания из knowly-www/english-level-test/data/questions.en.json
  qs: [
    { s: 'Описание города', i: 'Выбери грамматически правильный вариант.', t: 'London ______ a big city.', o: ['am', 'be', 'is', 'are'], c: 2 },
    { s: 'Продолжительность', i: 'Выбери форму, которая правильно завершает английское предложение.', t: 'They have been married ______ twenty years.', o: ['from', 'during', 'since', 'for'], c: 3 },
    { s: 'Грамматика', i: 'Выбери грамматически правильный вариант.', t: 'The letter ______ in English.', o: ['is written', 'writes', 'wrote', 'written'], c: 0 },
    { s: 'Грамматика', i: 'Выбери форму, которая правильно завершает английское предложение.', t: 'The bridge ______ in 1890.', o: ['builds', 'was built', 'built', 'is built'], c: 1 },
    { s: 'Грамматика', i: 'Выбери грамматически правильный вариант.', t: 'Looking back on last year, I wish I ______ more careful with my money.', o: ['had been', 'am', 'would be', 'have been'], c: 0 },
    { s: 'Грамматика', i: 'Выбери американскую форму сослагательного наклонения после настоятельного требования.', t: 'It is imperative that the data ______ by an independent auditor.', o: ['is verifying', 'be verified', 'was verified', 'to verify'], c: 1 },
  ],
  // макетные числа: на сайте их отдаёт сервер (public-stats.js и счётчик завершений)
  stats: { en: 12480, de: 1940, fr: 1310, it: 860, es: 1720 },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const flagImg = (k, cls = 'lt-flag') => `<img class="${cls}" src="${FLAGS}/${k}.svg" alt="" width="34" height="34" loading="lazy">`;
const stim = (t) => esc(t).replace('______', '<u></u>');

// ---------- общие куски ----------
const appBar = (sub) => `
<div class="lt-appbar">
  <a class="lt-brandmark" href="index.html" aria-label="Phraseman — на главную"><img src="${LOGO}" alt="" width="34" height="34"><span><b>Phraseman</b><small class="${sub === 'lang' ? 'js-tl-name' : ''}">${sub === 'lang' ? 'English' : esc(sub)}</small></span></a>
  <div class="lt-loc">
    <button type="button" class="lt-loc-btn" aria-label="Переключить язык интерфейса" aria-haspopup="listbox" aria-expanded="false">${flagImg('ru', 'lt-flag js-loc-flag')}<b class="js-loc-code">RU</b>${ic('chev', 's16 lt-chev')}</button>
    <ul class="lt-loc-pop" role="listbox" aria-label="Переключить язык интерфейса" hidden>
      ${UI_LOCALES.map(([k, n, c]) => `<li role="option" tabindex="0" data-loc="${k}" data-code="${c}" aria-selected="${k === 'ru'}">${flagImg(k)}<span>${n}</span>${ic('check', 's16 lt-tick')}</li>`).join('')}
    </ul>
  </div>
</div>`;

const testFooter = `
<nav class="lt-tfoot" aria-label="Ссылки теста"><a href="index.html">О приложении</a><a href="legal-privacy.html">Конфиденциальность</a><a href="mailto:support@knowlyapps.com">support@knowlyapps.com</a></nav>`;

const stores = `
<div class="lt-stores" aria-label="Ссылки на магазины приложений">
  <a class="store" href="download.html" aria-label="Скачать Phraseman в App Store">${ic('apple', 's18')}<span><small>Загрузи в</small><b>App Store</b></span></a>
  <a class="store alt" href="download.html" aria-label="Скачать Phraseman в Google Play">${ic('play', 's18')}<span><small>Скачай в</small><b>Google Play</b></span></a>
</div>`;

const mockLevels = `
<div class="lt-mock" role="group" aria-label="Макет: уровень результата"><b>Уровень</b>${LEVELS.map((l) => `<button type="button" data-lv="${l}" aria-pressed="${l === 'B1'}">${l}</button>`).join('')}</div>`;

// Сертификат, нарисованный CSS (цвета тем — из knowly-www/english-level-test/certificate.js).
const certArt = ({ sample = false, cls = '' } = {}) => `
<div class="lt-cert ${cls}" data-ct="gold" aria-label="${sample ? 'Пример сертификата' : 'Предпросмотр сертификата'}" role="img">
  <div class="lt-cert-in">
    <span class="c-title" data-k="bodyTitle">Сертификат</span>
    <span class="c-sm" data-k="certifies">Настоящий сертификат выдан</span>
    <b class="c-name${sample ? '' : ' js-nm'}">${sample ? 'Твоё имя' : 'Алекс'}</b>
    <span class="c-sm" data-k="completed">за прохождение проверки уровня <span class="js-tl-gen">английского языка</span> Phraseman</span>
    <span class="c-sm" data-k="received">с предварительной оценкой по шкале CEFR</span>
    <b class="c-lv${sample ? '' : ' js-lv'}">B1</b>
    <span class="c-score" data-k="summary">${sample ? '9 верно из 14' : '<span class="js-sc">9 верно из 14</span>'}</span>
    <span class="c-fine" data-k="informal">Это неофициальная текстовая оценка, а не аккредитованная языковая квалификация.</span>
    <span class="c-url">knowlyapps.com/english-level-test/</span>
  </div>
</div>`;

// ---------- 1. стартовый экран (статическая разметка страницы) ----------
const startView = ({ id, err = false, statsOff = false }) => `
<section class="lt-sec" data-state="${id}"><div class="wrap">
  <div class="lt-hero">
    <div class="lt-hero-copy">
      <span class="ov">Твоя точка отсчёта</span>
      <h1 data-en-html="Which language&lt;span class=&quot;l2&quot;&gt;shall we start with?&lt;/span&gt;">На каком языке<span class="l2">начнём?</span></h1>
      <p class="lt-lead">12–20 адаптивных заданий. Твой ориентир по CEFR.<br>И персональный сертификат с результатом.</p>
      <p class="lt-scope">${ic('doc', 's18')}<span>Текстовая диагностика грамматики, словаря и понимания текста. Не оценивает устную речь и аудирование.</span></p>
    </div>
    <div class="glass lt-start">
      <div class="lt-start-lang">
        <span class="lt-label" id="lbl-${id}">Язык теста</span>
        <div class="lt-langs" role="radiogroup" aria-labelledby="lbl-${id}">
          ${LANGS.map(([k, n], i) => `<button type="button" class="opt lt-lang" role="radio" data-tl="${k}" aria-checked="${i === 0}" aria-pressed="${i === 0}">${flagImg(k)}<span class="tt">${n}</span></button>`).join('')}
        </div>
      </div>
      <div class="lt-start-copy">
        <h2>Без спешки.<span class="l2">Без подсказок.</span></h2>
        <p>Выбирай ответ, который считаешь верным. Если не знаешь — пропускай.</p>
      </div>
      <button type="button" class="btn btn-primary lt-wide js-flow" data-go="loading">Начать тест ${ic('arrow', 's18 arr')}</button>
      <label class="check"><input type="checkbox"><span>Согласен на обработку ответов для расчёта результата.</span></label>
      <p class="lt-error" role="alert">${err ? `${ic('alert', 's18')}<span>Тест загружается. Попробуй ещё раз через секунду.</span>` : ''}</p>
    </div>
  </div>

  <div class="lt-statsblock">
    <div class="lt-stats-head"><span class="ov">Статистика теста</span><h2 class="lt-h2">Сколько сертификатов выдано</h2></div>
    <div class="lt-stats"${statsOff ? '' : ' aria-busy="true"'}>
      ${LANGS.map(([k, n]) => `<div class="glass lt-stat-tile">${flagImg(k, 'lt-flag lg')}<span class="nm">${n}</span><b class="${statsOff ? '' : 'js-stat'}" data-k="${k}">—</b></div>`).join('')}
    </div>
    ${statsOff ? `<p class="lt-status" role="status">${ic('alert', 's18')}<span>Статистика временно недоступна.</span></p>` : ''}
  </div>
</div></section>`;

// ---------- 2. лендинг теста (renderLanding) ----------
const landingView = `
<section class="lt-sec" data-state="landing"><div class="wrap"><div class="lt-stage">
  ${appBar('lang')}
  <div class="glass lt-land">
    <h1 class="lt-land-h">Определи уровень <span class="js-tl-gen">английского языка</span></h1>
    <div class="lt-pick">
      <span class="lt-label" id="lbl-land">Какой язык проверяем?</span>
      <div class="lt-flags" role="group" aria-label="Выбор проверяемого языка">
        ${LANGS.map(([k, n], i) => `<button type="button" class="lt-fbtn" data-tl="${k}" aria-pressed="${i === 0}"><span class="ring">${flagImg(k, 'lt-flag xl')}</span><span class="nm">${n}</span></button>`).join('')}
      </div>
    </div>
    <div class="lt-counter" role="status" aria-atomic="true"><b><span class="js-proof">0</span>+</b><span>Более <span class="js-proof-t">12 480</span> учеников уже проверили свой уровень.</span></div>
    <div class="lt-land-go">
      <button type="button" class="btn btn-primary lt-wide js-flow" data-go="loading">Начать тест ${ic('arrow', 's18 arr')}</button>
      <label class="check"><input type="checkbox"><span>Начиная тест, ты соглашаешься с обработкой ответов для расчёта результата.</span></label>
    </div>
  </div>
  <div class="lt-land-grid">
    <div class="glass lt-preview" aria-label="Пример сертификата">
      <div><h2 class="lt-h3">Вот что ты получишь</h2><p class="lt-sub">Именной сертификат с уровнем.</p></div>
      ${certArt({ sample: true, cls: 'tilted' })}
    </div>
    <ul class="glass lt-trust" aria-label="Почему стоит пройти тест">
      <li><span class="tile">${ic('gift')}</span><b>Бесплатно</b></li>
      <li><span class="tile">${ic('lock')}</span><b>Без регистрации</b></li>
      <li><span class="tile">${ic('clock')}</span><b>Результат сразу</b></li>
    </ul>
  </div>
  <div class="glass lt-final">
    <h2 class="lt-h2">Готов узнать свой уровень?</h2>
    <button type="button" class="btn btn-primary js-flow" data-go="loading">Начать тест ${ic('arrow', 's18 arr')}</button>
  </div>
  ${testFooter}
</div></div></section>`;

// ---------- 3. загрузка и ошибка загрузки ----------
const loadingView = `
<section class="lt-sec" data-state="loading"><div class="wrap"><div class="lt-stage narrow">
  ${appBar('lang')}
  <div class="glass state-card lt-load" role="status">
    <div class="lt-loader" aria-hidden="true"><span></span><span></span><span></span></div>
    <h1 class="lt-h2">Готовим вопросы</h1>
    <p>Это займёт несколько секунд.</p>
    <div class="lt-skel" aria-hidden="true"><i class="skel" style="height:8px"></i><i class="skel" style="height:22px;width:70%"></i><i class="skel" style="height:56px"></i><i class="skel" style="height:56px"></i></div>
  </div>
</div></div></section>`;

const loadErrView = `
<section class="lt-sec" data-state="load-err"><div class="wrap"><div class="lt-stage narrow">
  ${appBar('lang')}
  <div class="glass state-card" role="alert">
    <span class="big-ic lt-bad">${ic('alert')}</span>
    <h1 class="lt-h2">Не удалось загрузить тест</h1>
    <p>Проверь подключение и попробуй снова.</p>
    <button type="button" class="btn btn-primary js-flow" data-go="loading" title="Загрузить тест заново">Повторить</button>
  </div>
</div></div></section>`;

const noscriptView = `
<section class="lt-sec" data-state="noscript"><div class="wrap"><div class="lt-stage narrow">
  <div class="glass state-card">
    <span class="big-ic">${ic('alert')}</span>
    <p class="lt-ns">Для прохождения теста включи JavaScript. Ты сможешь определить уровень языка и получить персональный результат.</p>
  </div>
</div></div></section>`;

// ---------- 4. вопрос (renderQuestion) ----------
const Q0 = DATA.qs[2];
const questionCard = ({ live = false, n = 3, i = 2, start = 45 } = {}) => {
  const q = DATA.qs[i];
  const C = 2 * Math.PI * 19;
  const off = (C * (1 - start / 45)).toFixed(2);
  return `
<div class="lt-stage narrow lt-qwrap"${live ? ` data-quiz data-n="${n}" data-i="${i}" data-start="${start}"` : ' inert aria-hidden="true"'}>
  ${appBar('Живой английский')}
  <div class="glass qcard lt-q">
    <div class="qtrk lt-prog" role="progressbar" aria-label="Прогресс теста" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${n}" style="--w:${(n / 20) * 100}%"><b></b></div>
    <div class="qtop">
      <span class="lt-qn">Вопрос <b class="js-qn">${n}</b></span>
      <div class="lt-timer${start <= 10 ? ' low' : ''}" role="timer" aria-label="Осталось времени на вопрос">
        <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="t-bg" cx="22" cy="22" r="19"/><circle class="t-fg" cx="22" cy="22" r="19" style="stroke-dasharray:${C.toFixed(2)};stroke-dashoffset:${off}"/></svg>
        <span class="js-sec">${start}</span>
      </div>
    </div>
    <div class="lt-qbody">
      <div class="lt-qhead"><span class="lt-scn js-scn">${esc(q.s)}</span><p class="lt-ins js-ins">${esc(q.i)}</p></div>
      <p class="qtext lt-stim js-stim">${stim(q.t)}</p>
      <div class="answers lt-ans" role="radiogroup" aria-label="Варианты ответа">
        ${q.o.map((o, k) => `<button type="button" class="opt" role="radio" aria-checked="false" data-a="${k}"><span class="flag">${'ABCD'[k]}</span><span class="tx"><span class="tt">${esc(o)}</span></span></button>`).join('')}
      </div>
    </div>
    <div class="lt-qacts">
      <button type="button" class="btn btn-ghost js-skip">Не знаю</button>
      <button type="button" class="btn btn-ghost btn-sm lt-exit"${live ? ' data-go="exit"' : ''}>${ic('x', 's16')}Выйти</button>
      <button type="button" class="lt-link"${live ? ' data-go="report"' : ''}>${ic('alert', 's16')}Заметил ошибку?</button>
    </div>
  </div>
</div>`;
};

const overlay = (id, under, modal, extra = '') => `
<section class="lt-sec" data-state="${id}"><div class="wrap"><div class="lt-overlay">
  <div class="lt-under" inert aria-hidden="true">${under}</div>
  <div class="lt-dim">${modal}</div>
</div></div>${extra}</section>`;

const exitModal = `
<div class="modal lt-modal lt-small" role="dialog" aria-modal="true" aria-labelledby="exit-h">
  <span class="big-ic lt-mic">${ic('out')}</span>
  <h2 id="exit-h" class="lt-h3">Выйти из теста?</h2>
  <p class="lt-sub">Твой текущий прогресс не сохранится.</p>
  <div class="lt-mbtns"><button type="button" class="btn btn-primary js-resume" data-go="question">Продолжить тест</button><button type="button" class="btn btn-ghost" data-go="landing">Выйти</button></div>
</div>`;

const reportForm = `
<div class="modal lt-modal" role="dialog" aria-modal="true" aria-label="Форма сообщения об ошибке">
  <button type="button" class="lt-x js-resume" data-go="question" aria-label="Закрыть форму">${ic('x', 's18')}</button>
  <div><h2 class="lt-h3">Сообщить об ошибке</h2><p class="lt-sub">Коротко опиши, что не так — мы проверим задание.</p></div>
  <label class="field"><span>Что случилось?</span><textarea class="textarea js-rep" maxlength="500" rows="5" placeholder="Что случилось?"></textarea></label>
  <p class="hint js-rep-hint">Минимум 10 символов.</p>
  <div class="lt-mbtns"><button type="button" class="btn btn-ghost js-resume" data-go="question">Отмена</button><button type="button" class="btn btn-primary js-rep-send">Отправить</button></div>
</div>`;

const reportOk = `
<div class="modal lt-modal lt-small" role="dialog" aria-modal="true" aria-label="Форма сообщения об ошибке">
  <span class="big-ic lt-mic lt-good">${ic('check')}</span>
  <h2 class="lt-h3">Сообщение принято!</h2>
  <p class="lt-sub">Спасибо — мы проверим это задание.</p>
  <div class="lt-mbtns"><button type="button" class="btn btn-primary js-resume" data-go="question">Готово</button></div>
</div>`;

const reportFail = `
<div class="modal lt-modal lt-small" role="dialog" aria-modal="true" aria-label="Форма сообщения об ошибке">
  <button type="button" class="lt-x js-resume" data-go="question" aria-label="Закрыть форму">${ic('x', 's18')}</button>
  <span class="big-ic lt-mic lt-bad">${ic('alert')}</span>
  <h2 class="lt-h3">Не удалось отправить</h2>
  <p class="lt-sub">Проверь подключение и попробуй ещё раз.</p>
  <div class="lt-mbtns"><button type="button" class="btn btn-primary js-rep-retry">Попробовать снова</button></div>
</div>`;

// ---------- 5. результат (renderResult) ----------
const resultStage = ({ nameErr = false } = {}) => `
<div class="lt-stage wide">
  ${appBar('Живой английский')}
  ${mockLevels}
  <div class="lt-res">
    <div class="lt-res-main">
      <div class="glass lt-lvcard">
        <div class="lt-lvbadge" aria-label="Твой уровень"><span class="lt-lvbig js-lv">B1</span></div>
        <h2 class="lt-h2">Твой уровень: <span class="js-lv">B1</span></h2>
        <p class="lt-desc js-desc">${DATA.desc.B1}</p>
        <div class="lt-kpis">
          <div class="lt-kpi"><b><span class="js-cnt" data-v="correct">9</span><i>/<span class="js-cnt" data-v="answered">14</span></i></b><span>Правильные ответы</span></div>
          <div class="lt-kpi"><b><span class="js-cnt" data-v="answered">14</span><i>/<span class="js-cnt" data-v="total">16</span></i></b><span>Отвечено</span></div>
          <div class="lt-kpi"><b><span class="js-cnt" data-v="skipped">2</span></b><span>Не знаю</span></div>
        </div>
      </div>
      <div class="lt-res-acts">
        <button type="button" class="btn btn-ghost js-share">${ic('link', 's18')}Поделиться результатом</button>
        <button type="button" class="btn btn-ghost js-flow-restart" data-go="landing">Пройти ещё раз</button>
      </div>
      <p class="lt-scope">${ic('alert', 's18')}<span>Это ориентировочная текстовая оценка, а не официальный сертификат: аудирование, говорение и письмо не оцениваются.</span></p>
    </div>
    <div class="lt-res-side">
      <div class="glass lt-namecard">
        <label class="field"><span>Твоё имя</span><input class="input js-name-input${nameErr ? ' err' : ''}" maxlength="60" placeholder="Введи имя" value="${nameErr ? '' : 'Алекс'}" autocomplete="name"></label>
        <p class="hint err js-name-err" role="alert"${nameErr ? '' : ' hidden'}>Введи имя для сертификата.</p>
        <button type="button" class="btn btn-primary lt-wide js-make-cert">${ic('doc', 's18')}Создать сертификат</button>
      </div>
      <div class="glass lt-pitch">
        <div class="lt-pitch-h"><img src="${LOGO}" alt="" width="44" height="44"><span><b>Phraseman</b><small>Твой следующий шаг</small></span></div>
        <p class="js-cta-p">${DATA.cta.mid[1]}</p>
        <ul>
          <li>${ic('check', 's18')}10 000+ фраз живого английского</li>
          <li>${ic('check', 's18')}Короткие уроки по 5 минут в день</li>
          <li>${ic('check', 's18')}Тренировка произношения и повторения</li>
        </ul>
        ${stores}
      </div>
    </div>
  </div>
</div>`;
const resultView = ({ id, nameErr = false, toast = '' }) => `<section class="lt-sec" data-state="${id}"><div class="wrap">${resultStage({ nameErr })}</div>${toast}</section>`;

// ---------- 6. диалог сертификата (certificate.js) ----------
const certModal = ({ ios = false } = {}) => `
<div class="modal lt-modal lt-cmodal" role="dialog" aria-modal="true" aria-label="Диалог сертификата результата">
  <button type="button" class="lt-x" data-go="cta" aria-label="Закрыть сертификат">${ic('x', 's18')}</button>
  <div class="lt-cgrid">
    <div class="lt-cview">
      ${certArt({ cls: 'big' })}
      ${ios ? `<p class="lt-ios">${ic('download', 's18')}<span>Нажми и удерживай сертификат, затем выбери «Сохранить в Фото».</span></p>` : ''}
    </div>
    <div class="lt-cside">
      <div class="lt-cgroup"><span class="lt-label">Язык сертификата</span>
        <div class="chips" role="group" aria-label="Язык сертификата">${UI_LOCALES.map(([k, n]) => `<button type="button" class="chip" data-cl="${k}" aria-pressed="${k === 'ru'}">${n}</button>`).join('')}</div>
      </div>
      <div class="lt-cgroup"><span class="lt-label">Оформление сертификата</span>
        <div class="lt-themes" role="group" aria-label="Оформление сертификата">${THEMES.map(([k, n]) => `<button type="button" class="lt-theme" data-ct="${k}" aria-pressed="${k === 'gold'}"><i class="sw-${k}"></i><span>${n}</span></button>`).join('')}</div>
      </div>
      <div class="lt-cacts">
        ${ios ? '' : `<button type="button" class="btn btn-primary js-busy">${ic('download', 's18')}<span>Скачать PNG</span></button>
        <button type="button" class="btn btn-ghost js-busy">${ic('doc', 's18')}<span>Печать / PDF</span></button>`}
        <button type="button" class="btn btn-ghost" data-go="cta">Закрыть</button>
      </div>
      <div class="lt-ccta">
        <p>Тренируй живой английский каждый день с Phraseman.</p>
        <a class="btn btn-primary" href="download.html">Скачать Phraseman бесплатно</a>
      </div>
    </div>
  </div>
</div>`;

// ---------- 7. экран следующего шага (renderCTA) ----------
const ctaView = `
<section class="lt-sec" data-state="cta"><div class="wrap"><div class="lt-stage">
  ${appBar('Живой английский')}
  ${mockLevels}
  <div class="glass lt-cta">
    <span class="lt-lvpill" aria-label="Твой уровень"><span class="js-lv">B1</span></span>
    <h1 class="lt-cta-h js-cta-h">${DATA.cta.mid[0]}</h1>
    <p class="lt-lead js-cta-p">${DATA.cta.mid[1]}</p>
    <a class="btn btn-primary" href="download.html"><span class="js-cta-btn">${DATA.cta.mid[2]}</span>${ic('arrow', 's18 arr')}</a>
    ${stores}
    <div class="lt-cta-sec">
      <button type="button" class="btn btn-ghost btn-sm js-need-name" data-go="cert">${ic('download', 's16')}Скачать</button>
      <button type="button" class="btn btn-ghost btn-sm js-share">${ic('link', 's16')}Поделиться результатом</button>
      <button type="button" class="btn btn-ghost btn-sm" data-go="landing">Пройти ещё раз</button>
    </div>
  </div>
  <div class="glass lt-pair">
    <span class="tile">${ic('chat')}</span>
    <div><h2 class="lt-h3">Изучай английский с Phraseman</h2><p class="lt-sub">Тренируй живой английский в коротких уроках Phraseman.</p></div>
    <a class="btn btn-primary" href="download.html">Открыть Phraseman</a>
  </div>
  ${testFooter}
</div></div></section>`;

const toastEl = (txt, bad = false) => `<div class="toast lt-toast" role="status">${ic(bad ? 'alert' : 'check', `s18 ${bad ? 'lt-bad-t' : 'lt-good-t'}`)}${txt}</div>`;

const body = [
  startView({ id: 'start' }),
  startView({ id: 'stats-off', statsOff: true }),
  startView({ id: 'start-err', err: true }),
  noscriptView,
  landingView,
  loadingView,
  loadErrView,
  `<section class="lt-sec" data-state="question"><div class="wrap">${questionCard({ live: true, n: 3, i: 2, start: 45 })}</div></section>`,
  `<section class="lt-sec" data-state="q-low"><div class="wrap">${questionCard({ live: true, n: 7, i: 4, start: 9 })}</div></section>`,
  overlay('exit', questionCard(), exitModal),
  overlay('report', questionCard(), reportForm),
  overlay('report-ok', questionCard(), reportOk),
  overlay('report-fail', questionCard(), reportFail),
  resultView({ id: 'result' }),
  resultView({ id: 'name-err', nameErr: true }),
  resultView({ id: 'share', toast: toastEl('Ссылка скопирована.') }),
  resultView({ id: 'share-err', toast: toastEl('Не удалось скопировать ссылку.', true) }),
  overlay('cert', resultStage(), certModal()),
  overlay('cert-ios', resultStage(), certModal({ ios: true })),
  overlay('png-err', resultStage(), certModal(), toastEl('Не удалось создать PNG. Попробуй печать.', true)),
  ctaView,
].join('\n');

const css = `
/* ===== тест уровня ===== */
.lt-sec { padding-block: clamp(24px, 4vw, 56px) clamp(40px, 6vw, 88px); }
.lt-label { font-size: 13px; font-weight: 700; color: var(--sec); letter-spacing: .01em; }
.lt-h2 { font-size: clamp(28px, 3.6vw, 44px); line-height: 1.06; letter-spacing: -.035em; font-weight: 800; }
.lt-h3 { font-size: clamp(22px, 2.4vw, 28px); line-height: 1.15; letter-spacing: -.025em; font-weight: 800; }
.lt-sub { color: var(--sec); font-size: 16px; margin-top: 6px; }
.lt-wide { width: 100%; }
.lt-stage .btn, .lt-start .btn, .lt-modal .btn { white-space: normal; text-align: center; line-height: 1.2; }
.lt-flag { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; flex: none; display: block; background: var(--tile); }
.lt-flag.lg { width: 36px; height: 36px; }
.lt-flag.xl { width: 56px; height: 56px; }

/* стартовый экран */
.lt-hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: clamp(28px, 5vw, 72px); align-items: center; }
.lt-hero-copy { display: grid; gap: 22px; align-content: start; }
.lt-hero h1 { font-size: clamp(44px, 7vw, 88px); line-height: .98; letter-spacing: -.045em; }
.lt-hero h1 .l2, .lt-start h2 .l2 { display: block; color: var(--sec); }
.lt-lead { font-size: var(--t-l); color: var(--sec); line-height: 1.5; max-width: 40ch; }
.lt-scope { display: flex; gap: 10px; align-items: flex-start; color: var(--muted); font-size: 15px; line-height: 1.5; max-width: 52ch; }
.lt-scope svg { margin-top: 2px; color: var(--sec); }
.lt-start { padding: clamp(22px, 3.4vw, 34px); border-radius: 30px; display: grid; gap: 22px; --sx: 90%; --sy: 0%; }
.lt-start-lang { display: grid; gap: 12px; }
.lt-langs { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 8px; }
.lt-lang { padding: 12px 14px; gap: 10px; border-radius: 16px; }
.lt-lang .tt { font-size: 15px; }
.lt-start h2 { font-size: clamp(26px, 2.8vw, 34px); line-height: 1.08; letter-spacing: -.03em; }
.lt-start-copy p { color: var(--sec); margin-top: 10px; }
.lt-error { display: flex; gap: 10px; align-items: flex-start; color: #F2766B; font-size: 15px; font-weight: 600; min-height: 0; }
.lt-error:empty { display: none; }
:root[data-mode="light"] .lt-error { color: #C2382C; }
.lt-statsblock { margin-top: clamp(56px, 8vw, 104px); display: grid; gap: 24px; }
.lt-stats-head { display: grid; gap: 12px; }
.lt-stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.lt-stat-tile { padding: 20px; border-radius: 22px; display: grid; gap: 10px; justify-items: start; }
.lt-stat-tile .nm { font-weight: 600; color: var(--sec); font-size: 15px; }
.lt-stat-tile b { font-size: clamp(26px, 2.6vw, 34px); font-weight: 800; letter-spacing: -.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.lt-stats[aria-busy="true"] b { color: var(--muted); }
.lt-status { display: flex; gap: 10px; align-items: center; color: var(--sec); font-size: 15px; }

/* сцена приложения теста */
.lt-stage { max-width: 920px; margin-inline: auto; display: grid; gap: 16px; }
.lt-stage.narrow { max-width: 760px; }
.lt-stage.wide { max-width: 1120px; }
.lt-appbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 8px 8px 10px; border-radius: 999px; background: var(--card); border: 1px solid var(--edge); }
.lt-brandmark { display: flex; align-items: center; gap: 10px; min-width: 0; }
.lt-brandmark img { width: 34px; height: 34px; border-radius: 10px; flex: none; }
.lt-brandmark b { display: block; font-size: 16px; font-weight: 800; letter-spacing: -.01em; line-height: 1.15; }
.lt-brandmark small { display: block; font-size: 13px; color: var(--sec); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lt-loc { position: relative; flex: none; }
.lt-loc-btn { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px 0 8px; border: 0; border-radius: 999px; background: var(--control); color: var(--text); font: 700 14px/1 var(--font); cursor: pointer; transition: transform 240ms var(--spring); }
.lt-loc-btn:active { transform: scale(.95); }
.lt-loc-btn .lt-chev { transform: rotate(90deg); color: var(--sec); transition: transform 240ms var(--ease); }
.lt-loc-btn[aria-expanded="true"] .lt-chev { transform: rotate(-90deg); }
.lt-loc-pop { position: absolute; right: 0; top: calc(100% + 8px); z-index: 12; list-style: none; margin: 0; padding: 6px; width: 210px; border-radius: 20px; background: var(--sheet); border: 1px solid var(--edge); box-shadow: var(--shadow); display: grid; gap: 2px;
  transform-origin: top right; animation: ltPop 260ms var(--ease); }
.lt-loc-pop[hidden] { display: none; }
.lt-loc-pop li { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; font-weight: 600; font-size: 15px; cursor: pointer; }
.lt-loc-pop li span { flex: 1; }
.lt-loc-pop li:hover, .lt-loc-pop li:focus-visible { background: var(--control); }
.lt-loc-pop .lt-tick { opacity: 0; color: var(--fill); }
.lt-loc-pop li[aria-selected="true"] .lt-tick { opacity: 1; }
.lt-tfoot { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 22px; padding: 18px 0 4px; font-size: 14px; color: var(--sec); }
.lt-tfoot a:hover { color: var(--text); }
.lt-tfoot a { overflow-wrap: anywhere; }

/* лендинг теста */
.lt-land { padding: clamp(28px, 5vw, 56px) clamp(20px, 4vw, 48px); border-radius: 32px; display: grid; justify-items: center; text-align: center; gap: 30px; --sx: 50%; --sy: 0%; }
.lt-land-h { font-size: clamp(36px, 5.6vw, 64px); line-height: 1.02; letter-spacing: -.04em; max-width: 14ch; }
.lt-land-h .js-tl-gen { color: var(--sec); }
.lt-pick { display: grid; gap: 16px; justify-items: center; }
.lt-flags { display: flex; flex-wrap: wrap; justify-content: center; gap: 14px 18px; }
.lt-fbtn { border: 0; background: none; padding: 0; color: var(--sec); font: 600 13px/1.2 var(--font); cursor: pointer; display: grid; justify-items: center; gap: 8px; }
.lt-fbtn .ring { border-radius: 50%; transition: transform 300ms var(--spring), box-shadow 240ms var(--ease); opacity: .62; }
.lt-fbtn:hover .ring { opacity: .9; }
.lt-fbtn:active .ring { transform: scale(.92); }
.lt-fbtn[aria-pressed="true"] { color: var(--text); }
.lt-fbtn[aria-pressed="true"] .ring { opacity: 1; box-shadow: 0 0 0 3px var(--card-solid), 0 0 0 5px var(--fill); transform: scale(1.04); }
.lt-counter { display: grid; gap: 4px; justify-items: center; }
.lt-counter b { font-size: clamp(40px, 5vw, 56px); font-weight: 800; letter-spacing: -.04em; line-height: 1; font-variant-numeric: tabular-nums;
  background: linear-gradient(120deg, var(--g1), var(--g2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lt-counter span { color: var(--sec); font-size: 15px; }
.lt-land-go { display: grid; gap: 16px; justify-items: center; width: min(420px, 100%); }
.lt-land-go .check { text-align: left; }
.lt-land-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; }
.lt-preview { padding: 28px; border-radius: 28px; display: grid; gap: 22px; --sx: 0%; --sy: 100%; }
.lt-trust { list-style: none; margin: 0; padding: 10px; border-radius: 28px; display: grid; align-content: center; }
.lt-trust li { display: flex; align-items: center; gap: 16px; padding: 16px 14px; font-size: 18px; }
.lt-trust li + li { border-top: 1px solid var(--track); }
.lt-final { padding: clamp(32px, 5vw, 56px) 24px; border-radius: 32px; display: grid; justify-items: center; text-align: center; gap: 22px; --sx: 50%; --sy: 100%; }

/* сертификат (цвета тем из certificate.js) */
.lt-cert { container-type: inline-size; aspect-ratio: 1100 / 780; width: 100%; border-radius: 14px; position: relative; overflow: hidden;
  background: var(--c-bg); color: var(--c-text); box-shadow: 0 24px 60px rgba(0,0,0,.35); transition: background-color 450ms var(--ease), color 450ms var(--ease); }
.lt-cert::before { content: ""; position: absolute; inset: 2.6cqw; border-radius: 1cqw; pointer-events: none;
  box-shadow: inset 0 0 0 .22cqw var(--c-b1), inset 0 0 0 .9cqw var(--c-bg), inset 0 0 0 1.05cqw var(--c-b2); transition: box-shadow 450ms var(--ease); }
.lt-cert::after { content: ""; position: absolute; right: 7cqw; top: 6.5cqw; width: 9cqw; height: 9cqw; border-radius: 50%; background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--c-acc) 60%, #fff), var(--c-acc)); opacity: .9; transition: background 450ms var(--ease); }
.lt-cert-in { position: absolute; inset: 0; padding: 7cqw 9cqw; display: grid; align-content: center; justify-items: center; text-align: center; gap: .9cqw; }
.lt-cert .c-title { font-size: 4.4cqw; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: var(--c-title); line-height: 1.1; }
.lt-cert .c-sm { font-size: 1.9cqw; line-height: 1.35; max-width: 70cqw; }
.lt-cert .c-name { font-size: 6.2cqw; font-weight: 800; letter-spacing: -.02em; color: var(--c-title); line-height: 1.1; padding: .6cqw 4cqw 1cqw; border-bottom: .2cqw solid var(--c-acc); max-width: 76cqw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lt-cert .c-name.ph { opacity: .45; }
.lt-cert .c-lv { font-size: 11cqw; font-weight: 800; letter-spacing: -.04em; line-height: .95; color: var(--c-lv); margin-top: .6cqw; }
.lt-cert .c-score { font-size: 2cqw; font-weight: 700; color: var(--c-acc); }
.lt-cert .c-fine { font-size: 1.45cqw; opacity: .8; max-width: 64cqw; line-height: 1.35; }
.lt-cert .c-url { font-size: 1.45cqw; opacity: .7; letter-spacing: .04em; }
.lt-cert[data-ct="gold"] { --c-bg: #faf8f3; --c-b1: #b8941d; --c-b2: #e8d5a3; --c-title: #1a1a1a; --c-text: #333333; --c-acc: #c9a96e; --c-lv: #1a1a1a; }
.lt-cert[data-ct="dark"] { --c-bg: #21182c; --c-b1: #a183b4; --c-b2: #42304f; --c-title: #ffffff; --c-text: #cbd5e1; --c-acc: #efb2a1; --c-lv: #f5c8bb; }
.lt-cert[data-ct="emerald"] { --c-bg: #eee8f0; --c-b1: #96769c; --c-b2: #d2c0d8; --c-title: #33253e; --c-text: #51415a; --c-acc: #96769c; --c-lv: #33253e; }
.lt-cert[data-ct="rose"] { --c-bg: #f8e6df; --c-b1: #b17a83; --c-b2: #e5bcc0; --c-title: #513041; --c-text: #684556; --c-acc: #bd8792; --c-lv: #513041; }
.lt-cert[data-ct="royal"] { --c-bg: #1e1b4b; --c-b1: #818cf8; --c-b2: #312e81; --c-title: #ffffff; --c-text: #c7d2fe; --c-acc: #818cf8; --c-lv: #e0e7ff; }
.lt-cert.tilted { transform: rotate(-1.6deg); transition: transform 500ms var(--ease); }
.lt-preview:hover .lt-cert.tilted { transform: rotate(0) translateY(-3px); }
.lt-cert.mini { box-shadow: 0 14px 34px rgba(0,0,0,.28); }

/* вопрос */
.lt-q { gap: 24px; }
.lt-prog b { transition: width 600ms var(--spring); }
.lt-qn { font-size: 15px; font-weight: 600; color: var(--sec); }
.lt-qn b { color: var(--text); font-weight: 800; }
.lt-timer { position: relative; width: 52px; height: 52px; display: grid; place-items: center; flex: none; color: var(--text); }
.lt-timer svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.lt-timer circle { fill: none; stroke-width: 3.5; }
.lt-timer .t-bg { stroke: var(--track); }
.lt-timer .t-fg { stroke: var(--fill); stroke-linecap: round; transition: stroke-dashoffset 220ms linear, stroke 300ms var(--ease); }
.lt-timer span { position: relative; font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; transition: color 300ms var(--ease); }
.lt-timer.low .t-fg { stroke: #F2766B; }
.lt-timer.low span { color: #F2766B; }
:root[data-mode="light"] .lt-timer.low span { color: #C2382C; }
.lt-timer.low { animation: ltBeat 1s var(--ease) infinite; }
@keyframes ltBeat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.lt-qbody { display: grid; gap: 22px; transition: opacity 260ms var(--ease), transform 360ms var(--ease); }
.lt-qbody.out { opacity: 0; transform: translateX(-14px); }
.lt-qbody.in { opacity: 0; transform: translateX(14px); transition: none; }
.lt-qhead { display: grid; gap: 6px; }
.lt-scn { font-size: 13px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--fill); }
.lt-ins { color: var(--sec); font-size: 16px; }
.lt-stim { font-size: clamp(24px, 3vw, 34px); }
.lt-ans .opt { min-height: 64px; }
.lt-ans .opt .tt { font-size: 17px; }
.lt-ans .opt[aria-checked="true"] { background: color-mix(in srgb, var(--fill) 16%, var(--card-solid)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fill) 75%, transparent); }
.lt-ans .opt[aria-checked="true"] .flag { background: var(--cta); color: var(--cta-ink); }
.lt-ans .opt .flag { transition: background-color 160ms, color 160ms; }
.lt-qacts { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding-top: 4px; }
.lt-qacts .js-skip { min-width: 150px; }
.lt-exit { gap: 6px; }
.lt-link { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; padding: 8px 4px; color: var(--sec); font: 600 14px/1.2 var(--font); cursor: pointer; text-decoration: underline; text-decoration-color: var(--track); text-underline-offset: 4px; }
.lt-link:hover { color: var(--text); }

/* окна поверх экрана */
.lt-overlay { display: grid; }
.lt-overlay > * { grid-area: 1 / 1; }
.js-need-name[hidden] { display: none; }
.lt-under { pointer-events: none; user-select: none; }
.lt-dim { position: relative; z-index: 5; margin: -10px; padding: clamp(16px, 4vw, 48px) 12px; border-radius: 36px; background: rgba(0,0,0,.5); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: grid; justify-items: center; align-items: start; animation: ltFade 320ms var(--ease); }
.lt-modal { position: relative; animation: ltPop 380ms var(--ease); padding: clamp(22px, 3.4vw, 32px); }
.lt-modal.lt-small { width: min(440px, 100%); justify-items: center; text-align: center; margin-top: clamp(24px, 8vw, 96px); }
.lt-modal:not(.lt-small):not(.lt-cmodal) { margin-top: clamp(12px, 5vw, 64px); }
.lt-mic { width: 64px; height: 64px; border-radius: 20px; background: var(--tile); display: grid; place-items: center; }
.lt-mic svg { width: 28px; height: 28px; }
.lt-good svg { color: #6FD08C; }
.lt-bad svg { color: #F2766B; }
.lt-mbtns { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; width: 100%; }
.lt-small .lt-mbtns { justify-content: center; }
.lt-small .lt-mbtns .btn { flex: 1 1 160px; }
.lt-x { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--control); color: var(--text); display: grid; place-items: center; cursor: pointer; z-index: 2; transition: transform 240ms var(--spring); }
.lt-x:active { transform: scale(.9); }
.lt-modal h2 { padding-right: 44px; }
.lt-small h2 { padding-right: 0; }
.lt-sending { display: inline-flex; align-items: center; gap: 10px; }
.lt-sending .spinner { width: 18px; height: 18px; border-color: color-mix(in srgb, var(--cta-ink) 30%, transparent); border-top-color: var(--cta-ink); }
@keyframes ltPop { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes ltFade { from { opacity: 0; } to { opacity: 1; } }

/* загрузка */
.lt-load { gap: 16px; }
.lt-loader { display: flex; gap: 8px; margin-bottom: 6px; }
.lt-loader span { width: 12px; height: 12px; border-radius: 50%; background: var(--fill); animation: ltDot 1s var(--ease) infinite; }
.lt-loader span:nth-child(2) { animation-delay: .15s; } .lt-loader span:nth-child(3) { animation-delay: .3s; }
@keyframes ltDot { 0%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-6px); } }
.lt-skel { display: grid; gap: 10px; width: min(460px, 100%); margin-top: 12px; }
.lt-skel i { display: block; width: 100%; }
.lt-ns { font-size: var(--t-l); color: var(--text) !important; max-width: 40ch; }

/* результат */
.lt-mock { justify-self: center; display: flex; gap: 2px; padding: 4px; border-radius: 999px; border: 1px dashed color-mix(in srgb, var(--fill) 40%, transparent); background: var(--card); max-width: 100%; overflow-x: auto; scrollbar-width: none; }
.lt-mock::-webkit-scrollbar { display: none; }
.lt-mock b { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); padding: 0 8px 0 10px; align-self: center; white-space: nowrap; }
.lt-mock button { border: 0; background: transparent; color: var(--sec); font: 700 13px/1 var(--font); padding: 8px 11px; border-radius: 999px; cursor: pointer; white-space: nowrap; transition: background-color 200ms, color 200ms; }
.lt-mock button[aria-pressed="true"] { background: var(--control); color: var(--text); }
.lt-res { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); gap: 16px; align-items: start; }
.lt-res-main, .lt-res-side { display: grid; gap: 16px; }
.lt-lvcard { padding: clamp(26px, 4vw, 44px); border-radius: 32px; display: grid; gap: 14px; --sx: 0%; --sy: 0%; }
.lt-lvbig { display: block; font-size: clamp(96px, 15vw, 176px); font-weight: 800; letter-spacing: -.06em; line-height: .86; padding-bottom: .06em;
  background: linear-gradient(125deg, var(--g1), var(--g2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lt-lvbig.long { font-size: clamp(72px, 11vw, 132px); }
:root[data-mode="light"] .lt-lvbig { background: linear-gradient(125deg, color-mix(in srgb, var(--g1) 70%, #000), color-mix(in srgb, var(--g2) 75%, #000)); -webkit-background-clip: text; background-clip: text; }
.lt-desc { color: var(--sec); font-size: var(--t-l); line-height: 1.5; max-width: 46ch; }
.lt-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.lt-kpi { padding: 16px; border-radius: 20px; background: var(--control); display: grid; gap: 6px; align-content: start; }
.lt-kpi b { font-size: clamp(26px, 3vw, 34px); font-weight: 800; letter-spacing: -.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.lt-kpi b i { font-style: normal; color: var(--muted); font-size: .62em; letter-spacing: 0; }
.lt-kpi span { font-size: 14px; color: var(--sec); line-height: 1.3; }
.lt-res-acts { display: flex; flex-wrap: wrap; gap: 10px; }
.lt-namecard { padding: 24px; border-radius: 28px; display: grid; gap: 14px; }
.lt-namecard .lt-cert { margin-top: 6px; }
.lt-pitch { padding: 24px; border-radius: 28px; display: grid; gap: 16px; --sx: 100%; --sy: 100%; }
.lt-pitch-h { display: flex; align-items: center; gap: 12px; }
.lt-pitch-h img { width: 44px; height: 44px; border-radius: 12px; }
.lt-pitch-h b { display: block; font-size: 17px; font-weight: 800; }
.lt-pitch-h small { display: block; font-size: 13px; color: var(--sec); }
.lt-pitch p { color: var(--sec); }
.lt-pitch ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.lt-pitch li { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; font-weight: 600; }
.lt-pitch li svg { color: var(--fill); margin-top: 2px; }
.lt-stores { display: flex; flex-wrap: wrap; gap: 8px; }
.lt-stores .store { flex: 1 1 150px; transition: transform 240ms var(--spring), filter 160ms; }
.lt-stores .store:active { transform: scale(.97); }
.lt-stores .store:hover { filter: brightness(1.06); }
.lt-toast { animation: ltToast 420ms var(--ease); max-width: calc(100vw - 32px); }
.lt-good-t { color: #6FD08C; } .lt-bad-t { color: #F2766B; }
@keyframes ltToast { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* диалог сертификата */
.lt-cmodal { width: min(1080px, 100%); }
.lt-cgrid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: clamp(18px, 3vw, 32px); align-items: start; }
.lt-cview { display: grid; gap: 14px; }
.lt-ios { display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px; border-radius: 16px; background: var(--control); font-size: 15px; font-weight: 600; }
.lt-cside { display: grid; gap: 22px; padding-top: 44px; }
.lt-cgroup { display: grid; gap: 10px; }
.lt-cgroup .chip { padding: 9px 13px; font-size: 13px; }
.lt-themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 8px; }
.lt-theme { display: flex; align-items: center; gap: 10px; padding: 8px 12px 8px 8px; border: 0; border-radius: 14px; background: var(--control); color: var(--sec); font: 600 14px/1.2 var(--font); cursor: pointer; text-align: left; transition: transform 240ms var(--spring), background-color 200ms, color 200ms; }
.lt-theme:active { transform: scale(.96); }
.lt-theme[aria-pressed="true"] { color: var(--text); background: color-mix(in srgb, var(--fill) 14%, var(--card-solid)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--fill) 70%, transparent); }
.lt-theme i { width: 26px; height: 26px; border-radius: 8px; flex: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
.sw-gold { background: linear-gradient(135deg, #faf8f3 45%, #c9a96e 46%); }
.sw-dark { background: linear-gradient(135deg, #21182c 45%, #efb2a1 46%); }
.sw-emerald { background: linear-gradient(135deg, #eee8f0 45%, #96769c 46%); }
.sw-rose { background: linear-gradient(135deg, #f8e6df 45%, #bd8792 46%); }
.sw-royal { background: linear-gradient(135deg, #1e1b4b 45%, #818cf8 46%); }
.lt-cacts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.lt-cacts .btn:first-child { grid-column: 1 / -1; }
.lt-cacts .btn:only-child { grid-column: 1 / -1; }
.lt-ccta { padding: 18px; border-radius: 20px; background: var(--control); display: grid; gap: 12px; }
.lt-ccta p { font-weight: 600; }

/* экран следующего шага */
.lt-cta { padding: clamp(32px, 6vw, 72px) clamp(20px, 4vw, 48px); border-radius: 32px; display: grid; justify-items: center; text-align: center; gap: 22px; --sx: 50%; --sy: 0%; }
.lt-lvpill { display: inline-grid; place-items: center; min-width: 112px; height: 112px; padding: 0 22px; border-radius: 34px; font-size: 48px; font-weight: 800; letter-spacing: -.04em;
  background: linear-gradient(135deg, var(--g1), var(--g2)); color: #fff; text-shadow: 0 2px 14px rgba(0,0,0,.28); box-shadow: 0 18px 50px color-mix(in srgb, var(--g2) 35%, transparent); }
.lt-cta-h { font-size: clamp(36px, 5.4vw, 64px); line-height: 1.02; letter-spacing: -.04em; max-width: 16ch; }
.lt-cta .lt-stores { width: min(380px, 100%); }
.lt-cta-sec { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.lt-pair { padding: 24px; border-radius: 28px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 18px; align-items: center; }

@media (max-width: 980px) {
  .lt-hero, .lt-res, .lt-land-grid, .lt-cgrid { grid-template-columns: minmax(0, 1fr); }
  .lt-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lt-cside { padding-top: 0; }
  .lt-cmodal .lt-cview { padding-top: 40px; }
}
@media (max-width: 640px) {
  .lt-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lt-kpis { grid-template-columns: minmax(0, 1fr); }
  .lt-kpi { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 14px; }
  .lt-pair { grid-template-columns: minmax(0, 1fr); justify-items: start; }
  .lt-link { margin-left: 0; }
  .lt-qacts .btn { flex: 1 1 auto; }
  .lt-modal { border-radius: 24px; }
  .lt-mbtns .btn { flex: 1 1 100%; }
  .lt-cacts { grid-template-columns: minmax(0, 1fr); }
  .lt-dim { margin: -6px; border-radius: 28px; padding-inline: 6px; }
  .lt-appbar .lt-brandmark small { max-width: 34vw; }
}
@media (prefers-reduced-motion: reduce) {
  .lt-timer.low, .lt-loader span { animation: none; }
  .lt-timer .t-fg, .lt-prog b, .lt-qbody, .lt-cert, .lt-cert::before { transition: none; }
  .lt-modal, .lt-dim, .lt-toast, .lt-loc-pop { animation: none; }
}
`;

// Скрипт страницы пишется обычной функцией (без экранирования шаблонных строк) и вставляется через toString.
function pageScript(D) {
  var TAG = '[LEVEL-TEST]';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var show = function (name) { if (window.__pmShow) { window.__pmShow(name); try { history.replaceState(null, '', '#' + name); } catch (e) { console.warn(TAG, 'якорь не записан', e && e.message); } } else console.warn(TAG, 'нет __pmShow — состояние не переключено:', name); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var G = { lv: 'B1', tl: 'en', nm: 'Алекс', ct: 'gold', cl: 'ru', S: { correct: 0, answered: 0, skipped: 0 } };
  var flags = { fresh: false, resume: false, flow: false };
  var cur = null;

  function nf(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
  function stats() { var S = G.S; return (S.answered + S.skipped) > 0 ? { correct: S.correct, answered: S.answered, skipped: S.skipped, total: S.answered + S.skipped } : { correct: 9, answered: 14, skipped: 2, total: 16 }; }
  function ctaGroup(lv) { return (lv === 'B1' || lv === 'B2') ? 'mid' : (lv === 'C1' || lv === 'C2') ? 'top' : 'base'; }

  // ---------- уровень, язык теста, имя, оформление сертификата ----------
  function applyLevel() {
    var g = D.cta[ctaGroup(G.lv)];
    $$('.js-lv').forEach(function (el) { el.textContent = G.lv; if (el.classList.contains('lt-lvbig')) el.classList.toggle('long', G.lv.length > 2); });
    $$('.js-desc').forEach(function (el) { el.textContent = D.desc[G.lv]; });
    $$('.js-cta-h').forEach(function (el) { el.textContent = g[0]; });
    $$('.js-cta-p').forEach(function (el) { el.textContent = g[1]; });
    $$('.js-cta-btn').forEach(function (el) { el.textContent = g[2]; });
    $$('[data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lv') === G.lv)); });
  }
  function applyLang() {
    $$('.js-tl-gen').forEach(function (el) { el.textContent = D.gen[G.tl]; });
    $$('.js-tl-name').forEach(function (el) { el.textContent = D.native[G.tl]; });
    $$('[data-tl]').forEach(function (b) { var on = b.getAttribute('data-tl') === G.tl; b.setAttribute('aria-pressed', String(on)); if (b.getAttribute('role') === 'radio') b.setAttribute('aria-checked', String(on)); });
    $$('.js-proof-t').forEach(function (el) { el.textContent = nf(D.stats[G.tl]); });
    applyCertText();
  }
  function applyName() {
    $$('.js-nm').forEach(function (el) { el.textContent = G.nm || 'Твоё имя'; el.classList.toggle('ph', !G.nm); });
    $$('.js-need-name').forEach(function (el) { el.hidden = !G.nm; });
  }
  function applyTheme() {
    $$('.lt-cert').forEach(function (c) { if (!c.closest('.lt-preview')) c.setAttribute('data-ct', G.ct); });
    $$('.lt-theme').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ct') === G.ct)); });
  }
  function applyCertText() {
    var t = D.cert[G.cl], s = stats();
    $$('.lt-cert').forEach(function (c) {
      var sample = !!c.closest('.lt-preview');
      var lang = sample ? 'ru' : G.cl, tt = D.cert[lang];
      c.querySelectorAll('[data-k]').forEach(function (el) {
        var k = el.getAttribute('data-k'), v = tt[k];
        if (k === 'completed') { el.textContent = v.replace('{L}', D.certLang[lang][G.tl]); }
        else if (k === 'summary') { el.textContent = sample ? v.replace('{c}', 9).replace('{a}', 14) : v.replace('{c}', s.correct).replace('{a}', s.answered); }
        else el.textContent = v;
      });
    });
    $$('[data-cl]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cl') === G.cl)); });
    if (!t) console.warn(TAG, 'нет текстов сертификата для языка', G.cl);
  }
  function applyStats() {
    var s = stats();
    $$('.js-cnt').forEach(function (el) { el.textContent = s[el.getAttribute('data-v')]; });
  }
  function countUp(root) {
    var s = stats();
    root.querySelectorAll('.js-cnt').forEach(function (el) {
      var to = s[el.getAttribute('data-v')];
      if (reduce) { el.textContent = to; return; }
      var t0 = performance.now(), dur = 700;
      (function step(now) { var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); })(t0);
      // зачем: в фоновой вкладке кадры не идут — итоговое число всё равно должно появиться
      setTimeout(function () { el.textContent = to; }, dur + 80);
    });
  }
  function countTo(el, to, dur) {
    if (reduce) { el.textContent = nf(to); return; }
    var t0 = performance.now();
    (function step(now) { var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = nf(Math.round(to * e)); if (p < 1) requestAnimationFrame(step); })(t0);
    setTimeout(function () { el.textContent = nf(to); }, dur + 80);
  }

  // ---------- клики ----------
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest('[data-lv]'))) { G.lv = b.getAttribute('data-lv'); applyLevel(); return; }
    if ((b = t.closest('[data-tl]'))) { G.tl = b.getAttribute('data-tl'); applyLang(); var p = b.closest('[data-state]'); if (p && p.getAttribute('data-state') === 'landing') { var pr = p.querySelector('.js-proof'); if (pr) countTo(pr, D.stats[G.tl], 600); } return; }
    if ((b = t.closest('.lt-theme'))) { G.ct = b.getAttribute('data-ct'); applyTheme(); return; }
    if ((b = t.closest('[data-cl]'))) { G.cl = b.getAttribute('data-cl'); applyCertText(); return; }
    if ((b = t.closest('.js-share'))) { toast('Ссылка скопирована.', false); return; }
    if ((b = t.closest('.js-make-cert'))) { makeCert(b); return; }
    if ((b = t.closest('.js-busy'))) { busyFeedback(b); return; }
    if ((b = t.closest('.js-rep-send'))) { sendReport(b); return; }
    if ((b = t.closest('.js-rep-retry'))) { retryReport(b); return; }
    if ((b = t.closest('.lt-loc-btn'))) { toggleLoc(b); e.stopPropagation(); return; }
    if ((b = t.closest('.lt-loc-pop li'))) { pickLoc(b); return; }
    closeLocs();
  });
  // зачем: флаги надо выставить ДО того, как оболочка переключит состояние (её обработчик висит на самой кнопке)
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('.js-resume')) flags.resume = true;
    if (t.closest('.js-flow')) flags.flow = true;
    if (t.closest('.js-flow-restart')) { G.S = { correct: 0, answered: 0, skipped: 0 }; }
  }, true);

  function toast(txt, bad) {
    var el = document.createElement('div');
    el.className = 'toast lt-toast'; el.setAttribute('role', 'status');
    el.innerHTML = '<svg class="i s18 ' + (bad ? 'lt-bad-t' : 'lt-good-t') + '" aria-hidden="true"><use href="#i-' + (bad ? 'alert' : 'check') + '"/></svg>';
    el.appendChild(document.createTextNode(txt));
    document.body.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity 300ms'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, 2200);
  }
  function busyFeedback(b) {
    if (b.disabled) return;
    var html = b.innerHTML; b.disabled = true;
    b.innerHTML = '<span class="lt-sending"><span class="spinner"></span></span>';
    setTimeout(function () { b.innerHTML = '<svg class="i s18" aria-hidden="true"><use href="#i-check"/></svg>'; }, 700);
    setTimeout(function () { b.innerHTML = html; b.disabled = false; }, 1500);
  }
  function makeCert(b) {
    var root = b.closest('.lt-namecard'), inp = root.querySelector('.js-name-input'), er = root.querySelector('.js-name-err');
    var v = (inp.value || '').trim();
    if (!v) { console.info(TAG, 'пустое имя — показываем подсказку'); inp.classList.add('err'); er.hidden = false; inp.focus(); return; }
    G.nm = v; applyName(); show('cert');
  }
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.classList && t.classList.contains('js-name-input')) {
      G.nm = t.value.trim(); applyName();
      if (G.nm) { t.classList.remove('err'); var er = t.closest('.lt-namecard').querySelector('.js-name-err'); if (er) er.hidden = true; }
    }
    if (t.classList && t.classList.contains('js-rep')) {
      var h = t.closest('.lt-modal').querySelector('.js-rep-hint');
      if (t.value.trim().length >= 10 && h.classList.contains('err')) { h.classList.remove('err'); h.textContent = 'Минимум 10 символов.'; }
    }
  });
  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && t.classList && t.classList.contains('js-name-input')) { e.preventDefault(); makeCert(t.closest('.lt-namecard').querySelector('.js-make-cert')); }
    if (e.key === 'Enter' && t.matches && t.matches('.lt-loc-pop li')) pickLoc(t);
    if (e.key === 'Escape') {
      if (closeLocs()) return;
      if (cur === 'exit' || cur === 'report' || cur === 'report-ok' || cur === 'report-fail') { flags.resume = true; show('question'); }
      else if (cur === 'cert' || cur === 'cert-ios' || cur === 'png-err') show('cta');
    }
    if (e.key === 'Tab' && cur) { // ловушка фокуса в окне
      var st = document.querySelector('[data-state="' + cur + '"]'), m = st && st.querySelector('.lt-modal');
      if (!m) return;
      var f = Array.prototype.filter.call(m.querySelectorAll('button,a[href],input,textarea'), function (x) { return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      else if (!m.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); }
    }
  });

  // ---------- меню языка интерфейса ----------
  function closeLocs() { var any = false; $$('.lt-loc-pop').forEach(function (p) { if (!p.hidden) any = true; p.hidden = true; }); $$('.lt-loc-btn').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); }); return any; }
  function toggleLoc(b) { var p = b.parentNode.querySelector('.lt-loc-pop'), open = p.hidden; closeLocs(); p.hidden = !open; b.setAttribute('aria-expanded', String(open)); if (open) { var s = p.querySelector('[aria-selected="true"]'); if (s) s.focus(); } }
  function pickLoc(li) {
    var k = li.getAttribute('data-loc'), code = li.getAttribute('data-code');
    $$('.lt-loc-pop li').forEach(function (x) { x.setAttribute('aria-selected', String(x.getAttribute('data-loc') === k)); });
    $$('.js-loc-code').forEach(function (x) { x.textContent = code; });
    $$('.js-loc-flag').forEach(function (x) { x.src = x.src.replace(/[a-z]{2}\.svg$/, k + '.svg'); });
    console.info(TAG, 'язык интерфейса теста (макет — тексты не переводятся):', k);
    closeLocs();
  }

  // ---------- сообщение об ошибке ----------
  function sendReport(b) {
    if (b.disabled) return;
    var m = b.closest('.lt-modal'), ta = m.querySelector('.js-rep'), h = m.querySelector('.js-rep-hint');
    if (ta.value.trim().length < 10) { console.info(TAG, 'отчёт короче 10 символов:', ta.value.trim().length); h.classList.add('err'); h.textContent = 'Добавь подробности: минимум 10 символов.'; ta.classList.add('err'); ta.focus(); return; }
    ta.classList.remove('err');
    b.disabled = true; var html = b.innerHTML;
    b.innerHTML = '<span class="lt-sending"><span class="spinner"></span>Отправляем…</span>';
    setTimeout(function () { b.disabled = false; b.innerHTML = html; ta.value = ''; show('report-ok'); }, 900);
  }
  function retryReport(b) {
    if (b.disabled) return;
    b.disabled = true; var html = b.innerHTML;
    b.innerHTML = '<span class="lt-sending"><span class="spinner"></span>Отправляем…</span>';
    setTimeout(function () { b.disabled = false; b.innerHTML = html; show('report-ok'); }, 900);
  }

  // ---------- вопрос: таймер 45 с, выбор, «Не знаю», прогресс ----------
  var END = 12, C = 2 * Math.PI * 19, quizzes = {};
  function makeQuiz(root) {
    var nEl = root.querySelector('.js-qn'), secEl = root.querySelector('.js-sec'), ring = root.querySelector('.t-fg'), timer = root.querySelector('.lt-timer');
    var prog = root.querySelector('.lt-prog'), body = root.querySelector('.lt-qbody'), ans = root.querySelector('.lt-ans');
    var n0 = +root.getAttribute('data-n') || 1, i0 = +root.getAttribute('data-i') || 0, s0 = +root.getAttribute('data-start') || 45;
    var n = n0, idx = i0, remain = s0 * 1000, deadline = 0, iv = null, busy = false;
    function paint() { var s = Math.max(0, Math.ceil(remain / 1000)); secEl.textContent = s; ring.style.strokeDashoffset = String(C * (1 - remain / 45000)); timer.classList.toggle('low', s <= 10); }
    function stop() { if (iv) { clearInterval(iv); iv = null; } }
    function tick() { remain = Math.max(0, deadline - Date.now()); paint(); if (remain <= 0) { stop(); console.info(TAG, 'время вышло — ответ засчитан как «Не знаю»', { n: n }); advance('skip'); } }
    function run() { stop(); deadline = Date.now() + remain; iv = setInterval(tick, 200); paint(); }
    function render() {
      var q = D.qs[idx % D.qs.length];
      nEl.textContent = n;
      prog.style.setProperty('--w', (n / 20 * 100) + '%'); prog.setAttribute('aria-valuenow', n);
      root.querySelector('.js-scn').textContent = q.s;
      root.querySelector('.js-ins').textContent = q.i;
      var st = root.querySelector('.js-stim'); st.textContent = ''; var parts = q.t.split('______');
      st.appendChild(document.createTextNode(parts[0])); if (parts.length > 1) { st.appendChild(document.createElement('u')); st.appendChild(document.createTextNode(parts[1])); }
      ans.innerHTML = '';
      q.o.forEach(function (o, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.setAttribute('data-a', k);
        b.innerHTML = '<span class="flag">' + 'ABCD'.charAt(k) + '</span><span class="tx"><span class="tt"></span></span>';
        b.querySelector('.tt').textContent = o; ans.appendChild(b);
      });
    }
    function advance(kind, k) {
      var q = D.qs[idx % D.qs.length];
      if (kind === 'skip') G.S.skipped++; else { G.S.answered++; if (k === q.c) G.S.correct++; }
      if (n >= END) { stop(); finish(); return; }
      n++; idx++; remain = 45000;
      if (reduce) { render(); busy = false; run(); return; }
      body.classList.add('out');
      setTimeout(function () { render(); body.classList.remove('out'); body.classList.add('in'); void body.offsetWidth; body.classList.remove('in'); busy = false; run(); }, 220);
    }
    ans.addEventListener('click', function (e) {
      var b = e.target.closest('.opt'); if (!b || busy) return;
      busy = true; stop();
      $$('.opt', ans).forEach(function (x) { x.setAttribute('aria-checked', String(x === b)); });
      setTimeout(function () { advance('answer', +b.getAttribute('data-a')); }, 200);
    });
    ans.addEventListener('keydown', function (e) {
      var list = $$('.opt', ans), i = list.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); list[(i + 1) % list.length].focus(); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    });
    root.querySelector('.js-skip').addEventListener('click', function () { if (busy) return; busy = true; stop(); advance('skip'); });
    return {
      enter: function (o) {
        if (o.fresh) { n = 1; idx = 0; remain = 45000; render(); }
        else if (!o.resume) { n = n0; idx = i0; remain = s0 * 1000; render(); }
        busy = false; run();
      },
      pause: function () { if (iv) remain = Math.max(0, deadline - Date.now()); stop(); },
    };
  }
  function finish() {
    var s = stats(), r = s.answered ? s.correct / s.answered : 0;
    G.lv = r < .2 ? 'Pre-A1' : r < .35 ? 'A1' : r < .5 ? 'A2' : r < .65 ? 'B1' : r < .8 ? 'B2' : r < .92 ? 'C1' : 'C2';
    console.info(TAG, 'тест завершён', { stats: s, level: G.lv });
    applyLevel(); applyStats(); applyCertText();
    show('result'); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('[data-quiz]').forEach(function (r) { quizzes[r.closest('[data-state]').getAttribute('data-state')] = makeQuiz(r); });

  // ---------- вход в состояния ----------
  var statsDone = false;
  function onEnter(name, el) {
    cur = name;
    if (quizzes[name]) { var o = { fresh: flags.fresh, resume: flags.resume }; flags.fresh = flags.resume = false; quizzes[name].enter(o); }
    if (name === 'start' && !statsDone) {
      statsDone = true;
      setTimeout(function () { el.querySelectorAll('.js-stat').forEach(function (b) { countTo(b, D.stats[b.getAttribute('data-k')], 900); }); var box = el.querySelector('.lt-stats'); if (box) box.removeAttribute('aria-busy'); }, reduce ? 0 : 700);
    }
    if (name === 'landing') { var pr = el.querySelector('.js-proof'); if (pr) countTo(pr, D.stats[G.tl], 900); }
    if (name === 'loading' && flags.flow) {
      flags.flow = false; G.S = { correct: 0, answered: 0, skipped: 0 };
      setTimeout(function () { if (cur === 'loading') { flags.fresh = true; show('question'); } }, 1400);
    }
    if (name === 'result' || name === 'share' || name === 'share-err' || name === 'name-err') { countUp(el); var inp = el.querySelector('.js-name-input'); if (inp && name !== 'name-err') inp.value = G.nm; applyCertText(); }
    if (name === 'name-err') { var ni = el.querySelector('.js-name-input'); if (ni) { ni.value = ''; ni.classList.add('err'); el.querySelector('.js-name-err').hidden = false; } }
    if (name === 'report') { var h = el.querySelector('.js-rep-hint'); if (h) { h.classList.remove('err'); h.textContent = 'Минимум 10 символов.'; } }
    var m = el.querySelector('.lt-modal');
    if (m) setTimeout(function () { var f = m.querySelector('textarea') || m.querySelector('.btn-primary') || m.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function onLeave(name) { if (quizzes[name]) quizzes[name].pause(); }
  var mo = new MutationObserver(function (list) {
    list.forEach(function (m) {
      var el = m.target, name = el.getAttribute('data-state');
      if (el.hasAttribute('data-hidden')) onLeave(name); else onEnter(name, el);
    });
  });
  $$('[data-state]').forEach(function (el) {
    if (!el.getAttribute('data-state')) return;
    mo.observe(el, { attributes: true, attributeFilter: ['data-hidden'] });
  });

  applyLevel(); applyLang(); applyName(); applyTheme(); applyStats();
  var vis = $$('[data-state]').filter(function (el) { return !el.hasAttribute('data-hidden'); })[0];
  if (vis) onEnter(vis.getAttribute('data-state'), vis);
  console.info(TAG, 'макет готов, состояние:', vis && vis.getAttribute('data-state'));
}

export default [
  {
    file: 'english-level-test.html',
    title: 'Тест уровня',
    group: 'Тест уровня',
    path: '/english-level-test/',
    body,
    css,
    js: `(${pageScript.toString()})(${JSON.stringify(DATA)});`,
    states: [
      ['start', 'Старт'],
      ['stats-off', 'Статистика недоступна'],
      ['start-err', 'Тест не готов'],
      ['noscript', 'Без JavaScript'],
      ['landing', 'Лендинг теста'],
      ['loading', 'Загрузка'],
      ['load-err', 'Ошибка загрузки'],
      ['question', 'Вопрос'],
      ['q-low', 'Мало времени'],
      ['exit', 'Выйти?'],
      ['report', 'Сообщить об ошибке'],
      ['report-ok', 'Сообщение принято'],
      ['report-fail', 'Не отправлено'],
      ['result', 'Результат'],
      ['name-err', 'Без имени'],
      ['share', 'Ссылка скопирована'],
      ['share-err', 'Ссылка не скопирована'],
      ['cert', 'Сертификат'],
      ['cert-ios', 'Сертификат · iPhone'],
      ['png-err', 'Ошибка PNG'],
      ['cta', 'Следующий шаг'],
    ],
  },
];
