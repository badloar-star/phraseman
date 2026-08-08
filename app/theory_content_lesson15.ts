// Theory content for Lesson 15 (Possessive determiners & pronouns).
//
// Structured data source for the TheoryLessonView engine.
// Content is transferred from the legacy lesson_help.tsx HINTS[15].render
// (a single possessive-pronoun table) without grammar changes and split into
// meaningful sections. Grammar is standard (my/mine, your/yours, his, her/hers,
// its, our/ours, their/theirs) and verified against Cambridge/Oxford.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the possessive form to highlight in the phrase.

import type { L1Block, L1Section } from './theory_content_lesson1';

export const LESSON15_THEORY: {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  sections: L1Section[];
} = {
  titleRu: 'Притяжательные местоимения',
  titleUk: 'Присвійні займенники',
  titleEs: 'Pronombres posesivos',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      titleEs: 'Qué vas a practicar en esta lección',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься говорить, кому что-то принадлежит: «моя сумка», «его имя», «их ключи». В английском для этого есть два набора слов. Один ставится перед предметом (my bag — моя сумка), другой заменяет предмет и стоит самостоятельно (It\'s mine — она моя).',
          uk: 'У цьому уроці ти вчишся казати, кому щось належить: «моя сумка», «його ім\'я», «їхні ключі». В англійській для цього є два набори слів. Один ставиться перед предметом (my bag — моя сумка), інший замінює предмет і стоїть самостійно (It\'s mine — вона моя).',
          es: 'En esta lección aprendes a decir a quién pertenece algo: "mi bolso", "su nombre", "sus llaves". En inglés hay dos grupos de palabras para esto. Uno va antes del objeto (my bag — mi bolso), el otro reemplaza al objeto y va solo (It\'s mine — es mío).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'This is my bag', ru: 'Это моя сумка', uk: 'Це моя сумка', es: 'Este es mi bolso', hi: 'my' },
            { en: "It's mine", ru: 'Она моя', uk: 'Вона моя', es: 'Es mío', hi: 'mine' },
            { en: 'His name is Alex', ru: 'Его зовут Алекс', uk: 'Його звати Алекс', es: 'Se llama Alex (él)', hi: 'his' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное различие: my, your, his, her, its, our, their — стоят перед предметом. mine, yours, his, hers, ours, theirs — заменяют предмет и стоят сами по себе.',
          uk: 'Головна відмінність: my, your, his, her, its, our, their — стоять перед предметом. mine, yours, his, hers, ours, theirs — замінюють предмет і стоять самі по собі.',
          es: 'La diferencia principal: my, your, his, her, its, our, their van antes del objeto. mine, yours, his, hers, ours, theirs reemplazan al objeto y van solos.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Форма перед существительным',
      titleUk: 'Форма перед іменником',
      titleEs: 'La forma antes del sustantivo',
      defaultOpen: true,
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Эта форма ставится перед предметом и показывает, чьё это: my, your, his, her, its, our, their. После неё обязательно идёт существительное (название предмета).',
          uk: 'Ця форма ставиться перед предметом і показує, чиє це: my, your, his, her, its, our, their. Після неї обов\'язково йде іменник (назва предмета).',
          es: 'Esta forma va antes del objeto y muestra de quién es: my, your, his, her, its, our, their. Después de ella siempre va un sustantivo (el nombre del objeto).',
        },
        {
          kind: 'formula',
          formula: ['my / your / his / her / its / our / their', '+', 'предмет'],
          formulaEs: ['my / your / his / her / its / our / their', '+', 'objeto'],
        },
        {
          kind: 'examples',
          examples: [
            { en: 'my', ru: 'мой / моя — my bag (моя сумка)', uk: 'мій / моя — my bag (моя сумка)', es: 'mi — my bag (mi bolso)', hi: 'my' },
            { en: 'your', ru: 'твой / ваш — your keys (твои ключи)', uk: 'твій / ваш — your keys (твої ключі)', es: 'tu / su (de usted) — your keys (tus llaves)', hi: 'your' },
            { en: 'his', ru: 'его — his name (его имя)', uk: 'його — his name (його ім\'я)', es: 'su (de él) — his name (su nombre)', hi: 'his' },
            { en: 'her', ru: 'её — her house (её дом)', uk: 'її — her house (її дім)', es: 'su (de ella) — her house (su casa)', hi: 'her' },
            { en: 'its', ru: 'его / её (о предмете) — its food (его еда)', uk: 'його / її (про предмет) — its food (його їжа)', es: 'su (de un objeto o animal) — its food (su comida)', hi: 'its' },
            { en: 'our', ru: 'наш / наша — our house (наш дом)', uk: 'наш / наша — our house (наш дім)', es: 'nuestro / nuestra — our house (nuestra casa)', hi: 'our' },
            { en: 'their', ru: 'их — their keys (их ключи)', uk: 'їхній — their keys (їхні ключі)', es: 'su (de ellos) — their keys (sus llaves)', hi: 'their' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'choice', before: 'This is', after: 'bag', options: ['my', 'mine'], answer: 'my', why: { ru: 'Перед предметом (bag) ставится my, а не mine.', es: 'Antes del objeto (bag) va my, no mine.' } },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Самостоятельная форма',
      titleUk: 'Самостійна форма',
      titleEs: 'La forma independiente',
      exampleCount: 6,
      blocks: [
        {
          kind: 'body',
          ru: 'Эта форма заменяет предмет и стоит сама по себе, без существительного после неё: mine, yours, his, hers, ours, theirs. Её используют, когда уже понятно, о каком предмете речь.',
          uk: 'Ця форма замінює предмет і стоїть сама по собі, без іменника після неї: mine, yours, his, hers, ours, theirs. Її використовують, коли вже зрозуміло, про який предмет ідеться.',
          es: 'Esta forma reemplaza al objeto y va sola, sin un sustantivo después: mine, yours, his, hers, ours, theirs. Se usa cuando ya está claro de qué objeto se habla.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "It's mine", ru: 'Она моя', uk: 'Вона моя', es: 'Es mío', hi: 'mine' },
            { en: "It's yours", ru: 'Она твоя', uk: 'Вона твоя', es: 'Es tuyo', hi: 'yours' },
            { en: "It's his", ru: 'Она его', uk: 'Вона його', es: 'Es de él', hi: 'his' },
            { en: "That's hers", ru: 'То её', uk: 'То її', es: 'Eso es de ella', hi: 'hers' },
            { en: 'Our house is big', ru: 'Наш дом большой', uk: 'Наш дім великий', es: 'Nuestra casa es grande', hi: 'Our' },
            { en: 'The keys are theirs', ru: 'Ключи их', uk: 'Ключі їхні', es: 'Las llaves son de ellos', hi: 'theirs' },
          ],
        },
        {
          kind: 'tip',
          ru: 'После mine, yours, hers, ours, theirs не ставится предмет. Говорят It\'s mine, а не It\'s mine bag.',
          uk: 'Після mine, yours, hers, ours, theirs не ставиться предмет. Кажуть It\'s mine, а не It\'s mine bag.',
          es: 'Después de mine, yours, hers, ours, theirs no va un objeto. Se dice It\'s mine, no It\'s mine bag.',
        },
        {
          kind: 'drill',
          drill: { type: 'binary', question: { ru: 'Где верно?', es: '¿Cuál es correcto?' }, optionA: "It's mine bag", optionB: "It's mine", correct: 'B', explain: { ru: 'mine стоит само по себе, без предмета после него.', es: 'mine va solo, sin un objeto después.' } },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Все формы по лицам',
      titleUk: 'Усі форми за особами',
      titleEs: 'Todas las formas por persona',
      exampleCount: 7,
      blocks: [
        {
          kind: 'body',
          ru: 'Сведём всё вместе. У каждого лица есть форма перед предметом и самостоятельная форма. У his обе формы одинаковы, а у its самостоятельной формы нет.',
          uk: 'Зведемо все разом. У кожної особи є форма перед предметом і самостійна форма. У his обидві форми однакові, а в its самостійної форми немає.',
          es: 'Vamos a juntar todo. Cada persona tiene una forma antes del objeto y una forma independiente. En his las dos formas son iguales, y its no tiene forma independiente.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I → my / mine', ru: 'This is my bag. — It\'s mine.', uk: 'This is my bag. — It\'s mine.', es: 'This is my bag. — It\'s mine.', hi: 'mine' },
            { en: 'You → your / yours', ru: "It's yours.", uk: "It's yours.", es: "It's yours.", hi: 'yours' },
            { en: 'He → his / his', ru: 'His name is Alex.', uk: 'His name is Alex.', es: 'His name is Alex.', hi: 'his' },
            { en: 'She → her / hers', ru: "That's hers.", uk: "That's hers.", es: "That's hers.", hi: 'hers' },
            { en: 'It → its / —', ru: 'The dog ate its food.', uk: 'The dog ate its food.', es: 'The dog ate its food.', hi: 'its' },
            { en: 'We → our / ours', ru: 'Our house is big.', uk: 'Our house is big.', es: 'Our house is big.', hi: 'our' },
            { en: 'They → their / theirs', ru: 'The keys are theirs.', uk: 'The keys are theirs.', es: 'The keys are theirs.', hi: 'theirs' },
          ],
        },
        {
          kind: 'drill',
          drill: { type: 'word_bank', prompt: { ru: 'Ключи их', es: 'Las llaves son de ellos' }, answer: ['The', 'keys', 'are', 'theirs'], slotLabels: [{ ru: '', es: '' }, { ru: 'предмет', es: 'objeto' }, { ru: 'связка', es: 'verbo' }, { ru: 'чьи', es: 'de quién' }], distractors: ['their', 'mine'] },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'its без апострофа',
      titleUk: 'its без апострофа',
      titleEs: 'its sin apóstrofo',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'its — это «его / её» о предмете или животном: The dog ate its food (Собака съела свою еду). У its нет самостоятельной формы и нет апострофа: пишется its, а не it\'s.',
          uk: 'its — це «його / її» про предмет або тварину: The dog ate its food (Собака з\'їла свою їжу). У its немає самостійної форми і немає апострофа: пишеться its, а не it\'s.',
          es: 'its es "su" (de un objeto o animal): The dog ate its food (El perro se comió su comida). its no tiene forma independiente y no lleva apóstrofo: se escribe its, no it\'s.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'The dog ate its food', ru: 'Собака съела свою еду', uk: 'Собака з\'їла свою їжу', es: 'El perro se comió su comida', hi: 'its' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Не путай its (притяжательное, без апострофа) и it\'s (это сокращение от it is). В этом уроке нужно именно its.',
          uk: 'Не плутай its (присвійне, без апострофа) і it\'s (це скорочення від it is). У цьому уроці потрібне саме its.',
          es: 'No confundas its (posesivo, sin apóstrofo) con it\'s (que es la contracción de it is). En esta lección necesitas its.',
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      titleEs: 'Los errores más comunes',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: "It's mine bag", right: "It's my bag" },
            { wrong: 'This is my', right: 'This is mine' },
            { wrong: 'The keys are their', right: 'The keys are theirs' },
            { wrong: "it's food", right: 'its food' },
            { wrong: "That's her", right: "That's hers" },
          ],
        },
        {
          kind: 'tip',
          ru: 'Перед предметом — my, your, his, her, its, our, their. Когда предмета после слова нет — mine, yours, his, hers, ours, theirs. its пишется без апострофа.',
          uk: 'Перед предметом — my, your, his, her, its, our, their. Коли предмета після слова немає — mine, yours, his, hers, ours, theirs. its пишеться без апострофа.',
          es: 'Antes del objeto va my, your, his, her, its, our, their. Cuando no hay objeto después de la palabra va mine, yours, his, hers, ours, theirs. its se escribe sin apóstrofo.',
        },
        {
          kind: 'drill',
          drill: { type: 'spot_slip', chips: ['The', 'keys', 'are', 'their'], answerIndex: 3, hint: { ru: 'Тут не та форма. Тапни лишнее слово.', es: 'Aquí la forma no es correcta. Toca la palabra equivocada.' }, fix: { ru: 'После are нет предмета, поэтому нужна самостоятельная форма: theirs.', es: 'Después de are no hay objeto, así que se necesita la forma independiente: theirs.' } },
        },
      ],
    },
  ],
};
