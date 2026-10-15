// зачем: макет журнала (/guides/ + 6 статей) и служебных bare-страниц (/phraseman/invite|duel|apple-auth)
// в стиле 2.0, вариант C «Живые темы». Тексты — дословно с knowly-www (обращение переведено на «ты»;
// фразы-образцы для разговора с незнакомцами вроде «Здравствуйте», «подскажите» оставлены как есть —
// это то, что читатель говорит другим, а не обращение к читателю). Ничего не добавлено и не убрано,
// кроме оформления: оглавление статьи и полоса прочтения — навигация по тем же заголовкам.
import { ic, pageHead, ASSET } from '../_shell.mjs';

const IMG = (n) => `${ASSET.SITE}/approved/${n}`;

/* ---------------- данные журнала ---------------- */
// cat — к какому фильтру относится метка карточки (как на живом сайте: Метод = {Метод, Привычка, С чего начать}).
const GUIDES = [
  { file: 'guide-how-to-learn-english.html', path: '/guides/how-to-learn-english/', img: 'guide-plan.webp', tag: 'С чего начать', cat: 'method',
    t: 'Язык, который впишется в твою жизнь', d: 'План без героизма — и без брошенного на третьей неделе.' },
  { file: 'guide-english-by-phrases.html', path: '/guides/english-by-phrases/', img: 'guide-phrases.webp', tag: 'Метод', cat: 'method',
    t: 'Слова знакомые. А фраза не складывается?', d: 'Почему любой язык держится на готовых блоках — и как их учить.' },
  { file: 'guide-english-15-minutes-a-day.html', path: '/guides/english-15-minutes-a-day/', img: 'guide-habit.webp', tag: 'Привычка', cat: 'method',
    t: 'Что успеть за 15 минут в день', d: 'Короткое занятие, которое не бросишь — и чего от него честно ждать.' },
  { file: 'guide-speaking-barrier.html', path: '/guides/speaking-barrier/', img: 'guide-conversation.webp', tag: 'Разговор', cat: 'talk',
    t: 'Понимаю, но не могу ответить', d: 'Откуда берётся ступор — и как его пройти.' },
  { file: 'guide-pronunciation.html', path: '/guides/how-to-improve-english-pronunciation/', img: 'guide-pronunciation.webp', tag: 'Произношение', cat: 'talk',
    t: 'Чтобы тебя понимали с первого раза', d: 'Звуки, ритм и мелодия речи — без мучений перед зеркалом.' },
  { file: 'guide-travel.html', path: '/guides/english-phrases-for-travel/', img: 'guide-travel.webp', tag: 'Путешествия', cat: 'travel',
    t: 'Весь мир начинается с «извините»', d: 'Первые фразы для аэропорта, кафе и прогулки — на четырёх языках.' },
];

const FILTERS = [['all', 'Все материалы'], ['method', 'Как учиться'], ['talk', 'Как говорить'], ['travel', 'В поездке']];

/* ---------------- журнал: хаб ---------------- */
const hubBody = `
${pageHead({ ov: 'Журнал Phraseman', h1: 'Про языки.', l2: 'По-человечески.', lead: 'Практические разборы для тех, кто хочет понимать, говорить и находить для языка место в жизни.' })}
<section class="gx"><div class="wrap">
  <div class="chips" role="group" aria-label="Фильтр материалов">
    ${FILTERS.map(([id, ru]) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${id === 'all'}">${ru}</button>`).join('')}
  </div>
  <div class="cards3 gx-grid">
    ${GUIDES.map((g) => `<a class="glass acard" href="${g.file}" data-cat="${g.cat}">
      <div class="img"><img src="${IMG(g.img)}" alt="" width="1440" height="810" loading="lazy" decoding="async"><span class="rarr" aria-hidden="true">${ic('out', 's18')}</span></div>
      <div class="bd"><span class="ov">${g.tag}</span><b>${g.t}</b><span>${g.d}</span></div>
    </a>`).join('')}
  </div>
  <div class="glass state-card gx-empty" id="gEmpty" hidden>
    <div class="big-ic">${ic('book')}</div>
    <p style="color:var(--text);font-size:var(--t-l);font-weight:600">В этой категории пока нет материалов.</p>
  </div>
</div></section>
<section class="block close"><div class="wrap">
  <div class="glass vclose">
    <picture class="vart" aria-hidden="true"><source media="(max-width:700px)" srcset="${IMG('voice-mobile.webp')}"><img src="${IMG('voice-master.webp')}" alt="" loading="lazy" decoding="async"></picture>
    <h2 class="h2">Говори увереннее.<span class="l2">В знакомых ситуациях.</span></h2>
    <a class="btn btn-primary" href="download.html">Начать бесплатно ${ic('arrow', 's18 arr')}</a>
  </div>
</div></section>`;

const hubCss = `
.gx .wrap { display: grid; gap: 26px; }
.acard[hidden], .gx-empty[hidden] { display: none !important; }
.acard { color: var(--text); }
.acard .img { position: relative; }
.acard .rarr { position: absolute; top: 14px; right: 14px; width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center;
  background: color-mix(in srgb, var(--card-solid) 72%, transparent); color: var(--text); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  transition: transform 300ms var(--spring); }
.acard:hover .rarr { transform: translate(2px, -2px); }
.acard .bd .ov { font-size: 12px; color: var(--fill); }
.acard.in { animation: gxIn 460ms var(--ease) var(--d, 0ms) both; }
@keyframes gxIn { from { opacity: .001; transform: translateY(10px) scale(.985); } to { opacity: 1; transform: none; } }
.vclose { position: relative; border-radius: 34px; padding: clamp(56px, 9vw, 112px) 24px; display: grid; justify-items: center; gap: 30px; text-align: center; }
.vclose .vart { position: absolute; inset: 0; z-index: -1; }
.vclose .vart img { width: 100%; height: 100%; object-fit: cover; opacity: .42; filter: saturate(.8);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 45%, #000 100%); mask-image: linear-gradient(180deg, transparent 0%, #000 45%, #000 100%); }
:root[data-mode="light"] .vclose .vart img { opacity: .26; }
.vclose .h2 { max-width: 16ch; }
@media (prefers-reduced-motion: reduce) { .acard.in { animation: none; } }
`;

// зачем: фильтр мгновенный и локальный (как на живом сайте), плюс связан с полоской «Макет»,
// чтобы владелец видел каждое состояние, включая пустую категорию, и мог открыть его по #якорю.
const hubJs = `
(function () {
  var chips = [].slice.call(document.querySelectorAll('[data-filter]'));
  var cards = [].slice.call(document.querySelectorAll('[data-cat]'));
  var empty = document.getElementById('gEmpty');
  var ids = ['all', 'method', 'talk', 'travel', 'empty'];
  if (!empty || !cards.length) { console.warn('[GUIDES] нет карточек или пустого состояния', cards.length, !!empty); return; }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function apply(id, src) {
    if (ids.indexOf(id) < 0) { console.warn('[GUIDES] неизвестный фильтр:', id, 'источник:', src); return; }
    var f = id === 'empty' ? null : id;
    if (f) chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === f)); });
    var n = 0;
    cards.forEach(function (c) {
      var on = f !== null && (f === 'all' || c.dataset.cat === f);
      c.hidden = !on;
      if (on && !reduce) { c.style.setProperty('--d', (n * 45) + 'ms'); c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); }
      if (on) n++;
    });
    empty.hidden = n > 0;
    document.querySelectorAll('.states [data-show]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.show === id)); });
    console.log('[GUIDES] фильтр:', id, 'источник:', src, 'показано карточек:', n);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () {
    apply(c.dataset.filter, 'chip');
    try { history.replaceState(null, '', '#' + c.dataset.filter); } catch (e) { console.warn('[GUIDES] якорь не записан:', e && e.message); }
  }); });
  document.querySelectorAll('.states [data-show]').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.show, 'states'); }); });
  var h = location.hash.slice(1);
  apply(ids.indexOf(h) >= 0 ? h : 'all', 'load');
})();`;

/* ---------------- статьи ---------------- */
// Блоки статьи: ['p', html] · ['h2', text] · ['h3', text] · ['short', html] · ['cta', title, text, icon]
// · ['tl', [[term, text], …]] — список «термин — пояснение» · ['x', [[b, t], …]] — чего не делать
// · ['ok', [text, …]] — признаки · ['link', html] — финальная строка со ссылкой · ['phr', [[ru, note, es, fr, de, en], …]]
// · ['tip', html] — лайфхак.
const DL = (t) => `<a href="download.html">${t}</a>`;

const ARTICLES = [
  {
    g: GUIDES[0], h1: 'Как выучить новый язык самостоятельно: план, который не бросишь через неделю', alt: 'Путь к изучению языка', min: 7,
    blocks: [
      ['p', 'Почти каждый хоть раз начинал учить язык «с понедельника». Купленный учебник, красивая тетрадь, три вечера энтузиазма — и тишина. Дело не в лени и не в «отсутствии способностей». Просто большинство планов построено так, будто у тебя нет работы, детей, усталости и жизни. Этот план — для людей, у которых всё это есть.'],
      ['short', 'до уверенного бытового общения на новом языке реально дойти самостоятельно за год, занимаясь 15–30 минут в день. Работают три вещи: учить целые фразы, а не отдельные слова; говорить вслух с первого дня; заниматься каждый день понемногу, а не раз в неделю подолгу.'],
      ['h2', 'Шаг 1. Замени «выучить язык» на конкретную сцену'],
      ['p', '«Выучить испанский» — цель без финиша. Мозг не понимает, когда можно порадоваться, поэтому мотивация гаснет через пару недель. Сравни с этим: «через три месяца заказать ужин в Барселоне, не тыкая пальцем в меню». Или: «к лету поболтать с соседом-французом дольше двух минут». Или: «к осени пройти собеседование на немецком».'],
      ['p', 'Сцена сразу подсказывает, что учить первым. Для ужина в ресторане нужны два десятка фраз, а не вся грамматика. И у сцены есть финиш — день, когда ты её прожил.'],
      ['h2', 'Шаг 2. Первые 100 фраз важнее первых 1000 слов'],
      ['p', 'Носители любого языка говорят не словами, а готовыми блоками. Испанец не собирает «¿Me pones un café?» из словаря — он просто это говорит. Француз не думает над «ça marche», немец — над «kein Problem». Такие блоки — основа живой речи в любом языке.'],
      ['p', 'Отсюда простой вывод: 100 выученных фраз дадут тебе больше свободы в разговоре, чем 500 отдельных слов. Начни с того, что говорят каждый день: поздороваться, попросить, переспросить, согласиться, извиниться, поблагодарить.'],
      ['cta', 'Первая живая фраза — через 30 секунд', 'Phraseman учит готовыми фразами с озвучкой и проверкой произношения. Без регистрации.', 'cards'],
      ['h2', 'Шаг 3. Говори вслух с первого дня — даже если стыдно'],
      ['p', 'Самая частая ловушка самостоятельного обучения — «немой язык». Человек читает, понимает, решает тесты — а в живом разговоре не может выдавить ни слова. Причина простая: понимание и речь — два разных навыка, и речь тренируется только речью.'],
      ['p', 'Правило: каждую новую фразу проговори вслух 3–5 раз. Не шёпотом, а нормальным голосом. Первые разы будет звучать смешно — это нормально, так звучат все, кто начинает.'],
      ['h2', 'Шаг 4. Пятнадцать минут каждый день бьют два часа в субботу'],
      ['p', 'Память закрепляет то, к чему мы возвращаемся часто. Пятнадцать минут каждый день — это семь встреч с языком в неделю. Два часа по субботам — одна, и к следующей субботе половина уже забыта. За год коротких ежедневных занятий набегает около 90 часов практики — этого хватает, чтобы с нуля выйти на уровень простых разговоров.'],
      ['h2', 'Шаг 5. Через пару месяцев добавь то, что тебе правда интересно'],
      ['p', 'Когда за плечами несколько сотен фраз, пора пускать язык в свою жизнь: сериал, подкаст, блогер, песни, рецепты. Главное правило — понимать примерно 70–80%. Тогда мозг достраивает остальное сам, и это ощущается как азарт, а не как пытка со словарём.'],
      ['h2', 'Шаг 6. Устрой себе ситуации, где молчать не получится'],
      ['p', 'Языковой обмен, разговорный клуб, звонок в местное кафе, чтобы забронировать столик, короткая поездка. Всё, что заставляет говорить под лёгким давлением, двигает вперёд быстрее любого учебника.'],
      ['h2', 'Чего делать не стоит'],
      ['x', [
        ['Зубрить списки слов без контекста.', 'Отдельные слова не складываются в речь сами.'],
        ['Начинать с толстого учебника грамматики.', 'Правила без практики выветриваются за неделю.'],
        ['Ждать «правильного уровня», чтобы заговорить.', 'Его не будет. Говорить нужно с ошибками — и сейчас.'],
        ['Верить в «язык за месяц».', 'За месяц ставится привычка. Язык — дальше.'],
      ]],
      ['h2', 'Честные сроки'],
      ['tl', [
        ['1 месяц', 'привычка заниматься и первые 200 фраз.'],
        ['3 месяца', '«уровень выживания» в поездке: заказать, спросить дорогу, объясниться.'],
        ['6–8 месяцев', 'простые разговоры на бытовые темы.'],
        ['12 месяцев и дальше', 'уверенное бытовое общение и сериалы с субтитрами.'],
      ]],
      ['link', `Не хочется собирать систему самому? ${DL('Скачай Phraseman')} — первый урок начинается через 30 секунд, без регистрации.`],
    ],
    end: ['Готовая система вместо самостоятельной сборки', 'Тысячи живых фраз, озвучка и повторения по расписанию. Первый урок открывается сразу, без регистрации.'],
  },
  {
    g: GUIDES[1], h1: 'Слова знакомые. А фраза не складывается?', alt: 'Отдельные звенья соединяются в целую фразу', min: 5,
    blocks: [
      ['p', 'Знакомое ощущение: ты знаешь все слова в предложении, но сам бы его так никогда не сказал. Или наоборот — хочешь что-то сказать, слова есть, а собрать их вместе не получается. Предложение рассыпается прямо во рту. Это не твоя недоработка. Это просто неправильный кирпич.'],
      ['h2', 'Язык строят не из слов, а из блоков'],
      ['p', 'Попробуй вспомнить, как ты говоришь по-русски. «Ну, как бы», «давай созвонимся», «мне без разницы», «ничего страшного». Ты не собираешь эти фразы из отдельных слов по правилам — ты достаёшь их целиком, как готовую вещь с полки.'],
      ['p', 'Носители любого языка делают то же самое. Испанец говорит «¡qué va!», француз — «ça marche», немец — «das passt schon», англичанин — «I’m running late». Лингвисты называют это формульной речью: значительная часть живой речи состоит именно из таких устойчивых кусков, а не из свободно собранных предложений.'],
      ['h2', 'Почему слова по одному не работают'],
      ['p', 'Когда ты учишь слово отдельно, ты запоминаешь его перевод — и больше ничего. Не знаешь, с какими словами оно дружит, в какой ситуации звучит естественно, а в какой — нелепо. Поэтому «правильно собранная» по словарю фраза часто звучит так, будто её перевёл робот.'],
      ['p', 'Фраза же приходит целиком: со смыслом, с интонацией, с ситуацией, в которой её говорят. Ты не угадываешь — ты берёшь то, что проверено миллионами носителей.'],
      ['cta', 'Учись целыми фразами', 'В Phraseman каждая фраза — с озвучкой, переводом и тренировкой произношения. Первый урок — через 30 секунд.', 'cards'],
      ['h2', 'Три бонуса, которые дают фразы'],
      ['tl', [
        ['Скорость.', 'Не нужно строить предложение в голове — ты достаёшь готовое. Пауза перед ответом сокращается в разы.'],
        ['Грамматика «на автомате».', 'Внутри фразы уже правильные окончания, порядок слов и предлоги. Ты усваиваешь правила, даже не открывая учебник.'],
        ['Естественность.', 'Ты звучишь как человек, а не как словарь. Собеседник расслабляется — и разговор идёт легче.'],
      ]],
      ['h2', 'Как учить фразами: практический метод'],
      ['h3', '1. Бери фразы из своей жизни'],
      ['p', 'Не «мой дядя — инженер», а то, что ты реально скажешь: «можно счёт?», «я чуть опоздаю», «подскажите, как пройти…». Чем ближе фраза к твоему дню, тем быстрее она прирастает.'],
      ['h3', '2. Учи фразу вместе с ситуацией'],
      ['p', 'Представь, где и кому ты её скажешь. Картинка в голове — лучший крючок для памяти.'],
      ['h3', '3. Проговаривай вслух, а не читай глазами'],
      ['p', 'Фраза должна жить во рту, а не только в голове. Три-пять повторов вслух — и она начинает выскакивать сама.'],
      ['h3', '4. Возвращайся к ней через день, через три, через неделю'],
      ['p', 'Это и есть интервальные повторения: ты встречаешь фразу снова как раз тогда, когда начинаешь её забывать. Так она уходит в долгую память.'],
      ['h3', '5. Меняй одну деталь'],
      ['p', 'Выучил «¿Me pones un café?» — попробуй «¿Me pones un agua?». Выучил «Je voudrais un croissant» — замени круассан на что угодно. Так один блок превращается в десятки новых фраз.'],
      ['h2', 'А грамматика что — не нужна?'],
      ['p', 'Нужна. Но вторым слоем. Сначала ты говоришь фразами, потом узнаёшь, почему они устроены именно так. Правило, которое объясняет уже знакомую фразу, запоминается мгновенно. Правило, которое висит в воздухе без примеров, забывается к следующему уроку.'],
      ['link', `Хочешь попробовать метод на практике? ${DL('Скачай Phraseman')} и начни с первых живых фраз прямо сейчас.`],
    ],
    end: ['Фразы вместо зубрёжки слов', 'Живые выражения с озвучкой, проверкой произношения и повторением по расписанию. Без регистрации.'],
  },
  {
    g: GUIDES[2], h1: 'Что успеть за 15 минут в день — и хватит ли этого', alt: 'Песочные часы — время для ежедневной практики', min: 5,
    blocks: [
      ['p', 'Пятнадцать минут — это одна серия подкаста, очередь в кофейне или дорога на работу. Кажется, что за такое время невозможно выучить язык. И правда — за одно такое занятие невозможно. А вот за двести таких занятий — очень даже.'],
      ['h2', 'Почему короткие занятия работают лучше длинных'],
      ['p', 'Мозг не любит зубрёжку «в последний момент». Он закрепляет то, что встречает часто и регулярно. Пятнадцать минут каждый день — это семь встреч с языком в неделю. Двухчасовой марафон по воскресеньям — одна, и к следующему воскресенью от неё мало что остаётся.'],
      ['p', 'Есть и второй секрет: короткое занятие почти невозможно отложить. «Позанимаюсь два часа» — пугает, и ты откладываешь. «Позанимаюсь пятнадцать минут» — ерунда, можно прямо сейчас. Привычка выживает именно тогда, когда порог входа низкий.'],
      ['h2', 'Идеальные 15 минут: как их разложить'],
      ['tl', [
        ['3 минуты — повтор старого.', 'Пробегись по фразам, которые учил вчера и на прошлой неделе. Это фундамент, без него новое не держится.'],
        ['5 минут — новые фразы.', 'Пять-семь штук, не больше. Прочитал, послушал, повторил вслух.'],
        ['4 минуты — говорение.', 'Проговори новые фразы в своих ситуациях. Поменяй в них по одному слову.'],
        ['3 минуты — живой язык.', 'Кусочек песни, ролика, диалога. Просто послушать, как это звучит у носителей.'],
      ]],
      ['cta', 'Твои 15 минут уже собраны', 'Phraseman сам подбирает повторы и новые фразы на каждый день. Тебе остаётся только открыть приложение.', 'clock'],
      ['h2', 'Как не бросить через две недели'],
      ['h3', 'Привяжи занятие к тому, что ты уже делаешь'],
      ['p', 'Не «когда будет время», а «после утреннего кофе» или «в метро по дороге домой». Новая привычка легче всего цепляется за старую.'],
      ['h3', 'Разреши себе плохие дни'],
      ['p', 'Устал? Сделай пять минут вместо пятнадцати. Главное — не разорвать цепочку. Пять минут в плохой день ценнее, чем идеальный план, который ты бросил.'],
      ['h3', 'Замечай маленькие победы'],
      ['p', 'Понял фразу в песне. Прочитал вывеску на фото из отпуска. Узнал слово в сериале без субтитров. Запоминай такие моменты — именно они держат мотивацию лучше любых обещаний.'],
      ['h2', 'Чего честно ждать'],
      ['tl', [
        ['Через месяц', 'занятие стало привычкой, в копилке сотня-другая фраз, первые фразы вслух уже не пугают.'],
        ['Через три месяца', 'можно объясниться в поездке: заказать, спросить, поблагодарить.'],
        ['Через полгода', 'простые разговоры на бытовые темы, заметно легче понимать на слух.'],
        ['Через год', 'уверенное бытовое общение и сериалы с субтитрами на языке оригинала.'],
      ]],
      ['p', 'Никакой магии и никакого «языка за месяц». Просто очень много маленьких шагов подряд.'],
      ['link', `Начать можно прямо сейчас: ${DL('скачай Phraseman')} — первое занятие займёт меньше 15 минут.`],
    ],
    end: ['Пятнадцать минут, которые складываются в язык', 'Короткие ежедневные занятия, повторения по расписанию и живые фразы. Первый урок — сразу, без регистрации.'],
  },
  {
    g: GUIDES[3], h1: 'Понимаю, но не могу ответить', alt: 'Голос соединяет двух собеседников', min: 6,
    blocks: [
      ['p', 'Собеседник задаёт простой вопрос. Ты его прекрасно понял. Ты даже знаешь, что ответить. Но в голове белый шум, во рту пересохло, и единственное, что получается выдавить, — неловкая улыбка. Через пять минут, уже по дороге домой, идеальный ответ приходит сам. Знакомо? Это и есть языковой барьер. И хорошая новость в том, что он проходит.'],
      ['h2', 'Почему так происходит'],
      ['h3', 'Понимать и говорить — два разных навыка'],
      ['p', 'Понимание работает как узнавание: ты видишь знакомое и киваешь. Речь — это извлечение: нужно самому достать нужные слова, собрать их и произнести, пока человек ждёт. Если годами тренировать только чтение и тесты, узнавание становится сильным, а извлечение остаётся слабым. Отсюда и разрыв.'],
      ['h3', 'Страх ошибиться'],
      ['p', 'Многих в школе учили, что ошибка — это плохо, за неё снижают оценку. В итоге взрослый человек молчит, лишь бы не сказать неправильно. Хотя в жизни собеседнику почти всегда всё равно, перепутал ты окончание или нет: он хочет понять тебя, а не проверить.'],
      ['h3', 'Перевод в голове'],
      ['p', 'Ты строишь фразу по-русски, потом переводишь слово за словом, потом проверяешь грамматику. Пока это происходит, разговор уже ушёл вперёд. Мозг перегружается — и выключается.'],
      ['cta', 'Тренируй речь, а не только понимание', 'В Phraseman ты проговариваешь каждую фразу вслух, а телефон проверяет произношение. Без свидетелей и без стыда.', 'mic'],
      ['h2', 'Пять шагов, которые снимают барьер'],
      ['h3', '1. Говори вслух каждый день — даже сам с собой'],
      ['p', 'Комментируй то, что делаешь: «сейчас сделаю кофе», «где мои ключи?». Звучит странно, но это лучшая бесплатная тренировка речи. Рот привыкает к чужим звукам, а мозг — к тому, что слова нужно доставать быстро.'],
      ['h3', '2. Собери запас готовых ответов'],
      ['p', 'Большинство разговоров крутятся вокруг одних и тех же тем: кто ты, откуда, чем занимаешься, что любишь. Подготовь на каждую по две-три готовые фразы — и в разговоре ты будешь доставать их, а не сочинять на ходу.'],
      ['h3', '3. Выучи фразы «на паузу»'],
      ['p', 'В каждом языке есть слова, которые дают время подумать: «ну…», «как бы это сказать…», «подождите секунду». Испанское «a ver…», французское «alors…», немецкое «also…». Они заполняют паузу естественно — и снимают панику.'],
      ['h3', '4. Разреши себе говорить неидеально'],
      ['p', 'Простая фраза с ошибкой лучше идеальной, которая осталась в голове. Носители постоянно говорят с ошибками на родном языке — и никто не умирает.'],
      ['h3', '5. Начни с «безопасных» разговоров'],
      ['p', 'Сначала — с приложением, потом с другом, который тоже учит язык, потом — языковой обмен, где второй человек тоже волнуется. Сложность растёт постепенно, и страх растёт вместе с ней — то есть почти не растёт.'],
      ['h2', 'Как понять, что барьер уходит'],
      ['ok', [
        'Ты начинаешь отвечать, не проговаривая фразу сначала по-русски.',
        'Ошибка в разговоре больше не выбивает из колеи — ты просто идёшь дальше.',
        'Паузы становятся короче, а «белый шум» в голове появляется всё реже.',
      ]],
      ['p', 'Барьер не ломается за один день. Он тает понемногу — с каждой фразой, которую ты сказал вслух.'],
      ['link', `Хочешь начать с безопасной тренировки? ${DL('Скачай Phraseman')} и проговори первые фразы прямо сегодня.`],
    ],
    end: ['Заговори без свидетелей', 'Произноси фразы вслух, получай проверку произношения и переходи к диалогам. Первый урок — без регистрации.'],
  },
  {
    g: GUIDES[4], h1: 'Чтобы тебя понимали с первого раза', alt: 'Камертон и волны звука', min: 6,
    blocks: [
      ['p', 'Ты старательно произносишь фразу, а в ответ слышишь вежливое «Sorry?», «¿Perdón?» или «Pardon?». И дело вовсе не в словах — слова ты выбрал правильно. Дело в том, как они прозвучали. Хорошая новость: произношение тренируется так же, как любая мышца. И для этого не нужен дорогой преподаватель.'],
      ['h2', 'Сначала о главном: акцент — это нормально'],
      ['p', 'Цель — не звучать как носитель. Цель — чтобы тебя понимали легко и с первого раза. Лёгкий акцент — это просто твой голос, в нём нет ничего стыдного. Миллионы людей по всему миру говорят на неродном языке с акцентом и прекрасно справляются.'],
      ['h2', 'Что на самом деле мешает пониманию'],
      ['h3', 'Ритм и ударение важнее отдельных звуков'],
      ['p', 'Можно идеально выговорить каждый звук и всё равно звучать непонятно — если ударение стоит не там. Испанский стучит ровно, как барабан, французский ставит акцент в конце фразы, немецкий любит чёткие, «рубленые» слоги. Поймав мелодию языка, ты становишься понятнее, чем после месяца работы над отдельными звуками.'],
      ['h3', 'Звуки, которых нет в русском'],
      ['p', 'В каждом языке есть парочка звуков-ловушек. Французские носовые гласные, немецкое «ü», испанское раскатистое «rr», английское «th». Мозг по привычке заменяет их на ближайший русский звук — и слово становится неузнаваемым. Их стоит выделить и потренировать отдельно.'],
      ['h3', 'Сглаживание на стыках'],
      ['p', 'В живой речи слова сливаются. Француз не говорит «vous avez» по слогам — он говорит «вузаве». Если ты выговариваешь каждое слово отдельно, звучишь как робот, даже когда все звуки правильные.'],
      ['cta', 'Проверь своё произношение', 'Phraseman слушает, как ты произносишь фразу, и подсказывает, где звучит не так. Распознавание работает прямо на телефоне.', 'ear'],
      ['h2', 'Главный метод: шэдоуинг'],
      ['p', 'Шэдоуинг — это «тень». Ты включаешь короткую запись носителя и повторяешь за ним почти одновременно, как эхо. Не текст, а мелодию: паузы, ускорения, подъёмы и спады голоса.'],
      ['tl', [
        ['Выбери отрывок на 10–20 секунд.', 'Длиннее — сложно, короче — мало.'],
        ['Послушай его 2–3 раза', 'просто так, не повторяя.'],
        ['Повторяй вслух вместе с записью,', 'отставая на полсекунды.'],
        ['Запиши себя', 'и сравни с оригиналом. Это неприятно, но это самый быстрый способ услышать свои ошибки.'],
      ], 'num'],
      ['h2', 'План на четыре недели'],
      ['tl', [
        ['Неделя 1 — слушаем мелодию.', 'Каждый день 10 минут просто слушай речь носителей и отмечай, где голос поднимается и опускается.'],
        ['Неделя 2 — звуки-ловушки.', 'Найди 3–4 звука, которых нет в русском, и повторяй слова с ними по 5 минут в день.'],
        ['Неделя 3 — шэдоуинг.', 'Один короткий отрывок в день, повтор вслед за записью и запись себя на телефон.'],
        ['Неделя 4 — живые фразы.', 'Проговаривай целые фразы, которые скажешь в реальной жизни, следя за ритмом и стыками слов.'],
      ]],
      ['h2', 'Три ошибки, которые тормозят прогресс'],
      ['x', [
        ['Читать про звуки вместо того, чтобы их говорить.', 'Произношение живёт во рту, а не в статьях.'],
        ['Тренировать отдельные слова.', 'Звучание меняется внутри фразы, поэтому учи фразы целиком.'],
        ['Стесняться своего голоса.', 'Чем тише ты говоришь, тем хуже прогресс. Говори громко — хотя бы дома.'],
      ]],
      ['link', `Хочешь слышать подсказки, где ты звучишь не так? ${DL('Скачай Phraseman')} — проверка произношения работает с первого урока.`],
    ],
    end: ['Произношение, которое понимают', 'Живые фразы с озвучкой носителей и проверкой твоего произношения прямо на телефоне. Без регистрации.'],
  },
  {
    g: GUIDES[5], h1: 'Весь мир начинается с «извините»', alt: 'Чемодан у входа в новый город', min: 7,
    blocks: [
      ['p', 'В поездке не нужна сложная грамматика и словарь на пять тысяч слов. Нужна горстка фраз, которые вылетают сами — пока чемодан едет по ленте, официант ждёт заказа, а трамвай вот-вот уйдёт. Мы собрали самые нужные по ситуациям — сразу на четырёх языках. Выбери свой, проговори вслух и сохрани перед вылетом.'],
      ['h2', 'Волшебные слова, с которых начинается всё'],
      ['phr', [
        ['Здравствуйте', '', 'Hola', 'Bonjour', 'Guten Tag', 'Hello'],
        ['Извините', '(чтобы привлечь внимание)', 'Perdone', 'Excusez-moi', 'Entschuldigung', 'Excuse me'],
        ['Пожалуйста / спасибо', '', 'Por favor / Gracias', 'S’il vous plaît / Merci', 'Bitte / Danke', 'Please / Thank you'],
        ['Я не понимаю', '', 'No entiendo', 'Je ne comprends pas', 'Ich verstehe nicht', 'I don’t understand'],
        ['Можно помедленнее?', '', '¿Más despacio, por favor?', 'Plus lentement, s’il vous plaît ?', 'Langsamer, bitte?', 'Slower, please?'],
      ]],
      ['tip', 'просто начни разговор с приветствия на местном языке. Даже если дальше перейдёшь на жесты — тебе улыбнутся совсем иначе.'],
      ['h2', 'В аэропорту'],
      ['phr', [
        ['Где регистрация?', '', '¿Dónde está la facturación?', 'Où est l’enregistrement ?', 'Wo ist der Check-in?', 'Where is check-in?'],
        ['Где выход номер…?', '', '¿Dónde está la puerta…?', 'Où est la porte… ?', 'Wo ist Gate…?', 'Where is gate…?'],
        ['Мой багаж не прилетел', '', 'Mi equipaje no ha llegado', 'Mes bagages ne sont pas arrivés', 'Mein Gepäck ist nicht angekommen', 'My luggage didn’t arrive'],
      ]],
      ['h2', 'В отеле'],
      ['phr', [
        ['У меня бронь на имя…', '', 'Tengo una reserva a nombre de…', 'J’ai une réservation au nom de…', 'Ich habe eine Reservierung auf den Namen…', 'I have a reservation under…'],
        ['Завтрак включён?', '', '¿El desayuno está incluido?', 'Le petit-déjeuner est compris ?', 'Ist das Frühstück inklusive?', 'Is breakfast included?'],
        ['Можно оставить здесь багаж?', '', '¿Puedo dejar aquí el equipaje?', 'Je peux laisser mes bagages ici ?', 'Kann ich mein Gepäck hier lassen?', 'Can I leave my luggage here?'],
      ]],
      ['cta', 'Возьми фразы с собой в телефоне', 'В Phraseman фразы озвучены носителями — можно послушать и повторить перед тем, как сказать вслух.', 'sound'],
      ['h2', 'В кафе и ресторане'],
      ['phr', [
        ['Столик на двоих, пожалуйста', '', 'Una mesa para dos, por favor', 'Une table pour deux, s’il vous plaît', 'Einen Tisch für zwei, bitte', 'A table for two, please'],
        ['Можно меню?', '', '¿Me trae la carta?', 'La carte, s’il vous plaît', 'Die Speisekarte, bitte', 'Could I see the menu?'],
        ['Мне вот это', '', 'Quiero esto', 'Je vais prendre ça', 'Ich nehme das', 'I’ll have this'],
        ['Счёт, пожалуйста', '', 'La cuenta, por favor', 'L’addition, s’il vous plaît', 'Die Rechnung, bitte', 'The bill, please'],
      ]],
      ['h2', 'На улице и в транспорте'],
      ['phr', [
        ['Как пройти к…?', '', '¿Cómo llego a…?', 'Comment aller à… ?', 'Wie komme ich zu…?', 'How do I get to…?'],
        ['Это далеко?', '', '¿Está lejos?', 'C’est loin ?', 'Ist das weit?', 'Is it far?'],
        ['Один билет до…', '', 'Un billete para…', 'Un billet pour…', 'Eine Fahrkarte nach…', 'One ticket to…'],
      ]],
      ['h2', 'Если что-то пошло не так'],
      ['phr', [
        ['Помогите, пожалуйста', '', 'Ayúdeme, por favor', 'Aidez-moi, s’il vous plaît', 'Helfen Sie mir, bitte', 'Please help me'],
        ['Я потерял(а) телефон', '', 'He perdido el móvil', 'J’ai perdu mon téléphone', 'Ich habe mein Handy verloren', 'I’ve lost my phone'],
        ['Где ближайшая аптека?', '', '¿Dónde está la farmacia más cercana?', 'Où est la pharmacie la plus proche ?', 'Wo ist die nächste Apotheke?', 'Where is the nearest pharmacy?'],
      ]],
      ['h2', 'Почему это нужно проговорить вслух заранее'],
      ['p', 'Фраза, которую ты только прочитал глазами, в нужный момент не всплывёт — особенно когда вокруг шумно, а за тобой очередь. Фраза, которую ты хотя бы пять раз сказал вслух, достаётся сама. Поэтому за неделю до поездки выдели по 10 минут в день и проговори свой набор. На месте ты удивишься, насколько спокойнее себя чувствуешь.'],
      ['link', `Хочешь больше фраз с озвучкой и тренировкой произношения? ${DL('Скачай Phraseman')} перед поездкой — первый урок займёт пару минут.`],
    ],
    end: ['Спокойная поездка начинается дома', 'Живые фразы для путешествий с озвучкой и проверкой произношения. Первый урок — сразу, без регистрации.'],
  },
];

const LANGS = [['es', 'ES'], ['fr', 'FR'], ['de', 'DE'], ['en', 'EN']];

function renderBlock(b, ctx) {
  const [k, a, c, d] = b;
  switch (k) {
    case 'p': return `<p>${a}</p>`;
    case 'h2': { ctx.n += 1; const id = `s${ctx.n}`; ctx.toc.push([id, a]); return `<h2 id="${id}">${a}</h2>`; }
    case 'h3': return `<h3>${a}</h3>`;
    case 'short': return `<div class="callout short"><span class="ov">Короткий ответ</span><p>${a}</p></div>`;
    case 'tip': return `<div class="callout tip"><span class="ov">Лайфхак</span><p>${a}</p></div>`;
    case 'cta': return `<aside class="gcta"><span class="tile">${ic(d || 'cards', 's18')}</span><div class="tx"><b>${a}</b><p>${c}</p></div>
      <a class="btn btn-primary btn-sm" href="download.html">Скачать и начать первый урок ${ic('arrow', 's16 arr')}</a></aside>`;
    case 'tl': return `<ul class="tl${c === 'num' ? ' num' : ''}">${a.map(([t, x]) => `<li><b>${t}</b><span>${x}</span></li>`).join('')}</ul>`;
    case 'x': return `<ul class="mk xs">${a.map(([t, x]) => `<li><i>${ic('x', 's16')}</i><div><b>${t}</b> ${x}</div></li>`).join('')}</ul>`;
    case 'ok': return `<ul class="mk oks">${a.map((t) => `<li><i>${ic('check', 's16')}</i><div>${t}</div></li>`).join('')}</ul>`;
    case 'link': return `<p class="endlink">${a}</p>`;
    case 'phr': return `<div class="phr">${a.map(([ru, note, ...tr]) => `<div class="row">
        <div class="ru"><b>${ru}</b>${note ? ` <span>${note}</span>` : ''}</div>
        <dl>${tr.map((t, i) => `<div><dt lang="${LANGS[i][0]}">${LANGS[i][1]}</dt><dd lang="${LANGS[i][0]}">${t}</dd></div>`).join('')}</dl>
      </div>`).join('')}</div>`;
    default: throw new Error(`[JOURNAL] неизвестный блок статьи: ${k}`);
  }
}

function articleBody(A) {
  const ctx = { n: 0, toc: [] };
  const prose = A.blocks.map((b) => renderBlock(b, ctx)).join('\n');
  return `
<div class="readbar" aria-hidden="true"><b id="readBar"></b></div>
<section class="ahead"><div class="wrap">
  <a class="back" href="guides.html">${ic('arrow', 's16')}Все материалы</a>
  <h1>${A.h1}</h1>
  <div class="meta-row"><span class="badge">Обновлено 26 сентября 2026</span><span class="badge">Команда Knowly</span><span class="badge">${ic('clock', 's16')}Чтение ~${A.min} минут</span></div>
  <figure class="cover"><img src="${IMG(A.g.img)}" alt="${A.alt}" width="1440" height="810" decoding="async"></figure>
</div></section>
<section class="abody"><div class="wrap doc-layout">
  <nav class="glass toc" aria-label="Разделы статьи">${ctx.toc.map(([id, t]) => `<a href="#${id}">${t}</a>`).join('')}</nav>
  <article class="prose">
${prose}
  </article>
</div></section>
<section class="block close"><div class="wrap">
  <div class="glass">
    <h2 class="h2" style="max-width:20ch">${A.end[0]}</h2>
    <p style="color:var(--sec);font-size:var(--t-l);max-width:46ch">${A.end[1]}</p>
    <a class="btn btn-primary" href="download.html">Скачать Phraseman бесплатно ${ic('arrow', 's18 arr')}</a>
  </div>
</div></section>`;
}

const articleCss = `
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
.readbar { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; pointer-events: none; }
.readbar b { display: block; height: 100%; background: linear-gradient(90deg, var(--g1), var(--fill)); transform-origin: left center; transform: scaleX(0); }
.ahead { padding-block: clamp(32px, 6vw, 72px) clamp(28px, 4vw, 48px); }
.ahead .wrap { display: grid; gap: 22px; justify-items: start; }
.back { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px 0 12px; border-radius: 999px; background: var(--control); color: var(--sec); font-weight: 600; font-size: 14px; transition: color 160ms, transform 240ms var(--spring); }
.back svg { transform: rotate(180deg); transition: transform 240ms var(--ease); }
.back:hover { color: var(--text); }
.back:hover svg { transform: rotate(180deg) translateX(3px); }
.back:active { transform: scale(.97); }
.ahead h1 { font-size: clamp(34px, 5.4vw, 68px); line-height: 1.04; letter-spacing: -.04em; max-width: 20ch; text-wrap: balance; }
.meta-row .badge { color: var(--sec); font-weight: 600; height: 30px; padding: 0 12px; }
.cover { margin: 14px 0 0; width: 100%; aspect-ratio: 21 / 9; border-radius: 30px; overflow: hidden; background: var(--tile); box-shadow: var(--shadow); position: relative; }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(.88); }
.cover::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px var(--edge); pointer-events: none; }
.abody { padding-bottom: 8px; }
.toc a { display: block; }
.prose h3 { letter-spacing: -.01em; }
.prose .callout p { margin: 0; }
.callout.short { background: color-mix(in srgb, var(--fill) 10%, var(--card)); }
.callout.short .ov, .callout.tip .ov { color: var(--fill); }
.gcta { margin: 32px 0; padding: 22px; border-radius: 24px; background: var(--card); border: 1px solid var(--edge); box-shadow: var(--shadow);
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 14px 16px; align-items: start; }
.gcta .tile { color: var(--fill); }
.gcta b { display: block; font-size: 19px; line-height: 1.3; letter-spacing: -.01em; color: var(--text); }
.gcta p { margin: 4px 0 0 !important; color: var(--sec) !important; font-size: 15px; line-height: 1.55; }
.gcta .btn { grid-column: 2; justify-self: start; }
.tl { list-style: none; padding: 0 !important; margin: 20px 0 !important; gap: 0 !important; border-radius: 20px; background: var(--card); border: 1px solid var(--edge); overflow: hidden; counter-reset: tl; }
.tl li { display: grid; grid-template-columns: minmax(0, 15em) minmax(0, 1fr); gap: 6px 20px; padding: 16px 20px; font-size: 16px; line-height: 1.55; position: relative; }
.tl li + li { border-top: 1px solid var(--track); }
.tl b { color: var(--text); font-weight: 700; }
.tl span { color: var(--sec); }
.tl.num li { grid-template-columns: 30px minmax(0, 15em) minmax(0, 1fr); }
.tl.num li::before { counter-increment: tl; content: counter(tl); width: 30px; height: 30px; border-radius: 9px; background: var(--tile); display: grid; place-items: center; font-weight: 800; font-size: 14px; color: var(--text); font-variant-numeric: tabular-nums; }
.mk { list-style: none; padding: 0 !important; gap: 12px !important; }
.mk li { display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 14px; align-items: start; }
.mk i { width: 30px; height: 30px; border-radius: 9px; background: var(--tile); display: grid; place-items: center; margin-top: 1px; }
.mk.xs i { color: var(--sec); }
.mk.oks i { color: var(--fill); }
.mk b { color: var(--text); }
.endlink { margin-top: 28px !important; padding-top: 22px; border-top: 1px solid var(--track); color: var(--sec) !important; }
.phr { margin: 18px 0 22px; border-radius: 20px; background: var(--card); border: 1px solid var(--edge); overflow: hidden; }
.phr .row { display: grid; grid-template-columns: minmax(0, 13em) minmax(0, 1fr); gap: 10px 20px; padding: 16px 20px; align-items: start; }
.phr .row + .row { border-top: 1px solid var(--track); }
.phr .ru b { color: var(--text); font-size: 16px; line-height: 1.4; }
.phr .ru span { color: var(--muted); font-size: 14px; }
.phr dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.phr dl div { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 8px; align-items: baseline; }
.phr dt { font-size: 11px; font-weight: 800; letter-spacing: .08em; color: var(--muted); }
.phr dd { margin: 0; font-size: 15px; line-height: 1.45; color: color-mix(in srgb, var(--text) 82%, var(--sec)); overflow-wrap: anywhere; }
@media (max-width: 980px) {
  .toc { display: none; }
  .cover { aspect-ratio: 16 / 10; border-radius: 24px; }
}
@media (max-width: 640px) {
  .tl li, .tl.num li, .phr .row { grid-template-columns: minmax(0, 1fr); }
  .tl.num li { grid-template-columns: 30px minmax(0, 1fr); }
  .tl.num li span { grid-column: 2; }
  .phr dl { grid-template-columns: minmax(0, 1fr); }
  .gcta { grid-template-columns: minmax(0, 1fr); }
  .gcta .btn { grid-column: 1; width: 100%; }
  .prose { font-size: 16px; }
}
`;

// зачем: оглавление подсвечивает текущий раздел при прокрутке, полоса сверху показывает прочитанное.
const articleJs = `
(function () {
  var links = [].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var bar = document.getElementById('readBar');
  var art = document.querySelector('.prose');
  if (!art) { console.warn('[ARTICLE] нет текста статьи — подсветка и полоса выключены'); return; }
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  var current = '';
  function mark(id, why) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) { var on = a.getAttribute('href') === '#' + id; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    console.log('[ARTICLE] активный раздел:', id || '(начало)', 'причина:', why);
  }
  if ('IntersectionObserver' in window && heads.length) {
    var seen = {};
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
      var top = heads.filter(function (h) { return seen[h.id]; })[0];
      if (top) { mark(top.id, 'заголовок в зоне чтения'); return; }
      // ни одного заголовка в зоне: активен последний, который уже ушёл вверх
      var passed = heads.filter(function (h) { return h.getBoundingClientRect().top < 120; });
      mark(passed.length ? passed[passed.length - 1].id : '', 'между заголовками');
    }, { rootMargin: '-96px 0px -62% 0px' });
    heads.forEach(function (h) { io.observe(h); });
  } else { console.warn('[ARTICLE] IntersectionObserver недоступен или нет заголовков:', heads.length); }
  var raf = 0;
  function progress() {
    raf = 0;
    if (!bar) return;
    var r = art.getBoundingClientRect();
    var total = r.height - innerHeight * .6;
    var p = total > 0 ? Math.min(1, Math.max(0, (innerHeight * .35 - r.top) / total)) : 1;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(progress); }, { passive: true });
  addEventListener('resize', progress);
  progress();
})();`;

const articlePages = ARTICLES.map((A) => ({
  file: A.g.file,
  title: A.h1,
  group: 'Журнал',
  path: A.g.path,
  body: articleBody(A),
  css: articleCss,
  js: articleJs,
}));

/* ---------------- служебные bare-страницы ---------------- */
// зачем: на живом сайте эти страницы «голые» — без шапки и подвала сайта. Оболочка макета их добавляет,
// поэтому прячем их стилями страницы; тема всё равно берётся из памяти (выбирается на любой другой странице).
const bareCss = `
header.top, footer, .theme-pop, .mnav { display: none !important; }
.states { top: 12px; margin-top: 12px; }
.bare { min-height: calc(100vh - 80px); min-height: calc(100svh - 80px); display: grid; place-items: center; padding: 32px 16px 48px; }
.bcard { width: min(440px, 100%); padding: clamp(26px, 6vw, 36px); border-radius: 30px; display: grid; gap: 16px; }
.bcard.center { justify-items: center; text-align: center; }
.bcard h1 { font-size: clamp(28px, 6vw, 34px); line-height: 1.12; letter-spacing: -.03em; }
.bcard > p { color: var(--sec); font-size: 16px; line-height: 1.5; }
.bcard .acts { display: grid; gap: 10px; margin-top: 4px; }
.bcard .acts .btn { width: 100%; }
.bcard .hint { font-size: 14px; line-height: 1.5; color: var(--sec); }
.bcard .code { margin: 4px 0; padding: 18px 16px; border-radius: 18px; background: var(--tile); text-align: center; font-size: 26px; font-weight: 800; letter-spacing: .2em; font-variant-numeric: tabular-nums; color: var(--text); overflow-wrap: anywhere; }
.bcard .bigspin { width: 44px; height: 44px; border-width: 3px; }
.go { height: 4px; border-radius: 2px; background: var(--track); overflow: hidden; }
.go b { display: block; height: 100%; width: 100%; background: var(--fill); transform-origin: left center; animation: goFill 1800ms linear infinite; }
@keyframes goFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.inl { color: var(--fill); font-weight: 700; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .go b { animation: none; transform: scaleX(.6); } }
`;

const PLAY = 'https://play.google.com/store/apps/details?id=app.phraseman';
const PLAY_REF = `${PLAY}&amp;referrer=ref%3DPHR4X7K2`;
const IOS = 'https://apps.apple.com/app/id6764800879';
const INSTALL_H = 'Установи Phraseman';
const INSTALL_P = 'Это приглашение для нового пользователя. 7 дней доступа начисляются только если человек установит Phraseman впервые.';
const OPEN_APP = `<a class="btn btn-ghost" href="phraseman://invite?ref=PHR4X7K2">Открыть в Phraseman</a>`;

const inviteBody = `
<div data-state="redirect"><div class="bare"><div class="glass bcard">
  <h1>${INSTALL_H}</h1>
  <p>${INSTALL_P}</p>
  <div class="go" role="progressbar" aria-label="Переход в Google Play"><b></b></div>
  <div class="acts"><a class="btn btn-primary" href="${PLAY}">${ic('play', 's18')}Установить из Google Play</a></div>
  <p class="hint">На Android Google Play передаст код приглашения автоматически. На iOS после установки скопируй или введи код вручную.</p>
</div></div></div>

<div data-state="code"><div class="bare"><div class="glass bcard">
  <h1>${INSTALL_H}</h1>
  <p>${INSTALL_P}</p>
  <div class="code" aria-label="Код приглашения">PHR4X7K2</div>
  <div class="acts"><a class="btn btn-primary" href="${IOS}">${ic('apple', 's18')}Установить из App Store</a>${OPEN_APP}</div>
  <p class="hint">При установке мы скопируем приглашение. После установки открой Phraseman и разреши вставку — код применится сам. Или введи код вручную: Друзья → «Ввести код».</p>
</div></div></div>

<div data-state="android"><div class="bare"><div class="glass bcard">
  <h1>${INSTALL_H}</h1>
  <p>${INSTALL_P}</p>
  <div class="code" aria-label="Код приглашения">PHR4X7K2</div>
  <div class="acts"><a class="btn btn-primary" href="${PLAY_REF}">${ic('play', 's18')}Установить из Google Play</a>${OPEN_APP}</div>
  <p class="hint">На Android ссылка установки сама переносит код приглашения через Google Play.</p>
</div></div></div>

<div data-state="open"><div class="bare"><div class="glass bcard">
  <h1>Открыть Phraseman</h1>
  <p>Открываем приглашение в приложении. Если ничего не произошло — установи Phraseman и вернись на эту страницу.</p>
  <div class="acts"><a class="btn btn-primary" href="${PLAY}">Установить Phraseman</a>${OPEN_APP}</div>
  <p class="hint">После установки нажми «Открыть в Phraseman» ещё раз, чтобы применился код приглашения.</p>
</div></div></div>`;

const duelBody = `
<div class="bare"><div class="glass bcard center">
  <div class="spinner bigspin" aria-hidden="true"></div>
  <p lang="en">This legacy link is no longer available. <a class="inl" href="download.html">Continue to Phraseman</a>.</p>
</div></div>`;

const appleBody = `
<div data-state="opening"><div class="bare"><div class="glass bcard center" lang="en">
  <div class="spinner bigspin" aria-hidden="true"></div>
  <h1>Opening PhraseMan...</h1>
</div></div></div>
<div data-state="fallback"><div class="bare"><div class="glass bcard center" lang="en">
  <h1>Opening PhraseMan...</h1>
  <p>If nothing happens, tap the link below.</p>
  <div class="acts" style="width:100%"><a class="btn btn-primary" href="phraseman://apple-auth">Open app ${ic('out', 's18')}</a></div>
</div></div></div>`;

export default [
  {
    file: 'guides.html',
    title: 'Журнал',
    group: 'Журнал',
    path: '/guides/',
    body: hubBody,
    css: hubCss,
    js: hubJs,
    states: [['all', 'Все материалы'], ['method', 'Как учиться'], ['talk', 'Как говорить'], ['travel', 'В поездке'], ['empty', 'Пусто']],
  },
  ...articlePages,
  {
    file: 'invite.html',
    title: 'Приглашение в Phraseman',
    group: 'Служебные',
    path: '/phraseman/invite/',
    body: inviteBody,
    css: bareCss,
    states: [['redirect', 'Без кода · переход в стор'], ['code', 'Код · iOS'], ['android', 'Код · Android'], ['open', 'Открыть в Phraseman']],
  },
  {
    file: 'duel.html',
    title: 'Дуэль (старая ссылка)',
    group: 'Служебные',
    path: '/phraseman/duel/',
    body: duelBody,
    css: bareCss,
  },
  {
    file: 'apple-auth.html',
    title: 'Вход через Apple',
    group: 'Служебные',
    path: '/phraseman/apple-auth/',
    body: appleBody,
    css: bareCss,
    states: [['opening', 'Открываем'], ['fallback', 'Ссылка, если не открылось']],
  },
];
