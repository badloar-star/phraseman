// Theory content for Lesson 24 (Present Perfect: have/has + V3).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[24].render (form table + signal-words
// table) and expanded into meaningful sections. Grammar is verified against
// Cambridge/Oxford usage of the Present Perfect.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the Present Perfect marker (have / has / haven't /
// hasn't / Have / Has) to highlight in the phrase.

import type { L1Section } from './theory_content_lesson1'

export const LESSON24_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Present Perfect',
  titleUk: 'Present Perfect',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься строить Present Perfect: have или has плюс третья форма глагола (V3). Это время связывает прошлое с настоящим: что-то уже произошло, и для нас сейчас важен результат или опыт, а не момент, когда это случилось.',
          uk: 'У цьому уроці ти вчишся будувати Present Perfect: have або has плюс третя форма дієслова (V3). Цей час пов’язує минуле з теперішнім: щось уже сталося, і для нас зараз важливий результат або досвід, а не момент, коли це сталося.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have seen this film.', ru: 'Я видел этот фильм.', uk: 'Я бачив цей фільм.', hi: 'have' },
            { en: "She hasn't called yet.", ru: 'Она ещё не позвонила.', uk: 'Вона ще не зателефонувала.', hi: "hasn't" },
            { en: 'Have you ever been to Paris?', ru: 'Ты когда-нибудь был в Париже?', uk: 'Ти коли-небудь був у Парижі?', hi: 'Have' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Present Perfect — это не «прошлое вообще», а связь прошлого с настоящим: важен результат сейчас.',
          uk: 'Present Perfect — це не «минуле взагалі», а зв’язок минулого з теперішнім: важливий результат зараз.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Три формы: +, −, ?',
      titleUk: 'Три форми: +, −, ?',
      defaultOpen: true,
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'Утверждение строится с have/has + V3. Отрицание — haven’t/hasn’t + V3. Вопрос начинается с Have/Has, затем подлежащее и V3. Has идёт с he, she, it; have — с остальными.',
          uk: 'Ствердження будується з have/has + V3. Заперечення — haven’t/hasn’t + V3. Питання починається з Have/Has, далі підмет і V3. Has іде з he, she, it; have — з рештою.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have seen this film.', ru: '+ have/has + V3', uk: '+ have/has + V3', hi: 'have' },
            { en: "She hasn't called yet.", ru: '− haven’t/hasn’t + V3', uk: '− haven’t/hasn’t + V3', hi: "hasn't" },
            { en: 'Have you ever been to Paris?', ru: '? Have/Has + кто + V3?', uk: '? Have/Has + хто + V3?', hi: 'Have' },
          ],
        },
        {
          kind: 'formula',
          formula: ['кто / что', 'have / has', 'V3 (третья форма)'],
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'She',
            after: 'called yet.',
            options: ["hasn't", "haven't", "isn't"],
            answer: "hasn't",
            why: { ru: 'She — это he/she/it, поэтому идёт has/hasn’t.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'have или has',
      titleUk: 'have чи has',
      exampleCount: 3,
      blocks: [
        {
          kind: 'body',
          ru: 'С he, she, it используй has. Со всеми остальными (I, you, we, they) — have. После них всегда идёт третья форма глагола (V3).',
          uk: 'З he, she, it використовуй has. З усіма іншими (I, you, we, they) — have. Після них завжди йде третя форма дієслова (V3).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'I have seen this film.', ru: 'I / you / we / they → have', uk: 'I / you / we / they → have', hi: 'have' },
            { en: "She's already finished.", ru: 'he / she / it → has (’s)', uk: 'he / she / it → has (’s)', hi: "She's" },
            { en: "He's just arrived.", ru: 'he → has (’s)', uk: 'he → has (’s)', hi: "He's" },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'She have finished', right: 'She has finished' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: 'He have just arrived',
            optionB: 'He has just arrived',
            correct: 'B',
            explain: { ru: 'С he / she / it нужно has, а не have.' },
          },
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'Слова-сигналы: ever, never, already, yet, just',
      titleUk: 'Слова-сигнали: ever, never, already, yet, just',
      exampleCount: 5,
      blocks: [
        {
          kind: 'body',
          ru: 'Эти слова часто подсказывают, что нужен Present Perfect: ever — «когда-нибудь», never — «никогда», already — «уже», yet — «ещё / уже» в вопросах и отрицаниях, just — «только что».',
          uk: 'Ці слова часто підказують, що потрібен Present Perfect: ever — «коли-небудь», never — «ніколи», already — «вже», yet — «ще / вже» у питаннях і запереченнях, just — «щойно».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Have you ever tried sushi?', ru: 'ever — когда-нибудь', uk: 'ever — коли-небудь', hi: 'Have' },
            { en: "I've never been to Japan.", ru: 'never — никогда', uk: 'never — ніколи', hi: "I've" },
            { en: "She's already finished.", ru: 'already — уже', uk: 'already — вже', hi: "She's" },
            { en: 'Have you eaten yet?', ru: 'yet — ещё / уже (?)', uk: 'yet — ще / вже (?)', hi: 'Have' },
            { en: "He's just arrived.", ru: 'just — только что', uk: 'just — щойно', hi: "He's" },
          ],
        },
        {
          kind: 'tip',
          ru: 'already обычно стоит в утверждениях, а yet — в вопросах и отрицаниях, и чаще в конце фразы.',
          uk: 'already зазвичай стоїть у ствердженнях, а yet — у питаннях і запереченнях, і частіше в кінці фрази.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Ты когда-нибудь пробовал суши?' },
            answer: ['Have', 'you', 'ever', 'tried', 'sushi'],
            slotLabels: [{ ru: 'have' }, { ru: 'кто' }, { ru: 'сигнал' }, { ru: 'V3' }, { ru: 'что' }],
            distractors: ['Has', 'already'],
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'for и since: как долго',
      titleUk: 'for і since: як довго',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'for показывает длительность — «в течение», «протяжении»: for 5 years. since показывает точку отсчёта — «с какого-то времени»: since 2020. Оба часто идут с Present Perfect, когда действие началось в прошлом и важно для настоящего.',
          uk: 'for показує тривалість — «протягом»: for 5 years. since показує точку відліку — «з якогось часу»: since 2020. Обидва часто йдуть із Present Perfect, коли дія почалася в минулому й важлива для теперішнього.',
        },
        {
          kind: 'examples',
          examples: [
            { en: "I've lived here for 5 years.", ru: 'for — в течение (срок)', uk: 'for — протягом (термін)', hi: "I've" },
            { en: "She's worked here since 2020.", ru: 'since — с (точка во времени)', uk: 'since — з (точка в часі)', hi: "She's" },
          ],
        },
        {
          kind: 'tip',
          ru: 'for — это сколько длится (for 5 years), а since — с какого момента (since 2020).',
          uk: 'for — це скільки триває (for 5 years), а since — з якого моменту (since 2020).',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: "I've lived here",
            after: '5 years.',
            options: ['for', 'since', 'from'],
            answer: 'for',
            why: { ru: 'for показывает длительность: for 5 years. since нужен для точки во времени.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Что нужно вынести из урока',
      titleUk: 'Що треба винести з уроку',
      blocks: [
        {
          kind: 'body',
          ru: 'Present Perfect = have/has + V3. has идёт с he/she/it, have — с остальными. Слова ever, never, already, yet, just, for, since часто подсказывают это время. Оно связывает прошлое с настоящим: важен результат сейчас.',
          uk: 'Present Perfect = have/has + V3. has іде з he/she/it, have — з рештою. Слова ever, never, already, yet, just, for, since часто підказують цей час. Він пов’язує минуле з теперішнім: важливий результат зараз.',
        },
        {
          kind: 'tip',
          ru: 'Держи одну формулу: кто + have/has + V3. I have seen this film. She has finished. Have you ever been to Paris?',
          uk: 'Тримай одну формулу: хто + have/has + V3. I have seen this film. She has finished. Have you ever been to Paris?',
        },
      ],
    },
  ],
}
