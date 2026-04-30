/**
 * PROMPT-014: regenerates contrastive phrase feedback cards from LESSON_DATA.
 * Модель текста: PROMPT-001 — целевой EN на экране; подсказки RU/UK/ES; локаль es использует *Es.
 * Запуск из корня репозитория: npx tsx scripts/gen-prompt014-lesson-cards.ts
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { LESSON_DATA } from '../app/lesson_data_all';
import type { LessonPhrase } from '../app/lesson_data_types';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT_DIR = join(ROOT, 'app', 'lesson_cards');
const OUT_FILE = join(OUT_DIR, 'lessonCards.generated.ts');
const MAX = 900;

type L3 = readonly [ru: string, uk: string, es: string];

const HUB: Record<number, L3> = {
  1: [
    'Каркас урока: местоимение + форма be + остаток (в русском связка часто опускается — в этой тренировке EN она обязательна).',
    'Каркас уроку: займенник + форма be + решта (UA може опускати «є» — тут EN тримає зв’язку).',
    'Eje central: sujeto pronombre + copulativa «be» + predicado. En español a veces omites el verbo finito claro; aquí el inglés sí lo exige en el patrón libro.',
  ],
  2: [
    'Отрицание и вопрос вертятся вокруг be/not и инверсии; не добавляй второй вспомогательный do, как к лексическому глаголу.',
    'Заперечення/питання з be: not і інверсія; не вставляй «do» другим шаром навколо be.',
    'Negación/interrogación modelo «be»: no insertes «do/does» antes de la copula en el patrón de este bloque.',
  ],
  3: [
    'Present Simple: финитный глагол с -s только у he/she/it;',
    'Present Simple: -s лише на 3-й однині; решта без нього;',
    'Marcador -s 3ª persona del singular con verbo lexical; no lo arrastres a otros sujetos.',
  ],
  4: [
    'Отрицание с do: don\'t/doesn\'t + инфинитив без to и без «лишнего» -s на основном глаголе.',
    'Заперечення з do: don\'t/doesn\'t + основа без -s після doesn\'t.',
    'Negación con «do»: la base verbal lleva sin marca de 3ª persona tras «doesn\'t».',
  ],
  5: [
    'Общий вопрос: Do/Does перед подлежащим + инфинитив без to.',
    'Загальне питання: Do/Does перед підметом.',
    '«Do/Does» + sujeto + base verbal; orden fijo enunciación clara.',
  ],
  6: [
    'WH-вопросы: маркер + do/does + S + V (база), без лишнего «вспомогательного» на конце.',
    'WH: маркер + do/does + S + основа.',
    'Interrogativos completos: marca + auxiliar + orden SVO libro.',
  ],
  7: [
    'Have/has кодируют «иметь/обладать» своей формой без русской связки «есть» между подлежащим и объектом.',
    'Have/has: не калькуй дослівно «мені є» у придаткові EN.',
    'Predicación posesión inglés compacta sin copulativa española intermedia gratuita.',
  ],
  8: [
    'Время на английском: at точка момента; in период/объём; on день/дата календаря.',
    'Часові at/in/on за узгодженими з інтро зразками.',
    'Preposiciones tiempo EN no traduzcas todas con español «en»;',
  ],
  9: [
    'There is / are задаёт экспозицию: сингулар после is; множественное после are;',
    'There is/are: однина/множина строго з існуючими зразками;',
    '«There is / there are» marca existencia paralela a español «hay», pero plural inglés marcado;',
  ],
  10: [
    'После can — инфинитив голый; паттерн модальности блокирует второй маркер to перед основным глаголом.',
    'Can + інфінітив без to.',
    'Tras «can» base verbal; no construyas «can to»;',
  ],
  11: [
    'Регулярное прошедшее через -ed: проверь удвоение согласной и y→ied.',
    'Регулярне -ed із правилами подвоєння та ie.',
    'Pasado regular -ed con reglas ortográficas internas.',
  ],
  12: [
    'Past Simple irregular: каждая пара своя;',
    'Неправильні форми — індивідуально;',
    'Verbos irregulares: parejas fijas; prohibido *-ed mecánico;',
  ],
  13: [
    'Будущее will в этом блоке: will + голый инфинитив (без to между will и verb).',
    'Will + інфінітив без to.',
    '«Will» + base; marcador español futuro lexical no debe colarse entre «will» y el verbo inglés;',
  ],
  14: [
    'Сравнительные паттерны: than / самый / -er точно там, где в учебном примере;',
    'Порівняння: than / най- / er за зразком.',
    'Comparativos EN marca libro; orden adjetivos comparación estable en input;',
  ],
  15: [
    'Притяжательные и \'s ставятся согласно контракту «чей предмет»: не смешивай двойные маркеры.',
    'Присвійність EN перед іменником или \'s на зразку.',
    'Posesivos y «\'s» en patrón anglosajón libro;',
  ],
  16: [
    'Фразовый глагол — единый коллокат; сохранение частицы после глагола там, где в учебном примере.',
    'Фразові кліши зберігають частку / порядок з займенником.',
    'Phrasal verbs: objeto pronominal y partícula según muestra inglés paralela;',
  ],
  17: [
    'Present Continuous: связка am/is/are + -ing действия;',
    'Progressive: am/is/are + -ing;',
    'Progresiva marca «be -ing»; no pongas lexical simple donde el libro pide progresiva;',
  ],
  18: [
    'Приказ англ.: позитив — базовая форма без to; следи за/you и отсутствием лишней инверсии.',
    'Наказ: основа без to; не став «to» з іспано-лат. привички.',
    'Imperativo EN clase libro: forma base;',
  ],
  19: [
    'Предлоги места: at/in/on — не русское универсальное «на»;',
    'Місцеві преп\'єдні за EN зразком, не універсальне «на»;',
    'Preposiciones lugar marcadas libro;',
  ],
  20: [
    'Артикуляция countable/uncountable + звуковые правила a/an;',
    'a/an/the за узгодженістю із зразками.',
    'Artículación EN marca input;',
  ],
  21: [
    'Some/any/кванторы данного блока следуют полярности утверждения или типа запроса в примере;',
    'Some/any за полярністю речень уроку.', 
    'Cuantificación EN polaridad libro;',
  ],
  22: [
    'Герундий там, где последующее обучение требует -ing после «ректор-глагола» примера.',
    '-ing там, де зразок вимагає, а не простий інфінітив;',
    '-ing marca gerund inglés libro;',
  ],
  23: [
    'Пассив: связка времени по данным + участие + by при необходимости;',
    'Пасив: форма книжкового зразка із by.',
    'Voz pasiva «be + participio» libro;',
  ],
  24: [
    'Present Perfect как в примерах: have/has + V3; не подменять простым прошедшим там, где в паре упражняется результат;',
    'PP: have/has + третя форма в контекстах уроку.',
    'Marcador resultado actual inglés libro;',
  ],
  25: [
    'Past Continuous: было/были и -ing процесса; не упрощай до простого прошедшего в фонах.',
    'Past Continuous із was/were + -ing за зразком.',
    'Pasado «was/were -ing» proceso largo libro;',
  ],
  26: [
    'Условное предложение: соблюдай сочетание if-clause / main как в упражняемых линейках данных;',
    'Умовний конструктор if урок за зразком.',
    'Condicionales par cláusal libro;',
  ],
  27: [
    'Косвенная речь: сдвигаем указатели времени и местоимений по блоку данных;',
    'Непряма мова: зсув місць/особ за уроком.',
    'Indirect speech backshift libro;',
  ],
  28: [
    'Reflexivos -self должны резонировать с подлежащим;',
    '-self узгоджуй з особою підмета.',
    'Reflexivos EN posición pronominal clase libro;',
  ],
  29: [
    'Used to описывает «раньше обычно»; модель блока исключает present simple здесь;',
    'Used to минулої звички; не став теперішню форму там, де модель минула.',
    '«Used to + base»: hábito pasado libro;',
  ],
  30: [
    'Ограничительные/нередуцированные relative по примерам (who/which/that …); запятые там, где в образце;',
    'Відносні речення: who/which/that із комами лише як у даних.',
    'Relativas ingles libro;',
  ],
  31: [
    'Сложное дополнение: объект + неинфинитив или to-inf по данному глаголу-управлению;',
    'Складний додаток: патерн дієслова управління з уроку.',
    'Estructuras «tell/allow/watch …» libro;',
  ],
  32: [
    'Репaso: перед сборкой найди главный финитный маркер упражняемого типа;',
    'Повторення: пам’ятай про головний фінітний маркер типу патерну.',
    'Repaso paralelo ELE: identifica verbo lexical vs modal vs copulative antes de ejecutar español‑puente;',
  ],
};

const ROT_TRAPS: L3[] = [
  ['Ловушка RU→EN: свобода порядка слов русского не переносится в жесткий английский SVO упражняемых фраз.', 'Пастка UK→EN: вільність порядку UA не є дзеркалом жорсткого SVO EN.', 'Trampa ES→EN: orden libre español no sustituye SVO libro inglés entrada.'],
  ['Ловушка: русское «активнее» добавлять «это есть» между существительными — в многих EN моделях лишнее.', 'Пастка україномовна: надлишкова « є » між членами там, де EN економить зв’язку.', 'Trampa léxicast: calco predicativo español con copula extra inglés donde el input no marca.'],
  ['Ловушка: смешение «much/many», «few/little», «a little/a few» там, где в примере стоит уже выбранный квантор.', 'Пастка: кількісні маркеры many/much узгоджуй з множ.-одн.', 'Trampa masa/cantidad much/many libro EN.'],
  ['Ловушка: ставить второй финитный маркер (did + V2 + -ed) типичное перегружение русскоязычного переноса.', 'Подвійний фініт: did + друга множина маркерів недопустимі як у простому Past.', 'Marca doble marcador verbal inglés libro; revisa ejemplo.'],
  ['Ловушка UK: русский падеж имени может «держать» глагол в середине предложения — EN держит V ближе к своему вспомогательному паттерну.', 'Пастка падежу UA не задає місце англійського V у середню «кишеню» між іменами.', 'Trampa flexión nominal española no mueve verbo inglés lejos de auxiliar libro.'],
  ['Ловушка: русское «давно» ↔ for/since переводится тонко; не смешивай PP и Past Continuous без нужды упражняемых пар.', 'Пастка for/since: не плутай PP і Past Continuous там, де зразок уроку робить акцент PP.', 'Trampa marcador tiempo perfecto español inglés PP vs continuo.'],
];

interface OutCard {
  correctRu: string;
  correctUk: string;
  wrongRu: string;
  wrongUk: string;
  secretRu: string;
  secretUk: string;
  correctEs: string;
  wrongEs: string;
  secretEs: string;
}

function clamp(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= MAX) return t;
  return `${t.slice(0, MAX - 1)}…`;
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildCard(lessonId: number, phraseIndex: number, phrase: LessonPhrase): OutCard {
  const en = phrase.english.trim();
  const esLine = ((phrase.spanish && phrase.spanish.trim()) || phrase.russian.trim()).replace(/'/g, '’');
  const hub = HUB[lessonId] ?? HUB[1]!;
  const pit = ROT_TRAPS[(phraseIndex + lessonId) % ROT_TRAPS.length]!;

  const correctRu = clamp(
    `Верная сборка EN: «${en}». ${hub[0]} Ось (ES или L1-эхо цели в данных): «${esLine}». ${pit[0]} Мини-пример уже в самой строке упражнения.`,
  );
  const correctUk = clamp(
    `Вірний EN: «${en}». ${hub[1]} Орієнт «${esLine}». ${pit[1]} Мінімальний приклад — у фразі вправи.`,
  );
  const correctEs = clamp(
    `Bien montado en inglés: «${en}». ${hub[2]} Eco meta en español (o L1 disponible): «${esLine}». ${pit[2]}`, 
  );

  const wrongRu = clamp(
    `Порядок или вспомогательный элемент не попали в паттерн урока. ${hub[0]} Вернитесь к «${esLine}» как к смыслу и восстановите нужный финитный маркер блока.`,
  );
  const wrongUk = clamp(
    `Порядок чи допоміжне слово не входять у патерн. ${hub[1]} Спирайся на «${esLine}» як на зміст і перевір финітний маркер.`,
  );
  const wrongEs = clamp(
    `Orden o auxiliar no marcan el modelo de la unidad. ${hub[2]} Relee «${esLine}» como brújula léxica y reensambla.`,
  );

  const k = phraseIndex % 3;
  let secretRu: string;
  let secretUk: string;
  let secretEs: string;
  if (k === 0) {
    secretRu = clamp(`Подсказка памяти: выдели ударный слог в ключевом английском слове «${en.split(/\s+/)[0] ?? '…'}», произнеси в связке дважды.`);
    secretUk = clamp(`Пам’ять: виділи наголос на «${en.split(/\s+/)[0] ?? '…'}», повтор двічі зв’язним шепотом.`);
    secretEs = clamp(`Fonética mínima: acentúa inglés entrada «${en.split(/\s+/)[0] ?? '…'}» y repítelo pegado al eco español.`);
  } else if (k === 1) {
    secretRu = clamp(`Стиль ELE: переведи себе «узел» («${hub[0].slice(0, 80)}») перед тем как ткнуть вторую кнопку — экономит ошибки русского калькирования порядка.`);
    secretUk = clamp(`ELE-страхування: промов «вузол» голосно (${hub[1].slice(0, 80)}…) перш ніж ставити чергове слово.`);
    secretEs = clamp(`Truco clase referencia ELE: verbaliza solo el pivote español-inglés (segmento libro) antes de seguir pulsando fichas EN.`);
  } else {
    secretRu = clamp(`Не дублируй интро-теорию: это карточка «микродриллинг» именно до фразы «${en.slice(0, 40)}${en.length > 40 ? '…' : ''}».`);
    secretUk = clamp(`Не дублюй інтро-теорію: ця картка прив’язана до «${en.slice(0, 40)}${en.length > 40 ? '…' : ''}».`);
    secretEs = clamp(`Sin repetir párrafos teoría grande: esta tarjeta ancla microdrill inglés («${esLine.slice(0, 56)}»).`);
  }

  return { correctRu, correctUk, wrongRu, wrongUk, secretRu, secretUk, correctEs, wrongEs, secretEs };
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const lines: string[] = [];
  lines.push(`// AUTO-GENERATED — scripts/gen-prompt014-lesson-cards.ts`);
  lines.push(`// PROMPT-014: contrastive ELE support; каждое поле ≤ ${MAX} символов.\n`);

  const blocks: string[] = [];
  for (let lid = 1; lid <= 32; lid++) {
    const ld = LESSON_DATA[lid];
    if (!ld) throw new Error(`Missing LESSON_DATA[${lid}]`);

    const inner: string[] = [];
    ld.phrases.forEach((p, i) => {
      const idx = i + 1;
      const c = buildCard(lid, idx, p);
      inner.push(`${idx}: {\n      correctRu: '${esc(c.correctRu)}',\n      correctUk: '${esc(c.correctUk)}',\n      wrongRu: '${esc(c.wrongRu)}',\n      wrongUk: '${esc(c.wrongUk)}',\n      secretRu: '${esc(c.secretRu)}',\n      secretUk: '${esc(c.secretUk)}',\n      correctEs: '${esc(c.correctEs)}',\n      wrongEs: '${esc(c.wrongEs)}',\n      secretEs: '${esc(c.secretEs)}',\n    }`);
    });
    blocks.push(`  ${lid}: {\n    ${inner.join(',\n    ')},\n  }`);
  }

  lines.push(`import type { PhraseCard } from './phraseCardTypes';\n`);
  lines.push(`export const generatedLessonCards: Record<number, Record<number, PhraseCard>> = {\n${blocks.join(',\n')},\n};`);
  writeFileSync(OUT_FILE, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote ${OUT_FILE}`);
}

main();
