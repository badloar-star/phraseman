const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, '../app/Урок 1 карточки.txt');
const outPath = path.join(__dirname, '../app/lesson_cards_data.ts');

const raw = fs.readFileSync(txtPath, 'utf8');

// Fix embedded headers (not preceded by newline) before splitting
const fixed = raw.replace(/((?<!\n))(### \d+\.)/g, '\n$2');

// Split on ### N. heading
const blocks = fixed.split(/\n(?=### \d+\.)/).filter(b => b.trim().startsWith('###'));
console.log(`Total blocks: ${blocks.length}`);

function extract(block, label) {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`);
  const match = block.match(regex);
  if (!match) return { ru: '', uk: '' };
  const section = match[1];
  const ruMatch = section.match(/RU:\s*(.+)/);
  const ukMatch = section.match(/UK:\s*(.+)/);
  return {
    ru: ruMatch ? ruMatch[1].trim() : '',
    uk: ukMatch ? ukMatch[1].trim() : '',
  };
}

function makeCard(block) {
  const correct = extract(block, 'Правильно');
  const wrong = extract(block, 'Неправильно');
  const secret = extract(block, 'Секрет');
  return {
    correctRu: correct.ru,
    correctUk: correct.uk,
    wrongRu: wrong.ru,
    wrongUk: wrong.uk,
    secretRu: secret.ru,
    secretUk: secret.uk,
  };
}

// Explicit lesson boundaries in the txt file
// Lesson 6 has only 40 blocks (phrases 1-30 then 41-50; missing 31-40)
const LESSON_BOUNDARIES = [
  { lesson: 1, start: 0,   end: 49,  phraseMap: null }, // phrases 1-50
  { lesson: 2, start: 50,  end: 99,  phraseMap: null },
  { lesson: 3, start: 100, end: 149, phraseMap: null },
  { lesson: 4, start: 150, end: 199, phraseMap: null },
  { lesson: 5, start: 200, end: 249, phraseMap: null },
  // Lesson 6: 40 blocks - cards 1-30 = phrases 1-30, cards 31-40 = phrases 41-50
  { lesson: 6, start: 250, end: 289, phraseMap: (cardIdx) => cardIdx <= 30 ? cardIdx : cardIdx + 10 },
  { lesson: 7, start: 290, end: 339, phraseMap: null },
  { lesson: 8, start: 340, end: 389, phraseMap: null },
];

const lessons = {};

LESSON_BOUNDARIES.forEach(({ lesson, start, end, phraseMap }) => {
  lessons[lesson] = {};
  for (let i = start; i <= end; i++) {
    const cardIdx = i - start + 1; // 1-based card index within lesson
    const phraseNum = phraseMap ? phraseMap(cardIdx) : cardIdx;
    const block = blocks[i];
    if (!block) { console.warn(`Missing block at index ${i}`); continue; }
    lessons[lesson][phraseNum] = makeCard(block);
  }
  console.log(`Lesson ${lesson}: ${Object.keys(lessons[lesson]).length} cards from txt`);
});

// Missing lesson 6 phrases 31-40 (WH-questions middle section)
const lesson6Missing = {
  31: {
    correctRu: "Прекрасный вопрос для гостеприимного хозяина. В начале предложения стоит вопросительное слово Where, за которым следует помощник do, чтобы вопрос звучал грамматически верно.",
    correctUk: "Чудове запитання для гостинного господаря. На початку речення стоїть питальне слово Where, за яким іде помічник do, щоб запитання звучало граматично правильно.",
    wrongRu: "Структура вопроса строится так: сначала вопросительное слово (Where), затем вспомогательный глагол (do), действующие лица (we), само действие (meet) и объект (guests).",
    wrongUk: "Структура запитання будується так: спочатку питальне слово (Where), потім допоміжне дієслово (do), дійові особи (we), сама дія (meet) і об'єкт (guests).",
    secretRu: "Слово guest (гость) имеет общие корни со словом host (хозяин). В древности эти понятия были тесно связаны священными узами гостеприимства.",
    secretUk: "Слово guest (гість) має спільні корені зі словом host (господар). У давнину ці поняття були тісно пов'язані священними узами гостинності.",
  },
  32: {
    correctRu: "Кулинарные предпочтения — отличная тема. Здесь слово-помощник does забирает на себя всё внимание, потому что мы говорим о «ней» (she).",
    correctUk: "Кулінарні вподобання — чудова тема. Тут слово-помічник does забирає на себе всю увагу, тому що ми говоримо про «неї» (she).",
    wrongRu: "Схема вопроса проста: вопросительное слово (What), помощник (does), персонаж (she), наречие частоты (usually) и само действие (cook).",
    wrongUk: "Схема запитання проста: питальне слово (What), помічник (does), персонаж (she), прислівник частоти (usually) і сама дія (cook).",
    secretRu: "Слово cook может быть и глаголом «готовить», и существительным «повар». А вот слово cooker в английском — это кухонная плита, а не человек.",
    secretUk: "Слово cook може бути і дієсловом «готувати», і іменником «кухар». А ось слово cooker в англійській — це кухонна плита, а не людина.",
  },
  33: {
    correctRu: "Взаимовыручка — это важно. В этой фразе глагол ask объединяется с предлогом for, чтобы получилось точное выражение «просить о чем-то».",
    correctUk: "Взаємодопомога — це важливо. У цій фразі дієслово ask об'єднується з прийменником for, щоб вийшов точний вислів «просити про щось».",
    wrongRu: "Логика построения такова: вопросительное слово (Why), вспомогательный глагол (do), группа людей (they) и их действие с дополнением (ask for help).",
    wrongUk: "Логіка побудови така: питальне слово (Why), допоміжне дієслово (do), група людей (they) та їхня дія з додатком (ask for help).",
    secretRu: "Фраза ask for help — это самый вежливый и прямой способ привлечь внимание к проблеме в англоязычной среде.",
    secretUk: "Фраза ask for help — це найбільш ввічливий і прямий спосіб привернути увагу до проблеми в англомовному середовищі.",
  },
  34: {
    correctRu: "Порядок в делах начинается с вопросов. Помощник does здесь верно сопровождает главного героя (he), указывая на настоящее время.",
    correctUk: "Порядок у справах починається із запитань. Помічник does тут правильно супроводжує головного героя (he), вказуючи на теперішній час.",
    wrongRu: "Структура этого вопроса: время (When), помощник для третьего лица (does), персонаж (he) и само действие (check mail).",
    wrongUk: "Структура цього запитання: час (When), помічник для третьої особи (does), персонаж (he) і сама дія (check mail).",
    secretRu: "Слово mail пришло из старофранцузского языка и изначально означало «сумка» или «кошелек», в которых перевозили письма.",
    secretUk: "Слово mail прийшло зі старофранцузької мови і спочатку означало «сумка» або «гаманець», у яких перевозили листи.",
  },
  35: {
    correctRu: "Интерес к мнению собеседника всегда ценен. Вы верно использовали помощник do для обращения на «ты» (you).",
    correctUk: "Інтерес до думки співрозмовника завжди цінний. Ви правильно використали помічник do для звернення на «ти» (you).",
    wrongRu: "Порядок слов в вопросе: как (How), вспомогательный глагол (do), вы (you), находите (find) и объект (it).",
    wrongUk: "Порядок слів у запитанні: як (How), допоміжне дієслово (do), ви (you), знаходите (find) і об'єкт (it).",
    secretRu: "Фраза How do you find it? часто используется не в прямом смысле «как ты это ищешь», а в значении «какое твоё мнение об этом?».",
    secretUk: "Фраза How do you find it? часто використовується не в прямому сенсі «як ти це шукаєш», а в значенні «яка твоя думка про це?».",
  },
  36: {
    correctRu: "Стиль — это способ самовыражения. Наречие usually (обычно) занимает своё место перед основным действием, придавая фразе ритм.",
    correctUk: "Стиль — це спосіб самовираження. Прислівник usually (зазвичай) займає своє місце перед основною дією, додаючи фразі ритму.",
    wrongRu: "Схема построения: вопросительное слово (What), помощник (do), личность (you), частота действия (usually) и сам глагол (wear).",
    wrongUk: "Схема побудови: питальне слово (What), помічник (do), особистість (you), частота дії (usually) і саме дієслово (wear).",
    secretRu: "Слово wear относится не только к одежде, но и к аксессуарам, духам и даже выражению лица (wear a smile).",
    secretUk: "Слово wear стосується не лише одягу, а й аксесуарів, парфумів і навіть виразу обличчя (wear a smile).",
  },
  37: {
    correctRu: "Хозяйственный подход. Снова помощник does берет на себя грамматическую нагрузку, потому что мы спрашиваем про «него» (he).",
    correctUk: "Господарський підхід. Знову помічник does бере на себе граматичне навантаження, тому що ми запитуємо про «нього» (he).",
    wrongRu: "Формула вопроса: место (Where), помощник (does), персонаж (he), покупка (buy) и предмет (groceries).",
    wrongUk: "Формула запитання: місце (Where), помічник (does), персонаж (he), покупка (buy) і предмет (groceries).",
    secretRu: "Слово groceries (продукты) происходит от старинного понятия gross (большой объем), так как раньше товары продавали крупными партиями.",
    secretUk: "Слово groceries (продукти) походить від старовинного поняття gross (великий обсяг), оскільки раніше товари продавали великими партіями.",
  },
  38: {
    correctRu: "Готовность к действию — это здорово. Вопросительное How открывает путь к инструкции, а do связывает «нас» с действием.",
    correctUk: "Готовність до дії — це чудово. Питальне How відкриває шлях до інструкції, а do пов'язує «нас» із дією.",
    wrongRu: "Цепочка вопроса: метод (How), вспомогательный глагол (do), действующие лица (we), бронирование (book) и объект (it).",
    wrongUk: "Ланцюжок запитання: метод (How), допоміжне дієслово (do), дійові особи (we), бронювання (book) і об'єкт (it).",
    secretRu: "Глагол book (бронировать) универсален: можно забронировать столик, отель, билет или даже время для встречи.",
    secretUk: "Дієслово book (бронювати) універсальне: можна забронювати столик, готель, квиток або навіть час для зустрічі.",
  },
  39: {
    correctRu: "Внимательное наблюдение. Помощник does верно подчеркивает характер действия для третьего лица (she) в настоящем времени.",
    correctUk: "Уважне спостереження. Помічник does правильно підкреслює характер дії для третьої особи (she) у теперішньому часі.",
    wrongRu: "Мы строим фразу так: причина (Why), помощник (does), героиня (she), речь (speak) и описание темпа (slowly).",
    wrongUk: "Ми будуємо фразу так: причина (Why), помічник (does), героїня (she), мова (speak) і опис темпу (slowly).",
    secretRu: "Наречие slowly (медленно) образовано от прилагательного slow с помощью суффикса ly. Это самый частый способ превратить «какой» в «как».",
    secretUk: "Прислівник slowly (повільно) утворений від прикметника slow за допомогою суфікса ly. Це найчастіший спосіб перетворити «який» на «як».",
  },
  40: {
    correctRu: "Планирование — ключ к успеху. Для группы людей (they) мы используем помощник do, что делает вопрос грамматически точным.",
    correctUk: "Планування — ключ до успіху. Для групи людей (they) ми використовуємо помічник do, що робить запитання граматично точним.",
    wrongRu: "Логическая формула: время (When), вспомогательный глагол (do), исполнители (they), начало (start) и само событие (the meeting).",
    wrongUk: "Логічна формула: час (When), допоміжне дієслово (do), виконавці (they), початок (start) і сама подія (the meeting).",
    secretRu: "Слово meeting означает не только скучное собрание, но и любую случайную встречу двух людей (от глагола to meet).",
    secretUk: "Слово meeting означає не лише нудні збори, а й будь-яку випадкову зустріч двох людей (від дієслова to meet).",
  },
};

// Inject missing lesson 6 phrases 31-40
Object.keys(lesson6Missing).forEach(k => {
  lessons[6][+k] = lesson6Missing[k];
});
console.log(`Lesson 6 after injection: ${Object.keys(lessons[6]).length} cards`);

// Verify all lessons have 50 cards
Object.keys(lessons).forEach(l => {
  const count = Object.keys(lessons[l]).length;
  if (count !== 50) console.warn(`WARNING: Lesson ${l} has ${count} cards (expected 50)`);
  else console.log(`Lesson ${l}: 50 cards ✓`);
});

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

let ts = `// Auto-generated from Урок 1 карточки.txt
// DO NOT EDIT MANUALLY

export interface PhraseCard {
  correctRu: string;
  correctUk: string;
  wrongRu: string;
  wrongUk: string;
  secretRu: string;
  secretUk: string;
}

// lessonCards[lessonId][phraseIndex_1based]
export const lessonCards: Record<number, Record<number, PhraseCard>> = {\n`;

Object.keys(lessons).sort((a,b) => +a - +b).forEach(lessonKey => {
  ts += `  ${lessonKey}: {\n`;
  const lesson = lessons[lessonKey];
  Object.keys(lesson).sort((a,b) => +a - +b).forEach(phraseKey => {
    const c = lesson[phraseKey];
    ts += `    ${phraseKey}: {\n`;
    ts += `      correctRu: "${esc(c.correctRu)}",\n`;
    ts += `      correctUk: "${esc(c.correctUk)}",\n`;
    ts += `      wrongRu: "${esc(c.wrongRu)}",\n`;
    ts += `      wrongUk: "${esc(c.wrongUk)}",\n`;
    ts += `      secretRu: "${esc(c.secretRu)}",\n`;
    ts += `      secretUk: "${esc(c.secretUk)}"\n`;
    ts += `    },\n`;
  });
  ts += `  },\n`;
});

ts += `};\n\nexport function getPhraseCard(lessonId: number, phraseIndex: number): PhraseCard | null {\n  return lessonCards[lessonId]?.[phraseIndex] ?? null;\n}\n`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log(`\nWritten to ${outPath}`);
