// app/error_traps/error_traps_25_32.ts
// Система контекстных объяснений — Уроки 25-32
// phraseIndex — 0-based, соответствует порядку фраз в lessons_tmp_25_32.ts

import type { PhraseErrorTraps, LessonErrorTrapsMap } from '../types/feedback';

// ══════════════════════════════════════════════════════════════
// УРОК 25: Past Continuous (was/were + -ing)
// ══════════════════════════════════════════════════════════════

const L25_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Past Continuous: was/were + V-ing. Схема: I/He/She/It + was + V-ing. (I was working.)',
    traps: [
      {
        trigger: ['i work', 'i was work', 'i working'],
        explanation: 'Нужна форма was + ing. Правильно: "I was working", не "I was work" или "I working". (I was working when she called.)',
        lite: 'Past Continuous: was + V-ing. I was working.'
      },
      {
        trigger: ['was go', 'was sit', 'was read'],
        explanation: 'После "was" глагол + -ing: "was going", "was sitting", "was reading". Не пропускайте окончание -ing. (She was reading.)',
        lite: 'Не забывайте -ing: was going, was sitting, was reading.'
      },
      {
        trigger: ['were working', 'were having'],
        explanation: 'С I/He/She/It используется "was", не "were". (I was working, He was listening, не "I were working".)',
        lite: 'С I/He/She/It только "was": I was, He was.'
      },
      {
        trigger: ['was not working', 'weren not'],
        explanation: 'Отрицание: was not + V-ing (или wasn\'t). (He was not listening, He wasn\'t listening.)',
        lite: 'Отрицание: was not + V-ing или wasn\'t.'
      },
      {
        trigger: ['they was', 'you was', 'we was'],
        explanation: 'С They/You/We используется "were". (They were waiting, You were speaking, We were discussing.)',
        lite: 'С They/You/We только "were": They were, You were.'
      },
      {
        trigger: ['what you doing', 'what were you do'],
        explanation: 'Вопрос: What + were/was + you + V-ing? (What were you doing at midnight?)',
        lite: 'Вопрос: What were you doing?'
      },
      {
        trigger: ['while she was read', 'while they discussing'],
        explanation: 'После "while" + was/were + V-ing. (While she was reading, While they were discussing.)',
        lite: 'While + was/were + V-ing: While reading, While discussing.'
      },
      {
        trigger: ['she was smile', 'he was cry', 'they was play'],
        explanation: 'Убедитесь в -ing форме: "was smiling", "was crying", "were playing". (She was smiling, He was crying.)',
        lite: 'Проверьте -ing: smiling, crying, playing.'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Вопросы в Past Continuous: Were + Subject + V-ing? (What were you doing?)',
    traps: [
      {
        trigger: ['did you doing', 'did they working'],
        explanation: 'Не смешивайте Simple Past и Past Continuous. Для действия в процессе: "Were you...?", не "Did you...?". (What were you doing?)',
        lite: 'Past Continuous вопрос: Were you...?, не Did you...?'
      }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'While + Past Continuous: действия одновременно. (While we were preparing, he was waiting.)',
    traps: [
      {
        trigger: ['while we prepare', 'while he was wait'],
        explanation: 'После "while" оба глагола в Past Continuous. (While we were preparing the proposal, the client was waiting.)',
        lite: 'While + Past Continuous: While we were preparing.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 26: Условные предложения (if + Present → will; if + Past → would)
// ══════════════════════════════════════════════════════════════

const L26_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Type 1 (реальное): if + Present Simple, will + V1. (If I go, I will see you.)',
    traps: [
      {
        trigger: ['if i will go', 'if you will see', 'if he will come'],
        explanation: 'В if-части (Type 1) НЕ используется "will". Правильно: "if I go", не "if I will go". (If I go, I will see you.)',
        lite: 'If-часть без will: "If I go", не "If I will go".'
      },
      {
        trigger: ['if go', 'if you see'],
        explanation: 'В if-части НУЖЕН глагол в Present Simple. (If you go, If she comes.)',
        lite: 'If-часть: Present Simple (If you go).'
      },
      {
        trigger: ['if i go you see', 'if she comes will he'],
        explanation: 'Главная часть: will + V1. (If I go, you will see me.)',
        lite: 'Главная часть: will + V1.'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Type 2 (нереальное): if + Past Simple, would + V1. (If I went, I would see you.)',
    traps: [
      {
        trigger: ['if i would go', 'if you would see', 'if he would come'],
        explanation: 'В if-части (Type 2) НЕ используется "would". В if-части — Past Simple. (If I went, If he came.)',
        lite: 'If-часть: Past, не would. If I went, не "If I would go".'
      },
      {
        trigger: ['if i go would', 'if you see would'],
        explanation: 'Type 2: if + Past Simple. Правильно: "if I went", не "if I go". (If I went, I would see you.)',
        lite: 'Type 2: if + Past Simple (If I went).'
      },
      {
        trigger: ['if was', 'if were'],
        explanation: 'Для "be" в Type 2 используется "were" для всех лиц: "if I were", "if he were". (If I were you...)',
        lite: 'Для "be" в Type 2: were для всех. If I were, If he were.'
      },
      {
        trigger: ['if i go would see', 'if he went will'],
        explanation: 'Type 2 главная часть: would + V1, не will. (If he went, he would understand.)',
        lite: 'Type 2 главная часть: would + V1.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 27: Косвенная речь (Reported Speech)
// ══════════════════════════════════════════════════════════════

const L27_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Sequence of tenses: He said that he was tired. При Past глагол сдвигается назад. (She said she was working.)',
    traps: [
      {
        trigger: ['she said she is', 'he said he am', 'they said they are'],
        explanation: 'Сдвиг времён: если главный глагол в Past, придаточное тоже сдвигается. Present → Past (is → was). (She said she was tired.)',
        lite: 'Сдвиг времён: is → was. She said she was tired.'
      },
      {
        trigger: ['said that he works', 'told me she go', 'said they come'],
        explanation: 'Косвенная речь требует сдвига времён. Present Simple → Past Simple. (He said he worked, She said she was ready.)',
        lite: 'Сдвиг времён при косвенной речи.'
      },
      {
        trigger: ['she said that i', 'he told she', 'they said they am'],
        explanation: 'Проверьте согласование времён. После Past глагола подчинённое предложение в Past. (She said that she was tired.)',
        lite: 'После Past глагола: Past в придаточном.'
      }
    ]
  },
  {
    phraseIndex: 3,
    generalRule: 'He said that he had already sent the letter. Perfect → Past Perfect при сдвиге. (He said he had done it.)',
    traps: [
      {
        trigger: ['said he send', 'said they go', 'told me she come'],
        explanation: 'Для действия, которое произошло до момента речи, используйте Past Perfect (had + V3). (He said he had sent the letter.)',
        lite: 'До события: had + V3. He had sent.'
      },
      {
        trigger: ['said he did send', 'said she has done'],
        explanation: 'Past Perfect выражает предшествование. (He said he had already sent it, не "He said he did send".)',
        lite: 'Past Perfect для предшествования: had + V3.'
      }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'He asked where I lived. Вопросы: вспомогательный глагол опускается, порядок слов как в утверждении.',
    traps: [
      {
        trigger: ['asked where do i live', 'asked how much does it cost', 'asked when will you'],
        explanation: 'В косвенных вопросах порядок слов как в утверждении. (He asked where I lived, не "He asked where do I live".)',
        lite: 'Косвенный вопрос: порядок как в утверждении. Where I lived.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 28: Возвратные местоимения (myself, yourself, himself...)
// ══════════════════════════════════════════════════════════════

const L28_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Reflexive pronouns: I did it myself. При субъект = объект используются myself/yourself/himself и т.д.',
    traps: [
      {
        trigger: ['he washed him', 'she cut her', 'i help me'],
        explanation: 'Когда субъект и объект — одно лицо, используйте reflexive pronoun: "he washed himself", не "he washed him". (She cut herself.)',
        lite: 'Reflexive: он себя → himself. She cut herself.'
      },
      {
        trigger: ['they did they', 'you help you', 'we see we'],
        explanation: 'Используйте себя-формы: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves. (They helped themselves.)',
        lite: 'Reflexive pronouns: myself, yourself, himself...'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Emphasis (выделение): I did it myself = I, not anyone else. (He wrote the speech himself.)',
    traps: [
      {
        trigger: ['did it him', 'wrote it she'],
        explanation: 'Для выделения субъекта (сам/сама) используйте reflexive pronoun в конце. (He wrote it himself.)',
        lite: 'Выделение: ...myself, ...himself. He wrote it himself.'
      }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Feel, believe, pride себя-формы: She is proud of herself. Не используйте просто личные местоимения.',
    traps: [
      {
        trigger: ['proud of her', 'proud of him', 'control of her'],
        explanation: 'С глаголами типа "be proud", "take control", "believe in" себя - форма. (She is proud of herself.)',
        lite: 'Proud of herself, Control of himself.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 29: Used to (used to + V1)
// ══════════════════════════════════════════════════════════════

const L29_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Used to + V1 (привычка в прошлом). Форма: used to, не "use to" или "used for". (I used to go there.)',
    traps: [
      {
        trigger: ['use to go', 'use to live', 'use to work'],
        explanation: '"Used to" (с "d" в конце) выражает прошлую привычку. "Use to" — неправильно. (I used to go there every day.)',
        lite: 'Used to, не use to. I used to go.'
      },
      {
        trigger: ['used go', 'used to went', 'used to going'],
        explanation: 'После "used to" инфинитив без "to": V1. (used to go, used to live, не "used to going".)',
        lite: 'Used to + V1: used to go, used to live.'
      },
      {
        trigger: ['i used to am', 'he used to is'],
        explanation: 'After "used to" глагол, не вспомогательный. (I used to be happy, не "I used to am happy".)',
        lite: 'Used to + V1: used to be, не used to am.'
      }
    ]
  },
  {
    phraseIndex: 0,
    generalRule: 'Отрицание: did not use to / didn\'t use to (не "didn\'t used to"). (I didn\'t use to like it.)',
    traps: [
      {
        trigger: ['didn\'t used to', 'did not used to'],
        explanation: 'В прошедшем времени: did not use to (без "d"). Правильно: "didn\'t use to", не "didn\'t used to". (He didn\'t use to smoke.)',
        lite: 'Отрицание: didn\'t use to, не didn\'t used to.'
      }
    ]
  },
  {
    phraseIndex: 0,
    generalRule: 'Вопрос: Did you use to...? (не "Did you used to...?"). (Did you use to live there?)',
    traps: [
      {
        trigger: ['did you used to', 'did he used to'],
        explanation: 'Вопрос в прошедшем: Did + you + use to + V? (Did you use to live there?)',
        lite: 'Вопрос: Did you use to...?, не Did you used to?'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 30: Relative Clauses (who/which/that)
// ══════════════════════════════════════════════════════════════

const L30_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Relative pronouns: who (люди), which (вещи), that (оба). The man who lives here. The book which I read.',
    traps: [
      {
        trigger: ['the man which', 'the woman which', 'the person which'],
        explanation: 'Для людей используйте "who", не "which". (The man who lives here, The woman who works here.)',
        lite: 'Люди: who. The man who, не the man which.'
      },
      {
        trigger: ['the book who', 'the car who', 'the table who'],
        explanation: 'Для вещей используйте "which", не "who". (The book which I read, The car which I drive.)',
        lite: 'Вещи: which. The book which, не the book who.'
      },
      {
        trigger: ['the man that lives', 'the book that i'],
        explanation: '"That" может заменять who/which в определительных придаточных. (The man that lives here = The man who lives here.)',
        lite: 'That может заменить who/which.'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Основное отличие: who/which/that заменяют подлежащее. The man who is here. The book which is red.',
    traps: [
      {
        trigger: ['whose who', 'what which'],
        explanation: '"Whose" — для принадлежности (чей?). "Who/Which" — для подлежащего. (The man whose book is here.)',
        lite: 'Whose = чей? Who/Which = подлежащее.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 31: Complex Object (want/see/hear + object + infinitive)
// ══════════════════════════════════════════════════════════════

const L31_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Complex Object: want/see/hear + object + to infinitive. (I want you to go. He heard me sing.)',
    traps: [
      {
        trigger: ['i want that you go', 'i want him that', 'i see that she'],
        explanation: 'Не используйте "that". Правильно: want/see/hear + object + infinitive. (I want him to go, не "I want that he go".)',
        lite: 'Complex Object: want + object + to V. I want him to go.'
      },
      {
        trigger: ['i want you going', 'he heard me going', 'i see them playing'],
        explanation: 'После объекта инфинитив без -ing. (I want you to go, He heard me sing, не "I want you going".)',
        lite: 'После объекта: to infinitive, не -ing. To go, не going.'
      },
      {
        trigger: ['i want to you go', 'he heard to me sing'],
        explanation: 'Порядок: глагол + объект + инфинитив. (I want him to go, не "I want to him go".)',
        lite: 'Порядок: глагол + объект + инфинитив.'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Want/Ask/Request: I want you to help me. I asked him to explain. (не "I asked that he explain".)',
    traps: [
      {
        trigger: ['asked that he do', 'request that you go'],
        explanation: 'После want/ask/request: object + to infinitive. (I asked him to help, не "I asked that he help".)',
        lite: 'Ask/Want: object + to V. Asked him to help.'
      }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Hear/See/Watch: часто без "to" (bare infinitive). I heard him sing. I saw her dance.',
    traps: [
      {
        trigger: ['i heard him to sing', 'i saw her to dance'],
        explanation: 'С hear/see/watch можно использовать bare infinitive (без "to"). (I heard him sing, I saw her dance.)',
        lite: 'Hear/See/Watch: bare infinitive. I heard him sing.'
      }
    ]
  }
];

// ══════════════════════════════════════════════════════════════
// УРОК 32: Финальное повторение
// ══════════════════════════════════════════════════════════════

const L32_TRAPS: readonly PhraseErrorTraps[] = [
  {
    phraseIndex: 0,
    generalRule: 'Повторение: Past Continuous vs. Simple Past. Was working (процесс) vs. worked (действие).',
    traps: [
      {
        trigger: ['i worked when', 'they played while'],
        explanation: 'Для действия в процессе используйте Past Continuous. (I was working when she called, не "I worked when she called".)',
        lite: 'Процесс: Past Continuous (was working).'
      }
    ]
  },
  {
    phraseIndex: 5,
    generalRule: 'Условные предложения: Type 1 (реальное) vs. Type 2 (нереальное). Не смешивайте will и would.',
    traps: [
      {
        trigger: ['if i will go would', 'if i went will'],
        explanation: 'Type 1: if Present, will. Type 2: if Past, would. (If I go, I will see. If I went, I would see.)',
        lite: 'Type 1: if + will. Type 2: if + would.'
      }
    ]
  },
  {
    phraseIndex: 10,
    generalRule: 'Косвенная речь: Sequence of tenses. He said he was working. (Не "He said he is working".)',
    traps: [
      {
        trigger: ['said he is', 'said they are', 'told me you am'],
        explanation: 'Сдвиг времён в косвенной речи. Present → Past. (He said he was tired.)',
        lite: 'Сдвиг: is → was. He said he was tired.'
      }
    ]
  },
  {
    phraseIndex: 15,
    generalRule: 'Reflexive pronouns: myself, yourself, himself, herself, itself, ourselves, yourselves, themselves.',
    traps: [
      {
        trigger: ['he hurt him', 'she washed her', 'i helped me'],
        explanation: 'Когда субъект и объект совпадают, используйте reflexive pronoun. (He hurt himself.)',
        lite: 'Reflexive: himself, herself, myself, yourself.'
      }
    ]
  },
  {
    phraseIndex: 20,
    generalRule: 'Used to: I used to go there. (Привычка в прошлом.)',
    traps: [
      {
        trigger: ['use to', 'didn\'t used to', 'did he used'],
        explanation: 'Used to (с "d"), не "use to". Отрицание: didn\'t use to. Вопрос: Did you use to? (I used to go.)',
        lite: 'Used to, не use to. Didn\'t use to.'
      }
    ]
  },
  {
    phraseIndex: 25,
    generalRule: 'Relative clauses: who (люди), which (вещи), that (оба). The man who works here.',
    traps: [
      {
        trigger: ['the person which', 'the book who', 'the woman which'],
        explanation: 'Люди: who. Вещи: which. (The man who lives here, The book which I read.)',
        lite: 'Люди: who. Вещи: which.'
      }
    ]
  },
  {
    phraseIndex: 30,
    generalRule: 'Complex Object: want + object + to infinitive. I want him to help. (не "I want that he help".)',
    traps: [
      {
        trigger: ['want that you', 'want you going', 'want to him help'],
        explanation: 'Complex Object: глагол + объект + to infinitive. (I want him to help.)',
        lite: 'Want + object + to V. I want him to help.'
      }
    ]
  }
];

export const TRAPS_25_32: LessonErrorTrapsMap = {
  25: L25_TRAPS,
  26: L26_TRAPS,
  27: L27_TRAPS,
  28: L28_TRAPS,
  29: L29_TRAPS,
  30: L30_TRAPS,
  31: L31_TRAPS,
  32: L32_TRAPS,
};
