// Theory content for Lesson 21 (Indefinite pronouns: some-/any-/no-/every-).
//
// Structured data source for the TheoryLessonView engine. Content transferred
// from the legacy lesson_help.tsx HINTS[21].render (two tables: the some/any/no/
// every grid and the "when to use" table) and expanded into meaningful sections.
// Grammar is verified against Cambridge/Oxford usage of indefinite pronouns.
//
// Bilingual: every text field carries both Russian (ru) and Ukrainian (uk).
// `hi` on an example is the indefinite pronoun to highlight in the phrase.

import type { L1Section } from './theory_content_lesson1'

export const LESSON21_THEORY: { titleRu: string; titleUk: string; sections: L1Section[] } = {
  titleRu: 'Неопределённые местоимения',
  titleUk: 'Неозначені займенники',
  sections: [
    // ───────────────────────── 01 ─────────────────────────
    {
      num: '01',
      titleRu: 'Что ты тренируешь в этом уроке',
      titleUk: 'Що ти тренуєш у цьому уроці',
      defaultOpen: true,
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'В этом уроке ты учишься говорить о людях, предметах и местах, не называя их точно: «кто-то», «что-то», «где-то», «никто», «ничего», «все». В английском такие слова собираются из корня (some-, any-, no-, every-) и окончания (-body / -one — про людей, -thing — про предметы, -where — про места).',
          uk: 'У цьому уроці ти вчишся говорити про людей, предмети й місця, не називаючи їх точно: «хтось», «щось», «десь», «ніхто», «нічого», «всі». В англійській такі слова збираються з кореня (some-, any-, no-, every-) і закінчення (-body / -one — про людей, -thing — про предмети, -where — про місця).',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'Кто-то тебе звонил.', uk: 'Хтось тобі дзвонив.', hi: 'Someone' },
            { en: 'Is anyone there?', ru: 'Там кто-нибудь есть?', uk: 'Там хтось є?', hi: 'anyone' },
            { en: 'Nobody came.', ru: 'Никто не пришёл.', uk: 'Ніхто не прийшов.', hi: 'Nobody' },
            { en: 'Everyone was happy.', ru: 'Все были счастливы.', uk: 'Усі були щасливі.', hi: 'Everyone' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Слово строится из двух частей: корень (some/any/no/every) + хвост (-body/-one/-thing/-where). Запомнишь оба набора — соберёшь любое такое слово.',
          uk: 'Слово будується з двох частин: корінь (some/any/no/every) + хвіст (-body/-one/-thing/-where). Запам’ятаєш обидва набори — складеш будь-яке таке слово.',
        },
      ],
    },

    // ───────────────────────── 02 ─────────────────────────
    {
      num: '02',
      titleRu: 'Таблица: корень + хвост',
      titleUk: 'Таблиця: корінь + хвіст',
      defaultOpen: true,
      exampleCount: 12,
      blocks: [
        {
          kind: 'body',
          ru: 'Вот все четыре корня и три хвоста. -body и -one значат одно и то же (про людей) — выбирай любой.',
          uk: 'Ось усі чотири корені й три хвости. -body і -one значать те саме (про людей) — обирай будь-який.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'somebody / someone', ru: 'кто-то (про людей, корень some-)', uk: 'хтось (про людей, корінь some-)', hi: 'someone' },
            { en: 'something', ru: 'что-то (про предметы, корень some-)', uk: 'щось (про предмети, корінь some-)', hi: 'something' },
            { en: 'somewhere', ru: 'где-то (про место, корень some-)', uk: 'десь (про місце, корінь some-)', hi: 'somewhere' },
            { en: 'anybody / anyone', ru: 'кто-нибудь (корень any-)', uk: 'хтось / будь-хто (корінь any-)', hi: 'anyone' },
            { en: 'anything', ru: 'что-нибудь (корень any-)', uk: 'щось / будь-що (корінь any-)', hi: 'anything' },
            { en: 'anywhere', ru: 'где-нибудь (корень any-)', uk: 'десь / будь-де (корінь any-)', hi: 'anywhere' },
            { en: 'nobody / no one', ru: 'никто (корень no-)', uk: 'ніхто (корінь no-)', hi: 'nobody' },
            { en: 'nothing', ru: 'ничего (корень no-)', uk: 'нічого (корінь no-)', hi: 'nothing' },
            { en: 'nowhere', ru: 'нигде / никуда (корень no-)', uk: 'ніде / нікуди (корінь no-)', hi: 'nowhere' },
            { en: 'everybody / everyone', ru: 'все (корень every-)', uk: 'усі (корінь every-)', hi: 'everyone' },
            { en: 'everything', ru: 'всё (корень every-)', uk: 'усе (корінь every-)', hi: 'everything' },
            { en: 'everywhere', ru: 'везде / повсюду (корень every-)', uk: 'скрізь / повсюди (корінь every-)', hi: 'everywhere' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Хвост -one пишется отдельно только в no one: «no one came». Все остальные слова пишутся слитно: someone, anyone, everyone.',
          uk: 'Хвіст -one пишеться окремо лише в no one: «no one came». Усі інші слова пишуться разом: someone, anyone, everyone.',
        },
        {
          kind: 'drill',
          drill: {
            type: 'choice',
            before: 'I lost my keys',
            after: '.',
            options: ['somewhere', 'something', 'somebody'],
            answer: 'somewhere',
            why: { ru: 'Речь о месте, поэтому хвост -where: I lost my keys somewhere.' },
          },
        },
      ],
    },

    // ───────────────────────── 03 ─────────────────────────
    {
      num: '03',
      titleRu: 'Когда какой корень',
      titleUk: 'Коли який корінь',
      exampleCount: 4,
      blocks: [
        {
          kind: 'body',
          ru: 'Корень выбирается по типу фразы: some- — в утверждениях и вежливых просьбах; any- — в вопросах и отрицаниях; no- — когда хочешь сказать «нет» одним словом; every- — когда речь обо всех без исключения.',
          uk: 'Корінь обирається за типом фрази: some- — у ствердженнях і ввічливих проханнях; any- — у питаннях і запереченнях; no- — коли хочеш сказати «ні» одним словом; every- — коли йдеться про всіх без винятку.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'some- — утверждение / просьба: «Кто-то тебе звонил».', uk: 'some- — ствердження / прохання: «Хтось тобі дзвонив».', hi: 'Someone' },
            { en: 'Is anyone there?', ru: 'any- — вопрос или отрицание: «Там кто-нибудь есть?».', uk: 'any- — питання або заперечення: «Там хтось є?».', hi: 'anyone' },
            { en: 'Nobody came.', ru: 'no- — отрицательный смысл одним словом: «Никто не пришёл».', uk: 'no- — заперечний зміст одним словом: «Ніхто не прийшов».', hi: 'Nobody' },
            { en: 'Everyone was happy.', ru: 'every- — все без исключения: «Все были счастливы».', uk: 'every- — усі без винятку: «Усі були щасливі».', hi: 'Everyone' },
          ],
        },
      ],
    },

    // ───────────────────────── 04 ─────────────────────────
    {
      num: '04',
      titleRu: 'no- = одно «не» на фразу',
      titleUk: 'no- = одне «не» на фразу',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Слова с no- (nobody, nothing, nowhere) уже содержат отрицание. Поэтому глагол с ними ставится в утвердительной форме: «Nobody came» (не «Nobody didn’t come»). В английском в одной фразе только одно отрицание.',
          uk: 'Слова з no- (nobody, nothing, nowhere) уже містять заперечення. Тому дієслово з ними ставиться у стверджувальній формі: «Nobody came» (не «Nobody didn’t come»). В англійській в одній фразі лише одне заперечення.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Nobody came.', ru: 'Никто не пришёл. (глагол без «not»)', uk: 'Ніхто не прийшов. (дієслово без «not»)', hi: 'Nobody' },
            { en: 'I know nothing.', ru: 'Я ничего не знаю. (одно отрицание — nothing)', uk: 'Я нічого не знаю. (одне заперечення — nothing)', hi: 'nothing' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: "Nobody didn't come", right: 'Nobody came' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'binary',
            question: { ru: 'Где верно?' },
            optionA: "Nobody didn't come",
            optionB: 'Nobody came',
            correct: 'B',
            explain: { ru: 'Nobody уже значит «никто не», второе отрицание не нужно.' },
          },
        },
      ],
    },

    // ───────────────────────── 05 ─────────────────────────
    {
      num: '05',
      titleRu: 'every- и no- — это «он/оно» (единственное)',
      titleUk: 'every- і no- — це «він/воно» (однина)',
      exampleCount: 2,
      blocks: [
        {
          kind: 'body',
          ru: 'Хотя everyone и nobody по смыслу про многих, грамматически они единственного числа — как he/she/it. Поэтому глагол to be с ними — is/was, а в Present Simple добавляется -s: «Everyone is here», «Everybody knows».',
          uk: 'Хоча everyone і nobody за змістом про багатьох, граматично вони однини — як he/she/it. Тому дієслово to be з ними — is/was, а в Present Simple додається -s: «Everyone is here», «Everybody knows».',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Everyone was happy.', ru: 'Все были счастливы. (was, а не were)', uk: 'Усі були щасливі. (was, а не were)', hi: 'was' },
            { en: 'Everybody knows.', ru: 'Все знают. (knows с -s)', uk: 'Усі знають. (knows з -s)', hi: 'knows' },
          ],
        },
        {
          kind: 'fix',
          fixes: [
            { wrong: 'Everyone were happy', right: 'Everyone was happy' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'spot_slip',
            chips: ['Everyone', 'were', 'happy'],
            answerIndex: 1,
            hint: { ru: 'Тут не та форма. Тапни лишнее слово.' },
            fix: { ru: 'Everyone — единственное число, нужно was: Everyone was happy.' },
          },
        },
      ],
    },

    // ───────────────────────── 06 ─────────────────────────
    {
      num: '06',
      titleRu: 'Соберём фразу из слов',
      titleUk: 'Зберемо фразу зі слів',
      exampleCount: 1,
      blocks: [
        {
          kind: 'body',
          ru: 'Порядок такой же, как в обычной фразе: сначала кто (местоимение), потом глагол, потом остальное. Неопределённое местоимение спокойно стоит на месте подлежащего.',
          uk: 'Порядок такий самий, як у звичайній фразі: спочатку хто (займенник), потім дієслово, потім решта. Неозначений займенник спокійно стоїть на місці підмета.',
        },
        {
          kind: 'examples',
          examples: [
            { en: 'Someone called you.', ru: 'Кто-то тебе звонил.', uk: 'Хтось тобі дзвонив.', hi: 'Someone' },
          ],
        },
        {
          kind: 'drill',
          drill: {
            type: 'word_bank',
            prompt: { ru: 'Кто-то тебе звонил' },
            answer: ['Someone', 'called', 'you'],
            slotLabels: [{ ru: 'кто' }, { ru: 'глагол' }, { ru: 'кого' }],
            distractors: ['Anyone', 'no one'],
          },
        },
      ],
    },

    // ───────────────────────── 07 ─────────────────────────
    {
      num: '07',
      titleRu: 'Самые частые ошибки',
      titleUk: 'Найчастіші помилки',
      blocks: [
        {
          kind: 'fix',
          fixes: [
            { wrong: "Nobody didn't come", right: 'Nobody came' },
            { wrong: 'Everyone were happy', right: 'Everyone was happy' },
            { wrong: 'Is someone there?', right: 'Is anyone there?' },
          ],
        },
        {
          kind: 'tip',
          ru: 'Главное: any- — для вопросов и отрицаний; no- уже несёт «не», второго отрицания не добавляй; every-/no- — единственное число (is/was, глагол с -s).',
          uk: 'Головне: any- — для питань і заперечень; no- уже несе «не», другого заперечення не додавай; every-/no- — однина (is/was, дієслово з -s).',
        },
      ],
    },
  ],
}
