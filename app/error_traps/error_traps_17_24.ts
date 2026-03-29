// app/error_traps/error_traps_17_24.ts
// Per-word система подсказок — Уроки 17-24

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 17: Present Continuous (am/is/are + -ing)
// ══════════════════════════════════════════════════════════════

const L17_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Present Continuous = am/is/are + V-ing. I am working (сейчас работаю). Для He/She/It: is.',
    traps: [
      { trigger: ['i am work', 'i am go'], explanation: 'Глагол должен быть с -ing. I am working (не "I am work").', lite: 'Добавьте -ing: am working.' },
      { trigger: ['i is working', 'i are working'], explanation: 'С I только "am". He/She/It → is, We/You/They → are. (I am working.)', lite: 'С I: только "am".' },
      { trigger: ['i working'], explanation: 'Пропущен вспомогательный глагол "am". Нужно: I am working.', lite: 'Нужен "am": I am working.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'He/She/It + is + V-ing. He is reading. Если глагол на -e, то: make → making.',
    traps: [
      { trigger: ['he am working', 'she am going'], explanation: 'С He/She/It → is (не "am"). He is working.', lite: 'He/She/It: is.' },
      { trigger: ['he is making'], explanation: 'Правильное -ing: глаголы на -e теряют e (make → making). ✓', lite: 'Правильно: making.' },
      { trigger: ['he is make'], explanation: 'Нужна форма -ing. He is making (не "is make").', lite: 'Добавьте -ing: making.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'We/You/They + are + V-ing. They are playing. Множественное число → are.',
    traps: [
      { trigger: ['they is playing', 'you is going'], explanation: 'С They/You/We → are (не "is"). They are playing.', lite: 'They/You/We: are.' },
      { trigger: ['they are play'], explanation: 'Нужна форма -ing. They are playing (не "are play").', lite: 'Добавьте -ing: playing.' },
      { trigger: ['they playing'], explanation: 'Пропущен "are". They are playing.', lite: 'Нужен "are": They are playing.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'Глаголы на -ie → -ying: lie → lying, tie → tying. Схема: is lying.',
    traps: [
      { trigger: ['is lieing', 'is tieing'], explanation: 'Глаголы на -ie: убрать e, добавить -ing (lie → lying, не "lieing").', lite: 'lie → lying.' },
      { trigger: ['is lying'], explanation: 'Правильно: lie → lying. ✓', lite: 'Правильно: lying.' },
      { trigger: ['is lie'], explanation: 'Нужна форма -ing: lying.', lite: 'Добавьте -ing: lying.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'Согласная удваивается перед -ing (если слог ударный): sit → sitting, run → running.',
    traps: [
      { trigger: ['is siting', 'is runing'], explanation: 'Односложные глаголы: удвойте последнюю согласную (sit → sitting, run → running).', lite: 'Удвойте: sitting, running.' },
      { trigger: ['is sitting'], explanation: 'Правильно: удвоение согласной. ✓', lite: 'Правильно: sitting.' },
      { trigger: ['is sit'], explanation: 'Нужна форма -ing: sitting.', lite: 'Добавьте -ing: sitting.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Вопрос: Are/Is + Subject + V-ing? Are you working? Is he coming?',
    traps: [
      { trigger: ['you are working', 'is he coming'], explanation: 'В утвердительном: Subject + are/is. В вопросе: are/is + Subject.', lite: 'Вопрос: Are you working?' },
      { trigger: ['are you work'], explanation: 'В вопросе тоже нужна форма -ing: Are you working?', lite: 'Добавьте -ing: working.' },
      { trigger: ['are you working'], explanation: 'Правильный вопрос. ✓', lite: 'Правильно: Are you working?' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'Отрицание: am/is/are + not + V-ing. I am not working. She is not going.',
    traps: [
      { trigger: ['i am not work'], explanation: 'После "not" нужна форма -ing: am not working.', lite: 'Добавьте -ing: working.' },
      { trigger: ['i not am working'], explanation: 'Порядок: am not (не "not am"): I am not working.', lite: 'Порядок: am not.' },
      { trigger: ['i am not working'], explanation: 'Правильное отрицание. ✓', lite: 'Правильно: not working.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'Глаголы на -c: добавить k перед -ing. panic → panicking, picnic → picnicking.',
    traps: [
      { trigger: ['is panicing', 'is picnicing'], explanation: 'Глаголы на -c: добавить k (panic → panicking, picnic → picnicking).', lite: 'panic → panicking.' },
      { trigger: ['is panicking'], explanation: 'Правильно: добавлен k. ✓', lite: 'Правильно: panicking.' },
      { trigger: ['is panic'], explanation: 'Нужна форма -ing: panicking.', lite: 'Добавьте -ing: panicking.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'Present Continuous с "now", "at the moment", "right now": They are working now.',
    traps: [
      { trigger: ['they work now'], explanation: 'Без am/is/are нет Present Continuous. Нужно: They are working now.', lite: 'Нужен "are": are working.' },
      { trigger: ['they are work now'], explanation: 'После "are" нужна форма -ing: are working.', lite: 'Добавьте -ing: working.' },
      { trigger: ['they are working now'], explanation: 'Правильно. ✓', lite: 'Правильно: are working.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'Гласная перед согласной (-ing): не удваивать. help → helping (не "helpping").',
    traps: [
      { trigger: ['is helpping', 'is opening'], explanation: 'Если перед согласной две гласные, не удваивайте: helping (не "helpping").', lite: 'help → helping.' },
      { trigger: ['is helping'], explanation: 'Правильно: одна согласная. ✓', lite: 'Правильно: helping.' },
      { trigger: ['is help'], explanation: 'Нужна форма -ing: helping.', lite: 'Добавьте -ing: helping.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Ударение на первый слог (2 слога): не удваивать. listen → listening, open → opening.',
    traps: [
      { trigger: ['is listennning', 'is opennning'], explanation: 'Слово "listen" и "open": ударение на первый слог, не удваивайте (listening, opening).', lite: 'listen → listening.' },
      { trigger: ['is listening'], explanation: 'Правильно: одна согласная. ✓', lite: 'Правильно: listening.' },
      { trigger: ['is listen'], explanation: 'Нужна форма -ing: listening.', lite: 'Добавьте -ing: listening.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'Ударение на второй слог (2 слога): удваивать. prefer → preferring, admit → admitting.',
    traps: [
      { trigger: ['is prefering', 'is admiting'], explanation: 'Слово "prefer" и "admit": ударение на второй слог, удваивайте (preferring, admitting).', lite: 'prefer → preferring.' },
      { trigger: ['is preferring'], explanation: 'Правильно: удвоение согласной. ✓', lite: 'Правильно: preferring.' },
      { trigger: ['is prefer'], explanation: 'Нужна форма -ing: preferring.', lite: 'Добавьте -ing: preferring.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'Вопрос с Who/What: What/Who + are/is + Subject + V-ing? What are they doing?',
    traps: [
      { trigger: ['what they are doing'], explanation: 'Порядок вопроса: What + are + they + doing? (не "What they are").', lite: 'Порядок: What are they?' },
      { trigger: ['what are they do'], explanation: 'После "are" нужна форма -ing: doing.', lite: 'Добавьте -ing: doing.' },
      { trigger: ['what are they doing'], explanation: 'Правильный вопрос. ✓', lite: 'Правильно: What are they doing?' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'Отрицание вопроса: Aren\'t/Isn\'t + Subject + V-ing? Isn\'t he working? Aren\'t they coming?',
    traps: [
      { trigger: ['is not he working'], explanation: 'Можно также: Is he not working? Или сокращение: Isn\'t he working?', lite: 'Форма: Isn\'t he working?' },
      { trigger: ['isnt he working'], explanation: 'Сокращение "Isn\'t" требует апостроф: Isn\'t (не "Isnt").', lite: 'Апостроф: Isn\'t.' },
      { trigger: ['isn\'t he working'], explanation: 'Правильный отрицательный вопрос. ✓', lite: 'Правильно: Isn\'t he working?' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'Present Continuous часто с модальными: can, might, may + be + V-ing. He can be playing football right now.',
    traps: [
      { trigger: ['he can playing'], explanation: 'С модальными: can + be + V-ing. He can be playing (не "can playing").', lite: 'can be + V-ing.' },
      { trigger: ['he can be play'], explanation: 'После "be" нужна форма -ing: be playing.', lite: 'Добавьте -ing: playing.' },
      { trigger: ['he can be playing'], explanation: 'Правильно. ✓', lite: 'Правильно: can be playing.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Present Perfect Continuous: have/has been + V-ing. I have been working for two hours.',
    traps: [
      { trigger: ['i have working'], explanation: 'Нужно "have been": have been working (не "have working").', lite: 'have been + V-ing.' },
      { trigger: ['i have been work'], explanation: 'После "been" нужна форма -ing: been working.', lite: 'Добавьте -ing: working.' },
      { trigger: ['i have been working'], explanation: 'Правильный Present Perfect Continuous. ✓', lite: 'Правильно: have been working.' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 18: Повелительное наклонение (Imperative)
// ══════════════════════════════════════════════════════════════

const L18_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Повелительное = Глагол в базовой форме. Open the door! Close the window!',
    traps: [
      { trigger: ['you open the door'], explanation: 'В повелительном БЕЗ подлежащего. Просто: Open the door! (не "You open").', lite: 'Без подлежащего: Open the door!' },
      { trigger: ['to open the door'], explanation: 'В повелительном БЕЗ "to". Просто: Open! (не "To open").', lite: 'Без "to": Open the door!' },
      { trigger: ['open the door'], explanation: 'Правильный повелительный. ✓', lite: 'Правильно: Open the door!' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'Отрицание: Do not + Глагол (или Don\'t). Do not open! Don\'t close the window!',
    traps: [
      { trigger: ['not open the door'], explanation: 'Отрицание: "Do not" или "Don\'t" + глагол. Do not open! (не "Not open").', lite: 'Форма: Do not open!' },
      { trigger: ['don\'t to open'], explanation: 'После "Don\'t" БЕЗ "to". Просто: Don\'t open! (не "Don\'t to open").', lite: 'Без "to": Don\'t open!' },
      { trigger: ['don\'t open'], explanation: 'Правильное отрицание. ✓', lite: 'Правильно: Don\'t open!' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'С "Please": Please + Глагол или Глагол + please. Please sit down. Sit down, please.',
    traps: [
      { trigger: ['you please sit down'], explanation: 'Без подлежащего: Please sit down! (не "You please").', lite: 'Без подлежащего: Please sit down!' },
      { trigger: ['sit please down'], explanation: 'Правильный порядок: "Please sit" или "sit, please". (Sit down, please.)', lite: 'Порядок: Please sit или sit, please.' },
      { trigger: ['please sit down'], explanation: 'Правильно. ✓', lite: 'Правильно: Please sit down!' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'Stand up! Get up! Sit down! Lie down! — два слова для результата движения.',
    traps: [
      { trigger: ['you stand up'], explanation: 'Без подлежащего: Stand up! (не "You stand").', lite: 'Без подлежащего: Stand up!' },
      { trigger: ['to stand up'], explanation: 'БЕЗ "to": Stand up! (не "To stand").', lite: 'Без "to": Stand up!' },
      { trigger: ['stand up'], explanation: 'Правильно. ✓', lite: 'Правильно: Stand up!' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'Отрицание с глаголом действия: Don\'t make noise! Don\'t talk so loud!',
    traps: [
      { trigger: ['not make noise'], explanation: 'Отрицание: "Don\'t" + глагол. Don\'t make! (не "Not make").', lite: 'Форма: Don\'t make!' },
      { trigger: ['don\'t making'], explanation: 'После "Don\'t" БЕЗ -ing. Просто: Don\'t make! (не "don\'t making").', lite: 'Без -ing: Don\'t make!' },
      { trigger: ['don\'t make noise'], explanation: 'Правильно. ✓', lite: 'Правильно: Don\'t make noise!' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Help me! Call me! Teach me! — с дополнением (объект).',
    traps: [
      { trigger: ['you help me'], explanation: 'Без подлежащего: Help me! (не "You help").', lite: 'Без подлежащего: Help me!' },
      { trigger: ['to help me'], explanation: 'БЕЗ "to": Help me! (не "To help").', lite: 'Без "to": Help me!' },
      { trigger: ['help me'], explanation: 'Правильно. ✓', lite: 'Правильно: Help me!' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'Отрицание с дополнением: Don\'t listen to him! Don\'t speak to her!',
    traps: [
      { trigger: ['not listen to him'], explanation: 'Отрицание: "Don\'t" + глагол. Don\'t listen! (не "Not listen").', lite: 'Форма: Don\'t listen!' },
      { trigger: ['don\'t listening'], explanation: 'После "Don\'t" БЕЗ -ing. Просто: Don\'t listen! (не "don\'t listening").', lite: 'Без -ing: Don\'t listen!' },
      { trigger: ['don\'t listen to him'], explanation: 'Правильно. ✓', lite: 'Правильно: Don\'t listen!' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'С "be": Don\'t be late! Be careful! Be kind! (is/are → быть, быть)',
    traps: [
      { trigger: ['not be late'], explanation: 'Отрицание: "Don\'t be" + прилагательное. Don\'t be late! (не "Not be").', lite: 'Форма: Don\'t be late!' },
      { trigger: ['don\'t being late'], explanation: 'После "Don\'t be" БЕЗ -ing. Просто: Don\'t be late! (не "being").', lite: 'Без -ing: Don\'t be late!' },
      { trigger: ['don\'t be late'], explanation: 'Правильно. ✓', lite: 'Правильно: Don\'t be late!' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'Call me! Write to me! Contact me! — с дополнением.',
    traps: [
      { trigger: ['you call me'], explanation: 'Без подлежащего: Call me! (не "You call").', lite: 'Без подлежащего: Call me!' },
      { trigger: ['to call me'], explanation: 'БЕЗ "to": Call me! (не "To call").', lite: 'Без "to": Call me!' },
      { trigger: ['call me'], explanation: 'Правильно. ✓', lite: 'Правильно: Call me!' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'Write to me! Send me an email! — с дополнением и предлогом.',
    traps: [
      { trigger: ['you write to me'], explanation: 'Без подлежащего: Write to me! (не "You write").', lite: 'Без подлежащего: Write!' },
      { trigger: ['to write to me'], explanation: 'БЕЗ "to": Write to me! (не "To write").', lite: 'Без "to": Write!' },
      { trigger: ['write to me'], explanation: 'Правильно. ✓', lite: 'Правильно: Write to me!' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Don\'t forget the documents! Don\'t lose your keys! — отрицание с объектом.',
    traps: [
      { trigger: ['not forget the documents'], explanation: 'Отрицание: "Don\'t" + глагол. Don\'t forget! (не "Not forget").', lite: 'Форма: Don\'t forget!' },
      { trigger: ['don\'t forgetting'], explanation: 'После "Don\'t" БЕЗ -ing. Просто: Don\'t forget! (не "forgetting").', lite: 'Без -ing: Don\'t forget!' },
      { trigger: ['don\'t forget the documents'], explanation: 'Правильно. ✓', lite: 'Правильно: Don\'t forget!' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'Come on time! Arrive early! Leave now! — глаголы движения.',
    traps: [
      { trigger: ['you come on time'], explanation: 'Без подлежащего: Come on time! (не "You come").', lite: 'Без подлежащего: Come on time!' },
      { trigger: ['to come on time'], explanation: 'БЕЗ "to": Come on time! (не "To come").', lite: 'Без "to": Come!' },
      { trigger: ['come on time'], explanation: 'Правильно. ✓', lite: 'Правильно: Come on time!' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'Turn off your phone! Turn on the light! — фразовые глаголы.',
    traps: [
      { trigger: ['you turn off your phone'], explanation: 'Без подлежащего: Turn off your phone! (не "You turn").', lite: 'Без подлежащего: Turn off!' },
      { trigger: ['to turn off'], explanation: 'БЕЗ "to": Turn off! (не "To turn").', lite: 'Без "to": Turn off!' },
      { trigger: ['turn off your phone'], explanation: 'Правильно. ✓', lite: 'Правильно: Turn off!' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'Don\'t interrupt me! Don\'t bother him! — отрицание с дополнением.',
    traps: [
      { trigger: ['not interrupt me'], explanation: 'Отрицание: "Don\'t" + глагол. Don\'t interrupt! (не "Not interrupt").', lite: 'Форма: Don\'t interrupt!' },
      { trigger: ['don\'t interrupting'], explanation: 'После "Don\'t" БЕЗ -ing. Просто: Don\'t interrupt! (не "interrupting").', lite: 'Без -ing: Don\'t interrupt!' },
      { trigger: ['don\'t interrupt me'], explanation: 'Правильно. ✓', lite: 'Правильно: Don\'t interrupt!' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'Please speak slowly! Please listen carefully! — с наречием.',
    traps: [
      { trigger: ['you speak slowly'], explanation: 'Без подлежащего: Speak slowly! или Please speak slowly!', lite: 'Без подлежащего: Speak slowly!' },
      { trigger: ['to speak slowly'], explanation: 'БЕЗ "to": Speak slowly! (не "To speak").', lite: 'Без "to": Speak!' },
      { trigger: ['please speak slowly'], explanation: 'Правильно. ✓', lite: 'Правильно: Please speak slowly!' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Repeat it once more! Explain this clearly! — повелительное с числительным/наречием.',
    traps: [
      { trigger: ['you repeat it'], explanation: 'Без подлежащего: Repeat it! (не "You repeat").', lite: 'Без подлежащего: Repeat it!' },
      { trigger: ['to repeat it'], explanation: 'БЕЗ "to": Repeat it! (не "To repeat").', lite: 'Без "to": Repeat!' },
      { trigger: ['repeat it once more'], explanation: 'Правильно. ✓', lite: 'Правильно: Repeat it!' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 19: Предлоги места (in/on/at/under/next to/between)
// ══════════════════════════════════════════════════════════════

const L19_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'IN = внутри замкнутого пространства (в комнате, в коробке, в машине). in the room, in the box',
    traps: [
      { trigger: ['on the room'], explanation: '"on" для поверхности, "in" для внутри. in the room (не "on the room").', lite: 'Внутри: in the room.' },
      { trigger: ['at the room'], explanation: '"at" для конкретного места (адреса). in the room (внутри).', lite: 'Внутри: in the room.' },
      { trigger: ['in the room'], explanation: 'Правильно. ✓', lite: 'Правильно: in the room.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'ON = на поверхности (на столе, на стене, на полу). on the table, on the floor',
    traps: [
      { trigger: ['in the table'], explanation: '"in" для внутри, "on" для поверхности. on the table (не "in the table").', lite: 'На поверхности: on the table.' },
      { trigger: ['at the table'], explanation: '"at" для места, "on" для поверхности. on the table.', lite: 'На поверхности: on the table.' },
      { trigger: ['on the table'], explanation: 'Правильно. ✓', lite: 'Правильно: on the table.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'AT = конкретное место (офис, встреча, остановка). at the office, at the meeting, at the bus stop',
    traps: [
      { trigger: ['in the office'], explanation: '"at" для конкретного места. at the office (не "in the office").', lite: 'Конкретное место: at the office.' },
      { trigger: ['on the meeting'], explanation: '"at" для события/встречи. at the meeting (не "on").', lite: 'Встреча/событие: at the meeting.' },
      { trigger: ['at the office'], explanation: 'Правильно. ✓', lite: 'Правильно: at the office.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'UNDER = под (under the table, under the bed). OVER = над (over the table, over my head).',
    traps: [
      { trigger: ['on the table under'], explanation: '"under" означает под. under the table (не "on the table under").', lite: 'Под: under the table.' },
      { trigger: ['above the table'], explanation: '"under" для под, "above" тоже для над. under the table.', lite: 'Под: under the table.' },
      { trigger: ['under the table'], explanation: 'Правильно. ✓', lite: 'Правильно: under the table.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'NEXT TO = рядом (next to the door, next to me). BESIDE (британский) тоже рядом.',
    traps: [
      { trigger: ['by the door'], explanation: '"by" может использоваться, но "next to" точнее. next to the door.', lite: 'Рядом: next to the door.' },
      { trigger: ['in the door'], explanation: '"in" для внутри, "next to" для рядом. next to the door.', lite: 'Рядом: next to the door.' },
      { trigger: ['next to the door'], explanation: 'Правильно. ✓', lite: 'Правильно: next to the door.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'BETWEEN = между двумя (between the chair and the table). AMONG = среди многих.',
    traps: [
      { trigger: ['in the middle of'], explanation: '"between" для точной позиции между двумя. between the chair and table.', lite: 'Между двумя: between.' },
      { trigger: ['in the chair and table'], explanation: '"between" точнее. between the chair and the table.', lite: 'Между двумя: between.' },
      { trigger: ['between the chair and the table'], explanation: 'Правильно. ✓', lite: 'Правильно: between.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'IN + ON комбинация: The book is on the shelf in the corner. (на полке, в углу)',
    traps: [
      { trigger: ['in the shelf'], explanation: '"on the shelf" (на поверхности полки). in the corner (в углу).', lite: 'На полке: on the shelf.' },
      { trigger: ['on the corner'], explanation: '"in the corner" (в углу). "in the corner" правильнее.', lite: 'В углу: in the corner.' },
      { trigger: ['on the shelf in the corner'], explanation: 'Правильно. ✓', lite: 'Правильно: on the shelf.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'Книга IN коробке (внутри), но ON столе (на поверхности).',
    traps: [
      { trigger: ['on the box'], explanation: 'Если внутри коробки: in the box. (не "on the box").', lite: 'Внутри: in the box.' },
      { trigger: ['in the table'], explanation: 'На столе: on the table. (не "in the table").', lite: 'На столе: on the table.' },
      { trigger: ['in the box'], explanation: 'Правильно (внутри). ✓', lite: 'Правильно: in the box.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'UNDER = под мостом. ABOVE/OVER = над мостом. BENEATH (литературное) = под.',
    traps: [
      { trigger: ['on the bridge'], explanation: '"under" для под, не "on". under the bridge.', lite: 'Под: under the bridge.' },
      { trigger: ['in the bridge'], explanation: '"under" для под. under the bridge.', lite: 'Под: under the bridge.' },
      { trigger: ['under the bridge'], explanation: 'Правильно. ✓', lite: 'Правильно: under the bridge.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'IN FRONT OF = спереди (in front of the car). BEHIND = сзади (behind the car).',
    traps: [
      { trigger: ['in front the car'], explanation: 'Предлог "of" обязателен: in front of the car. (не "in front the").', lite: 'in front of, не in front.' },
      { trigger: ['before the car'], explanation: '"in front of" для позиции. before = до (времени). in front of.', lite: 'Позиция: in front of.' },
      { trigger: ['in front of the car'], explanation: 'Правильно. ✓', lite: 'Правильно: in front of.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'ACROSS = через дорогу (across the road). ALONG = вдоль дороги (along the road).',
    traps: [
      { trigger: ['on the road'], explanation: '"across" для через, "along" для вдоль. across the road / along the road.', lite: 'Через: across; вдоль: along.' },
      { trigger: ['in the road'], explanation: '"across" или "along", не "in". across the road.', lite: 'Через: across the road.' },
      { trigger: ['across the road'], explanation: 'Правильно. ✓', lite: 'Правильно: across the road.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'IN город (in Moscow). ON улица (on the street). AT конкретное место (at the cinema).',
    traps: [
      { trigger: ['at moscow'], explanation: '"in Moscow" (в городе). in Moscow (не "at").', lite: 'Город: in Moscow.' },
      { trigger: ['in the street'], explanation: '"on the street" (на улице). on the street (не "in").', lite: 'Улица: on the street.' },
      { trigger: ['in moscow'], explanation: 'Правильно. ✓', lite: 'Правильно: in Moscow.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'AT THE BEGINNING (начало события). IN THE MIDDLE (середина). AT THE END (конец).',
    traps: [
      { trigger: ['in the beginning'], explanation: '"at the beginning" (начало события). at the beginning (не "in").', lite: 'Начало: at the beginning.' },
      { trigger: ['at the middle'], explanation: '"in the middle" (середина). in the middle (не "at").', lite: 'Середина: in the middle.' },
      { trigger: ['at the beginning'], explanation: 'Правильно. ✓', lite: 'Правильно: at the beginning.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'ON THE LEFT/RIGHT = на левой/правой стороне. ON MY LEFT = слева от меня.',
    traps: [
      { trigger: ['at the left'], explanation: '"on the left" для стороны. on the left (не "at").', lite: 'Сторона: on the left.' },
      { trigger: ['in my left'], explanation: '"on my left" для позиции. on my left (не "in").', lite: 'Позиция: on my left.' },
      { trigger: ['on the left'], explanation: 'Правильно. ✓', lite: 'Правильно: on the left.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'BETWEEN + AND: between the table and the chair. AMONG: among the flowers.',
    traps: [
      { trigger: ['between the table the chair'], explanation: 'Нужен "and": between the table and the chair.', lite: 'between + and.' },
      { trigger: ['among the table and chair'], explanation: '"among" для многих без "and". between для двух с "and".', lite: 'between + and.' },
      { trigger: ['between the table and the chair'], explanation: 'Правильно. ✓', lite: 'Правильно: between.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Комбинация: I am in the office at the table next to the window. (внутри, конкретное, рядом)',
    traps: [
      { trigger: ['i am on the office'], explanation: '"in the office" (внутри). in the office (не "on").', lite: 'Внутри: in the office.' },
      { trigger: ['i am in the office on the table'], explanation: '"at the table" (за столом). at the table (не "on").', lite: 'За столом: at the table.' },
      { trigger: ['i am in the office at the table'], explanation: 'Правильно. ✓', lite: 'Правильно: in the office at the table.' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 20: Артикли (a/an/the/-)
// ══════════════════════════════════════════════════════════════

const L20_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'A = перед согласной (a book, a cat). AN = перед гласной (an apple, an egg).',
    traps: [
      { trigger: ['a apple'], explanation: 'Перед гласной a, e, i, o, u → an. an apple (не "a apple").', lite: 'Гласная: an apple.' },
      { trigger: ['an book'], explanation: 'Перед согласной → a. a book (не "an book").', lite: 'Согласная: a book.' },
      { trigger: ['a book'], explanation: 'Правильно. ✓', lite: 'Правильно: a book.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'THE = определённый артикль (когда известен конкретный предмет). The book is on the table.',
    traps: [
      { trigger: ['book is good'], explanation: 'Если конкретный предмет: the. the book is good.', lite: 'Конкретный: the book.' },
      { trigger: ['the the book'], explanation: 'Один артикль. the book (не "the the book").', lite: 'Один артикль: the book.' },
      { trigger: ['the book is good'], explanation: 'Правильно. ✓', lite: 'Правильно: the book.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'БЕЗ АРТИКЛЯ (-) для общего множественного. Cats are animals. I like books.',
    traps: [
      { trigger: ['the cats are animals'], explanation: 'Общее утверждение: без артикля. Cats are animals (не "the cats").', lite: 'Общее: Cats are animals.' },
      { trigger: ['a cats are animals'], explanation: 'Множественное БЕЗ a/an. Cats (не "a cats").', lite: 'Множественное: Cats.' },
      { trigger: ['cats are animals'], explanation: 'Правильно. ✓', lite: 'Правильно: Cats are animals.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'A TEACHER (неопределённый). THE TEACHER (конкретный). He is a teacher / The teacher is here.',
    traps: [
      { trigger: ['he is teacher'], explanation: 'Перед профессией: a/an. he is a teacher (не "he is teacher").', lite: 'Профессия: a teacher.' },
      { trigger: ['the teacher walks'], explanation: 'Если конкретный учитель: the teacher. ✓ (контекст показывает.)','lite': 'Конкретный: the teacher.' },
      { trigger: ['he is a teacher'], explanation: 'Правильно. ✓', lite: 'Правильно: a teacher.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'THE перед уникальными (the sun, the moon, the Earth, the sky).',
    traps: [
      { trigger: ['a sun'], explanation: '"the sun" (уникальный). the sun (не "a sun").', lite: 'Уникальный: the sun.' },
      { trigger: ['sun is bright'], explanation: 'THE обязателен. the sun (не без артикля).', lite: 'THE: the sun.' },
      { trigger: ['the sun'], explanation: 'Правильно. ✓', lite: 'Правильно: the sun.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'A/AN для исчисляемых единственного. НЕТ артикля для неисчисляемых (water, love, information).',
    traps: [
      { trigger: ['a water'], explanation: '"water" неисчисляемое. Без артикля: water (не "a water").', lite: 'Неисчисляемое: no article.' },
      { trigger: ['a pen'], explanation: '"pen" исчисляемое. a pen. ✓', lite: 'Исчисляемое: a pen.' },
      { trigger: ['water'], explanation: 'Правильно. ✓', lite: 'Правильно: water.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'THE в конкретном контексте (который я купил, которого ты встретил). THE book I bought.',
    traps: [
      { trigger: ['book i bought'], explanation: 'Конкретный контекст → the. the book i bought.', lite: 'Контекст: the book.' },
      { trigger: ['a book i bought'], explanation: 'Конкретный → the, не a. the book i bought.', lite: 'Конкретный: the book.' },
      { trigger: ['the book i bought'], explanation: 'Правильно. ✓', lite: 'Правильно: the book.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'A перед согласным ЗВУКОМ (a European, a university). AN перед гласным ЗВУКОМ.',
    traps: [
      { trigger: ['an european'], explanation: '"European" звучит как "юроп..." (согласный звук). a European (не "an").', lite: 'Звук согласный: a European.' },
      { trigger: ['a university'], explanation: '"university" звучит как "юнив..." (согласный звук). a university (не "an").', lite: 'Звук согласный: a university.' },
      { trigger: ['a european'], explanation: 'Правильно. ✓', lite: 'Правильно: a European.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'AN перед гласным ЗВУКОМ (an hour, an honest man, an X-ray).',
    traps: [
      { trigger: ['a hour'], explanation: '"hour" звучит как "ауэр" (гласный звук). an hour (не "a hour").', lite: 'Звук гласный: an hour.' },
      { trigger: ['a x-ray'], explanation: '"X-ray" звучит как "экс..." (гласный звук). an X-ray (не "a").', lite: 'Звук гласный: an X-ray.' },
      { trigger: ['an hour'], explanation: 'Правильно. ✓', lite: 'Правильно: an hour.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'THE перед порядковыми числительными (the first, the second, the best, the tallest).',
    traps: [
      { trigger: ['first day'], explanation: 'Порядковое → the. the first day (не "first day").', lite: 'Порядковое: the first.' },
      { trigger: ['the 1 place'], explanation: 'Порядковые → the. the first place.', lite: 'Порядковое: the first.' },
      { trigger: ['the first day'], explanation: 'Правильно. ✓', lite: 'Правильно: the first.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'БЕЗ АРТИКЛЯ для языков (English, French, Russian). I speak English.',
    traps: [
      { trigger: ['the english'], explanation: 'Языки без артикля. English (не "the English").', lite: 'Язык: English.' },
      { trigger: ['the french language'], explanation: '"language" нужен артикль, но "French" без: French language.', lite: 'Язык: English / the language.' },
      { trigger: ['english'], explanation: 'Правильно. ✓', lite: 'Правильно: English.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'THE перед названиями учреждений (the British Museum, the Royal Theatre, the Louvre).',
    traps: [
      { trigger: ['british museum'], explanation: 'Музеи, театры → the. the British Museum.', lite: 'Учреждение: the Museum.' },
      { trigger: ['royal theatre'], explanation: 'Театры → the. the Royal Theatre.', lite: 'Театр: the Theatre.' },
      { trigger: ['the british museum'], explanation: 'Правильно. ✓', lite: 'Правильно: the Museum.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'THE перед газетами, журналами (the Times, the Guardian, the New York Times).',
    traps: [
      { trigger: ['times newspaper'], explanation: 'Газеты → the. the Times.', lite: 'Газета: the Times.' },
      { trigger: ['guardian magazine'], explanation: 'Журналы → the. the Guardian.', lite: 'Журнал: the Guardian.' },
      { trigger: ['the times'], explanation: 'Правильно. ✓', lite: 'Правильно: the Times.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'THE перед географическими названиями (the Thames, the Pacific Ocean, the Sahara).',
    traps: [
      { trigger: ['thames river'], explanation: 'Реки → the. the Thames.', lite: 'Река: the Thames.' },
      { trigger: ['pacific ocean'], explanation: 'Океаны → the. the Pacific Ocean.', lite: 'Океан: the Pacific.' },
      { trigger: ['the thames'], explanation: 'Правильно. ✓', lite: 'Правильно: the Thames.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'A/AN (один из многих). THE (известный). - (общее, множественное).',
    traps: [
      { trigger: ['i saw dog'], explanation: 'Один из многих → a. i saw a dog.', lite: 'Один: a dog.' },
      { trigger: ['the dog are animals'], explanation: 'Общее множественное без артикля. dogs are animals.', lite: 'Общее: Dogs are.' },
      { trigger: ['i saw a dog'], explanation: 'Правильно. ✓', lite: 'Правильно: a dog.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'THE с описанием существительного (the book on the table, the girl in the photo).',
    traps: [
      { trigger: ['book on the table'], explanation: 'С описанием → the. the book on the table.', lite: 'Описание: the book.' },
      { trigger: ['a book on the table'], explanation: 'С описанием → the, не a. the book on the table.', lite: 'Описание: the book.' },
      { trigger: ['the book on the table'], explanation: 'Правильно. ✓', lite: 'Правильно: the book.' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 21: Неопределённые местоимения (some/any/no/every + body/thing/where)
// ══════════════════════════════════════════════════════════════

const L21_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'SOME = утвердительное, вежливый вопрос. ANY = отрицание, обычный вопрос.',
    traps: [
      { trigger: ['do you have some water'], explanation: 'Обычный вопрос → any. Do you have any water? (не "some").', lite: 'Вопрос: any.' },
      { trigger: ['i don\'t have some water'], explanation: 'Отрицание → any. I don\'t have any water. (не "some").', lite: 'Отрицание: any.' },
      { trigger: ['i have some water'], explanation: 'Правильно (утвердительное). ✓', lite: 'Утверждение: some.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'SOMEBODY/SOMEONE = утвердительное. ANYBODY/ANYONE = вопрос, отрицание.',
    traps: [
      { trigger: ['do you see somebody'], explanation: 'Вопрос → anybody. Do you see anybody? (не "somebody").', lite: 'Вопрос: anybody.' },
      { trigger: ['i don\'t see somebody'], explanation: 'Отрицание → anybody. I don\'t see anybody. (не "somebody").', lite: 'Отрицание: anybody.' },
      { trigger: ['somebody is here'], explanation: 'Правильно (утвердительное). ✓', lite: 'Утверждение: somebody.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'SOMETHING = утвердительное. ANYTHING = вопрос, отрицание.',
    traps: [
      { trigger: ['do you want something'], explanation: 'Вопрос → anything. Do you want anything? (не "something").', lite: 'Вопрос: anything.' },
      { trigger: ['i don\'t want something'], explanation: 'Отрицание → anything. I don\'t want anything. (не "something").', lite: 'Отрицание: anything.' },
      { trigger: ['i want something'], explanation: 'Правильно (утвердительное). ✓', lite: 'Утверждение: something.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'SOMEWHERE = утвердительное. ANYWHERE = вопрос, отрицание.',
    traps: [
      { trigger: ['do you go somewhere'], explanation: 'Вопрос → anywhere. Do you go anywhere? (не "somewhere").', lite: 'Вопрос: anywhere.' },
      { trigger: ['i don\'t go somewhere'], explanation: 'Отрицание → anywhere. I don\'t go anywhere. (не "somewhere").', lite: 'Отрицание: anywhere.' },
      { trigger: ['i go somewhere'], explanation: 'Правильно (утвердительное). ✓', lite: 'Утверждение: somewhere.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'NO = не существует (никакой, никто, ничего). I have no water. There is no milk.',
    traps: [
      { trigger: ['i have not any water'], explanation: '"no" заменяет "not any". I have no water. (не "have not any").', lite: 'no = не существует.' },
      { trigger: ['there is not any milk'], explanation: '"no" заменяет "not any". There is no milk.', lite: 'no milk.' },
      { trigger: ['there is no water'], explanation: 'Правильно. ✓', lite: 'Правильно: no water.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'EVERY = каждый (every day, every person). EVERYBODY = каждый человек.',
    traps: [
      { trigger: ['all day'], explanation: '"every" для подряд идущих. every day (не "all day").', lite: 'Каждый: every day.' },
      { trigger: ['all people'], explanation: '"every" для каждого. every person (не "all people").', lite: 'Каждый: every person.' },
      { trigger: ['every day'], explanation: 'Правильно. ✓', lite: 'Правильно: every day.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'SOME в вежливом вопросе (предложение, помощь). Would you like some tea?',
    traps: [
      { trigger: ['would you like any tea'], explanation: 'Вежливый вопрос → some. Would you like some tea? (не "any").', lite: 'Вежливый: some.' },
      { trigger: ['can i have any water'], explanation: 'Просьба (вежливый) → some. Can I have some water?', lite: 'Просьба: some.' },
      { trigger: ['would you like some tea'], explanation: 'Правильно. ✓', lite: 'Правильно: some tea.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'ANYBODY в утвердительном = "не важно кто" (anyone can do it = любой может).',
    traps: [
      { trigger: ['somebody can do it'], explanation: 'Значение "любой" → anybody/anyone. Anyone can do it.', lite: 'Не важно кто: anybody.' },
      { trigger: ['someone can do it'], explanation: 'Значение "не важно кто" → anybody/anyone. Anyone can do it.', lite: 'Не важно кто: anyone.' },
      { trigger: ['anyone can do it'], explanation: 'Правильно. ✓', lite: 'Правильно: anyone.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'ANYTHING в утвердительном = "что угодно" (you can have anything = ты можешь иметь что угодно).',
    traps: [
      { trigger: ['you can have something'], explanation: 'Значение "что угодно" → anything. You can have anything.', lite: 'Что угодно: anything.' },
      { trigger: ['you can have nothing'], explanation: 'Значение "что угодно" → anything. You can have anything.', lite: 'Что угодно: anything.' },
      { trigger: ['you can have anything'], explanation: 'Правильно. ✓', lite: 'Правильно: anything.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'NOBODY = отрицание с "nobody" (nobody was here = никого не было).',
    traps: [
      { trigger: ['somebody was not here'], explanation: '"nobody" = форма отрицания. Nobody was here. (не "somebody was not").', lite: 'Отрицание: nobody.' },
      { trigger: ['anyone was not here'], explanation: '"nobody" точнее. Nobody was here.', lite: 'Отрицание: nobody.' },
      { trigger: ['nobody was here'], explanation: 'Правильно. ✓', lite: 'Правильно: nobody.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'NOTHING = отрицание (nothing was there = ничего не было).',
    traps: [
      { trigger: ['something is not here'], explanation: '"nothing" = форма отрицания. Nothing was here. (не "something is not").', lite: 'Отрицание: nothing.' },
      { trigger: ['anything is not there'], explanation: '"nothing" точнее. Nothing was there.', lite: 'Отрицание: nothing.' },
      { trigger: ['nothing was here'], explanation: 'Правильно. ✓', lite: 'Правильно: nothing.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'NOWHERE = отрицание (they went nowhere = они никуда не ходили).',
    traps: [
      { trigger: ['they went somewhere not'], explanation: '"nowhere" = форма отрицания. They went nowhere. (не "somewhere not").', lite: 'Отрицание: nowhere.' },
      { trigger: ['they didn\'t go anywhere'], explanation: '"nowhere" альтернатива. They went nowhere. или They didn\'t go anywhere.', lite: 'Отрицание: nowhere.' },
      { trigger: ['they went nowhere'], explanation: 'Правильно. ✓', lite: 'Правильно: nowhere.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'SOME с неисчисляемыми (some water, some milk). SOME с множественным (some books).',
    traps: [
      { trigger: ['some waters'], explanation: '"water" неисчисляемое. some water (не "some waters").', lite: 'Неисчисляемое: water.' },
      { trigger: ['some water'], explanation: 'Правильно. ✓', lite: 'Правильно: water.' },
      { trigger: ['some books'], explanation: 'Правильно (множественное). ✓', lite: 'Правильно: books.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'ANY с единственным (any book) или множественным (any books). Контекст.',
    traps: [
      { trigger: ['any books are fine'], explanation: '"any books" (в целом множественное). Any books are fine. или Any book is fine.', lite: 'Контекст: any book/books.' },
      { trigger: ['do you have any book'], explanation: 'Может быть any books. Do you have any books?', lite: 'Множественное: any books.' },
      { trigger: ['do you have any books'], explanation: 'Правильно. ✓', lite: 'Правильно: any books.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'EVERY + единственное число (every day, every person). EVERYBODY + глагол ед. числа.',
    traps: [
      { trigger: ['every days'], explanation: '"every" + единственное. every day (не "every days").', lite: 'Единственное: every day.' },
      { trigger: ['everyone are here'], explanation: '"everyone" + глагол ед. числа. Everyone is here. (не "are").', lite: 'Ед. число: Everyone is.' },
      { trigger: ['every day'], explanation: 'Правильно. ✓', lite: 'Правильно: every day.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'SOME/ANY/NO в комбинациях: somebody, something, somewhere. Орфография.',
    traps: [
      { trigger: ['somebady'], explanation: 'Правильно: somebody (не "somebady").', lite: 'somebody.' },
      { trigger: ['anywere'], explanation: 'Правильно: anywhere (не "anywere").', lite: 'anywhere.' },
      { trigger: ['somebody'], explanation: 'Правильно. ✓', lite: 'Правильно: somebody.' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 22: Герундий (verb + -ing как существительное)
// ══════════════════════════════════════════════════════════════

const L22_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Герундий = Глагол + -ing как существительное. I enjoy reading. Reading is healthy.',
    traps: [
      { trigger: ['i enjoy read'], explanation: 'После "enjoy" → герундий (-ing). I enjoy reading. (не "read").', lite: 'enjoy → reading.' },
      { trigger: ['i enjoy to read'], explanation: 'После "enjoy" → герундий, не инфинитив. I enjoy reading.', lite: 'enjoy → -ing.' },
      { trigger: ['i enjoy reading'], explanation: 'Правильно. ✓', lite: 'Правильно: reading.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'После finish, stop, start → герундий. He finished reading. Stop talking!',
    traps: [
      { trigger: ['he finished read'], explanation: 'После "finish" → герундий. He finished reading. (не "read").', lite: 'finish → reading.' },
      { trigger: ['he finished to read'], explanation: 'После "finish" → герундий, не инфинитив. He finished reading.', lite: 'finish → -ing.' },
      { trigger: ['he finished reading'], explanation: 'Правильно. ✓', lite: 'Правильно: reading.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'После avoid, prevent, deny → герундий. He avoided answering. Deny stealing.',
    traps: [
      { trigger: ['he avoided answer'], explanation: 'После "avoid" → герундий. He avoided answering. (не "answer").', lite: 'avoid → answering.' },
      { trigger: ['he avoided to answer'], explanation: 'После "avoid" → герундий, не инфинитив. He avoided answering.', lite: 'avoid → -ing.' },
      { trigger: ['he avoided answering'], explanation: 'Правильно. ✓', lite: 'Правильно: answering.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'Герундий = существительное (единственное число, глагол ед. числа). Reading is healthy.',
    traps: [
      { trigger: ['reading are healthy'], explanation: 'Герундий = ед. число. Reading is (не "are").', lite: 'Ед. число: is.' },
      { trigger: ['readings is healthy'], explanation: 'Герундий БЕЗ множественного. Reading (не "readings").', lite: 'Ед. число: Reading.' },
      { trigger: ['reading is healthy'], explanation: 'Правильно. ✓', lite: 'Правильно: is healthy.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'После предлогов (in, by, without, after, before) → герундий. After eating, I felt better.',
    traps: [
      { trigger: ['after eat'], explanation: 'После предлога → герундий. After eating. (не "eat").', lite: 'После предлога: -ing.' },
      { trigger: ['after to eat'], explanation: 'После предлога → герундий, не инфинитив. After eating.', lite: 'После предлога: -ing.' },
      { trigger: ['after eating'], explanation: 'Правильно. ✓', lite: 'Правильно: eating.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Герундий как подлежащее. Swimming is healthy. Waiting is boring.',
    traps: [
      { trigger: ['to swim is healthy'], explanation: 'Герундий как подлежащее звучит естественнее. Swimming is healthy.', lite: 'Подлежащее: Swimming.' },
      { trigger: ['swim is healthy'], explanation: 'Нужна форма -ing. Swimming is healthy.', lite: 'Добавьте -ing: Swimming.' },
      { trigger: ['swimming is healthy'], explanation: 'Правильно. ✓', lite: 'Правильно: Swimming.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'После suggest, recommend, advise → герундий. I suggest waiting. I recommend going.',
    traps: [
      { trigger: ['i suggest wait'], explanation: 'После "suggest" → герундий. I suggest waiting. (не "wait").', lite: 'suggest → waiting.' },
      { trigger: ['i suggest to wait'], explanation: 'После "suggest" → герундий, не инфинитив. I suggest waiting.', lite: 'suggest → -ing.' },
      { trigger: ['i suggest waiting'], explanation: 'Правильно. ✓', lite: 'Правильно: waiting.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'После appreciate, mind, consider → герундий. I appreciate you helping. Mind waiting?',
    traps: [
      { trigger: ['i appreciate you help'], explanation: 'После "appreciate" → герундий. I appreciate you helping. (не "help").', lite: 'appreciate → helping.' },
      { trigger: ['i appreciate you to help'], explanation: 'После "appreciate" → герундий, не инфинитив. I appreciate you helping.', lite: 'appreciate → -ing.' },
      { trigger: ['i appreciate you helping'], explanation: 'Правильно. ✓', lite: 'Правильно: helping.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'Глаголы на -e теряют e: make → making, take → taking, give → giving.',
    traps: [
      { trigger: ['makeing'], explanation: 'make + -ing = making (БЕЗ e). making (не "makeing").', lite: 'make → making.' },
      { trigger: ['takeing'], explanation: 'take + -ing = taking (БЕЗ e). taking (не "takeing").', lite: 'take → taking.' },
      { trigger: ['making'], explanation: 'Правильно. ✓', lite: 'Правильно: making.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'Согласная удваивается (ударный слог): sit → sitting, run → running, swim → swimming.',
    traps: [
      { trigger: ['siting'], explanation: 'sit + -ing = sitting (удвойте). sitting (не "siting").', lite: 'sit → sitting.' },
      { trigger: ['runing'], explanation: 'run + -ing = running (удвойте). running (не "runing").', lite: 'run → running.' },
      { trigger: ['sitting'], explanation: 'Правильно. ✓', lite: 'Правильно: sitting.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Герундий с объектом: I appreciate your helping. или I appreciate you helping.',
    traps: [
      { trigger: ['i appreciate helping'], explanation: 'С объектом: your helping или you helping. I appreciate your helping.', lite: 'С объектом: your helping.' },
      { trigger: ['i appreciate you to help'], explanation: 'Герундий, не инфинитив. I appreciate you helping.', lite: 'Герундий: you helping.' },
      { trigger: ['i appreciate your helping'], explanation: 'Правильно. ✓', lite: 'Правильно: your helping.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'После spend (time) → герундий. I spent an hour reading. We spend time playing.',
    traps: [
      { trigger: ['i spent an hour to read'], explanation: 'После "spend (time)" → герундий. I spent an hour reading.', lite: 'spend → -ing.' },
      { trigger: ['i spent an hour read'], explanation: 'После "spend (time)" → герундий. I spent an hour reading.', lite: 'spend → -ing.' },
      { trigger: ['i spent an hour reading'], explanation: 'Правильно. ✓', lite: 'Правильно: reading.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'После waste (time) → герундий. Don\'t waste time waiting. Wasting time is bad.',
    traps: [
      { trigger: ['don\'t waste time to wait'], explanation: 'После "waste (time)" → герундий. Don\'t waste time waiting.', lite: 'waste → -ing.' },
      { trigger: ['don\'t waste time wait'], explanation: 'После "waste (time)" → герундий. Don\'t waste time waiting.', lite: 'waste → -ing.' },
      { trigger: ['don\'t waste time waiting'], explanation: 'Правильно. ✓', lite: 'Правильно: waiting.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'После imagine, consider, practice → герундий. Imagine living here. Practice speaking.',
    traps: [
      { trigger: ['imagine to live'], explanation: 'После "imagine" → герундий. Imagine living. (не инфинитив).', lite: 'imagine → -ing.' },
      { trigger: ['imagine live'], explanation: 'После "imagine" → герундий. Imagine living.', lite: 'imagine → -ing.' },
      { trigger: ['imagine living here'], explanation: 'Правильно. ✓', lite: 'Правильно: living.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'После miss, fail, postpone → герундий. He missed catching the train. Don\'t postpone finishing.',
    traps: [
      { trigger: ['he missed to catch'], explanation: 'После "miss" → герундий. He missed catching.', lite: 'miss → -ing.' },
      { trigger: ['he missed catch'], explanation: 'После "miss" → герундий. He missed catching.', lite: 'miss → -ing.' },
      { trigger: ['he missed catching the train'], explanation: 'Правильно. ✓', lite: 'Правильно: catching.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Герундий с артиклями и предлогами. The reading was boring. By singing, she won.',
    traps: [
      { trigger: ['reading was boring'], explanation: 'С артиклем: The reading was boring.', lite: 'Артикль: The reading.' },
      { trigger: ['by sing'], explanation: 'После предлога: by singing.', lite: 'После предлога: singing.' },
      { trigger: ['the reading was boring'], explanation: 'Правильно. ✓', lite: 'Правильно: The reading.' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 23: Passive Voice (be + V3)
// ══════════════════════════════════════════════════════════════

const L23_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Passive Voice = am/is/are + V3. The book is written by the author.',
    traps: [
      { trigger: ['the book is write'], explanation: 'Passive: be + V3 (written), не базовая форма. is written (не "is write").', lite: 'Passive: be + V3.' },
      { trigger: ['the book written'], explanation: 'Нужен глагол "is". The book is written.', lite: 'Нужен "is": is written.' },
      { trigger: ['the book is written by the author'], explanation: 'Правильно. ✓', lite: 'Правильно: is written.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'Passive в прошедшем: was/were + V3. The letter was written by the secretary.',
    traps: [
      { trigger: ['the letter was write'], explanation: 'Past Passive: was + V3 (written). was written (не "was write").', lite: 'Past: was + V3.' },
      { trigger: ['the letter written'], explanation: 'Нужен "was". The letter was written.', lite: 'Нужен "was": was written.' },
      { trigger: ['the letter was written by the secretary'], explanation: 'Правильно. ✓', lite: 'Правильно: was written.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'Вопрос в Passive: Is/Was + Subject + V3? Is the book written? Was the letter sent?',
    traps: [
      { trigger: ['is the book write'], explanation: 'Вопрос Passive: Is + book + written? (не "is write").', lite: 'Вопрос: Is written?' },
      { trigger: ['the book is written'], explanation: 'Утверждение. Вопрос: Is the book written?', lite: 'Вопрос: Is written?' },
      { trigger: ['is the book written'], explanation: 'Правильно. ✓', lite: 'Правильно: Is written?' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'Отрицание в Passive: am/is/are + not + V3. The book is not written.',
    traps: [
      { trigger: ['the book is not write'], explanation: 'Отрицание Passive: not + V3. is not written (не "is not write").', lite: 'Отрицание: not + V3.' },
      { trigger: ['the book not written'], explanation: 'Нужен "is". The book is not written.', lite: 'Нужен "is": is not written.' },
      { trigger: ['the book is not written'], explanation: 'Правильно. ✓', lite: 'Правильно: not written.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'Неправильные V3: write → written, send → sent, build → built.',
    traps: [
      { trigger: ['is writed'], explanation: 'Неправильный V3: written (не "writed"). is written.', lite: 'write → written.' },
      { trigger: ['is sended'], explanation: 'Неправильный V3: sent (не "sended"). is sent.', lite: 'send → sent.' },
      { trigger: ['is written'], explanation: 'Правильно. ✓', lite: 'Правильно: written.' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'BY в Passive = кто выполнил действие. The book is written BY the author.',
    traps: [
      { trigger: ['the book is written from the author'], explanation: '"by" = деятель. by the author (не "from").', lite: 'Деятель: by the author.' },
      { trigger: ['the book is written to the author'], explanation: '"by" = деятель. by the author (не "to").', lite: 'Деятель: by the author.' },
      { trigger: ['the book is written by the author'], explanation: 'Правильно. ✓', lite: 'Правильно: by the author.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'Passive без "by" (если не важно, кто). The book is written. (конкретный автор не важен)',
    traps: [
      { trigger: ['the book is written by someone'], explanation: 'Если не важно → без "by". The book is written.', lite: 'Без деятеля: is written.' },
      { trigger: ['the book is written'], explanation: 'Правильно (без деятеля). ✓', lite: 'Правильно: is written.' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'Present Perfect Passive: has/have been + V3. The book has been written.',
    traps: [
      { trigger: ['the book has written'], explanation: 'Perfect Passive: has + been + V3. has been written (не "has written").', lite: 'Perfect: has been + V3.' },
      { trigger: ['the book has been written'], explanation: 'Правильно. ✓', lite: 'Правильно: has been written.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'Passive с модальными: can/should/must + be + V3. The work can be done.',
    traps: [
      { trigger: ['the work can done'], explanation: 'С модальными: modal + be + V3. can be done (не "can done").', lite: 'Modal: + be + V3.' },
      { trigger: ['the work can be done'], explanation: 'Правильно. ✓', lite: 'Правильно: can be done.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'Active → Passive трансформация. Active: The author writes the book. Passive: The book is written.',
    traps: [
      { trigger: ['the book is write by the author'], explanation: 'Passive: is + V3 (written). is written (не "is write").', lite: 'Passive: is + V3.' },
      { trigger: ['the book is written by the author'], explanation: 'Правильно. ✓', lite: 'Правильно: is written.' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Правильные V3 = V2 + -ed. help → helped, open → opened.',
    traps: [
      { trigger: ['is helpd'], explanation: 'help + -ed = helped. helped (не "helpd").', lite: 'help → helped.' },
      { trigger: ['is opened'], explanation: 'Правильно. ✓', lite: 'Правильно: opened.' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'Правильные на -e: destroy → destroyed, produce → produced.',
    traps: [
      { trigger: ['is destroyd'], explanation: 'destroy + -ed = destroyed. destroyed (не "destroyd").', lite: 'destroy → destroyed.' },
      { trigger: ['is destroyed'], explanation: 'Правильно. ✓', lite: 'Правильно: destroyed.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'Passive с "use": This tool is used for cutting. (используется)',
    traps: [
      { trigger: ['this tool use for cutting'], explanation: 'Passive: is + used. is used (не "use").', lite: 'Passive: is used.' },
      { trigger: ['this tool is used for cutting'], explanation: 'Правильно. ✓', lite: 'Правильно: is used.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'Passive в прошедшем: was/were + V3. The work was done yesterday.',
    traps: [
      { trigger: ['the work was do'], explanation: 'Past Passive: was + V3. was done (не "was do").', lite: 'Past: was + V3.' },
      { trigger: ['the work was done yesterday'], explanation: 'Правильно. ✓', lite: 'Правильно: was done.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'Passive с инфинитивом: The work needs to be done. The book should be read.',
    traps: [
      { trigger: ['the work needs do'], explanation: 'После "needs": to be + V3. needs to be done.', lite: 'Инфинитив: to be + V3.' },
      { trigger: ['the work needs to be done'], explanation: 'Правильно. ✓', lite: 'Правильно: to be done.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Вопрос Passive с Who: Who was the book written by? / By whom was the book written?',
    traps: [
      { trigger: ['who was written the book'], explanation: 'Вопрос: Who was the book written by? (не "written the book").', lite: 'Вопрос: Who was written?' },
      { trigger: ['who was the book written by'], explanation: 'Правильно. ✓', lite: 'Правильно: Who was written by?' }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 24: Present Perfect (have/has + V3)
// ══════════════════════════════════════════════════════════════

const L24_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Present Perfect = have/has + V3. I have written a letter. (написал письмо)',
    traps: [
      { trigger: ['i have write'], explanation: 'Perfect: have + V3 (written), не базовая форма. have written (не "have write").', lite: 'Perfect: have + V3.' },
      { trigger: ['i write a letter'], explanation: 'Не пропускайте "have". I have written a letter.', lite: 'Нужен "have": have written.' },
      { trigger: ['i have written a letter'], explanation: 'Правильно. ✓', lite: 'Правильно: have written.' }
    ]
  },
  {
    phraseIndex: 1,
    generalRule: 'He/She/It → has (не have). He has written a letter. She has gone home.',
    traps: [
      { trigger: ['he have written'], explanation: 'С He/She/It → has (не "have"). he has written.', lite: 'He/She/It: has.' },
      { trigger: ['he has write'], explanation: 'После "has" → V3. has written (не "has write").', lite: 'После "has": V3.' },
      { trigger: ['he has written a letter'], explanation: 'Правильно. ✓', lite: 'Правильно: has written.' }
    ]
  },
  {
    phraseIndex: 2,
    generalRule: 'Неправильные V3: write → written, go → gone, see → seen.',
    traps: [
      { trigger: ['have writed'], explanation: 'Неправильный V3: written (не "writed"). have written.', lite: 'write → written.' },
      { trigger: ['have goed'], explanation: 'Неправильный V3: gone (не "goed"). have gone.', lite: 'go → gone.' },
      { trigger: ['have written'], explanation: 'Правильно. ✓', lite: 'Правильно: written.' }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'Правильные V3 = V2 + -ed. help → helped, open → opened.',
    traps: [
      { trigger: ['have helpd'], explanation: 'help + -ed = helped. helped (не "helpd").', lite: 'help → helped.' },
      { trigger: ['have helped'], explanation: 'Правильно. ✓', lite: 'Правильно: helped.' }
    ]
  },
  {
    phraseIndex: 4,
    generalRule: 'Вопрос Perfect: Have/Has + Subject + V3? Have you written the letter? Has he gone?',
    traps: [
      { trigger: ['have you write the letter'], explanation: 'Вопрос Perfect: Have + you + written? (не "write").', lite: 'Вопрос: Have written?' },
      { trigger: ['have you written the letter'], explanation: 'Правильно. ✓', lite: 'Правильно: Have written?' }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Отрицание Perfect: have/has + not + V3. I have not written. He has not gone.',
    traps: [
      { trigger: ['i have not write'], explanation: 'Отрицание Perfect: have not + V3. have not written (не "have not write").', lite: 'Отрицание: not + V3.' },
      { trigger: ['i have not written'], explanation: 'Правильно. ✓', lite: 'Правильно: not written.' }
    ]
  },
  {
    phraseIndex: 6,
    generalRule: 'Perfect vs. Simple: Have you written? (общее) vs. Did you write yesterday? (конкретное время)',
    traps: [
      { trigger: ['did you written the letter'], explanation: 'Perfect (общее) или Simple (конкретное). Have you written? / Did you write?', lite: 'Perfect или Simple.' },
      { trigger: ['have you written'], explanation: 'Правильно (без конкретного времени). ✓', lite: 'Правильно: Have written?' }
    ]
  },
  {
    phraseIndex: 7,
    generalRule: 'Just = только что. I have just finished my work. (только что закончил)',
    traps: [
      { trigger: ['i just finished'], explanation: '"just" в Perfect: have just + V3. have just finished.', lite: 'just: have just.' },
      { trigger: ['i have just finished'], explanation: 'Правильно. ✓', lite: 'Правильно: just finished.' }
    ]
  },
  {
    phraseIndex: 8,
    generalRule: 'Already = уже. I have already eaten lunch. (уже поел)',
    traps: [
      { trigger: ['i already ate'], explanation: '"already" в Perfect: have already + V3. have already eaten.', lite: 'already: have already.' },
      { trigger: ['i have already eaten'], explanation: 'Правильно. ✓', lite: 'Правильно: already eaten.' }
    ]
  },
  {
    phraseIndex: 9,
    generalRule: 'Yet = ещё (в конце вопроса/отрицания). Have you finished yet? I have not finished yet.',
    traps: [
      { trigger: ['have you finished'], explanation: '"yet" в конце вопроса: Have you finished yet?', lite: 'yet в конце.' },
      { trigger: ['have you finished yet'], explanation: 'Правильно. ✓', lite: 'Правильно: finished yet?' }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Ever = когда-либо (в вопросе). Have you ever been to Paris? Have you ever seen this?',
    traps: [
      { trigger: ['did you ever go'], explanation: '"ever" в Perfect вопросе: Have you ever + V3? Have you ever been?', lite: 'ever: Perfect.' },
      { trigger: ['have you ever been to paris'], explanation: 'Правильно. ✓', lite: 'Правильно: ever been?' }
    ]
  },
  {
    phraseIndex: 11,
    generalRule: 'Never = никогда. I have never eaten sushi. She has never seen the film.',
    traps: [
      { trigger: ['i never ate'], explanation: '"never" в Perfect: have never + V3. have never eaten.', lite: 'never: have never.' },
      { trigger: ['i have never eaten sushi'], explanation: 'Правильно. ✓', lite: 'Правильно: never eaten.' }
    ]
  },
  {
    phraseIndex: 12,
    generalRule: 'For = период времени. I have lived here for 5 years. (живу 5 лет)',
    traps: [
      { trigger: ['i live here for 5 years'], explanation: '"for" + период → Perfect. have lived here for 5 years.', lite: 'for: Perfect.' },
      { trigger: ['i have lived here for 5 years'], explanation: 'Правильно. ✓', lite: 'Правильно: for 5 years.' }
    ]
  },
  {
    phraseIndex: 13,
    generalRule: 'Since = с момента (точка начала). I have studied since 2020. She has worked since morning.',
    traps: [
      { trigger: ['i study since 2020'], explanation: '"since" + точка → Perfect. have studied since 2020.', lite: 'since: Perfect.' },
      { trigger: ['i have studied since 2020'], explanation: 'Правильно. ✓', lite: 'Правильно: since 2020.' }
    ]
  },
  {
    phraseIndex: 14,
    generalRule: 'Perfect без времени (I have seen) vs. Simple с конкретным (I saw yesterday).',
    traps: [
      { trigger: ['i have seen the film last week'], explanation: 'С "last week" → Simple. I saw the film last week.', lite: 'Конкретное время: Simple.' },
      { trigger: ['i have seen the film'], explanation: 'Без времени → Perfect. ✓', lite: 'Правильно: Perfect.' }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Вопрос с "How many times": How many times have you been to London?',
    traps: [
      { trigger: ['how many times did you go'], explanation: '"How many times" → Perfect. How many times have you been?', lite: 'How many: Perfect.' },
      { trigger: ['how many times have you been to london'], explanation: 'Правильно. ✓', lite: 'Правильно: have you been?' }
    ]
  }
];

export const TRAPS_17_24: LessonErrorTrapsMap = {
  17: L17_TRAPS,
  18: L18_TRAPS,
  19: L19_TRAPS,
  20: L20_TRAPS,
  21: L21_TRAPS,
  22: L22_TRAPS,
  23: L23_TRAPS,
  24: L24_TRAPS,
};
