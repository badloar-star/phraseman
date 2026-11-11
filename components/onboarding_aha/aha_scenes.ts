// ⛔ МОДУЛЬ НЕ ДОСТИЖИМ (Ядро 12.10, решение координатора — вариант 1): сцена «ага» снята из онбординга 16.08 (f52b9d128),
// ни один экран не импортирует AhaScene/SpeechBeat/ChipsAssembly (онбординг берёт отсюда только TypewriterText).
// Не переводить и не чинить: удалить после R1 вместе с контрактами — docs/phraseman-2.0/CORE_AFTER_R1.md.
// Контент АХ-сцены: 6 сценариев по цели пользователя.
// Тайминги слов сняты Whisper с реальных mp3 из assets/audio/onboarding_aha/
// (не менять на глаз — только пересняв с нового аудио).
// Дизайн: docs/ONBOARDING_AHA_DESIGN_2026-07-02.md

import type {
  AhaGoalInput,
  AhaLang,
  AhaScenario,
  AhaScenarioId,
  TriText,
} from './aha_types';

/** Резолвер tri-строки по языку онбординга (дефолт ru). */
export function pickTri(lang: AhaLang, tri: TriText): string {
  if (lang === 'uk') return tri.uk;
  if (lang === 'es') return tri.es;
  return tri.ru;
}

const REPLY_PROMPT: TriText = {
  ru: 'Ответь как местный:',
  uk: 'Відповідай як місцевий:',
  es: 'Responde como un local:',
};

export const AHA_SCENARIOS: Record<AhaScenarioId, AhaScenario> = {
  travel: {
    id: 'travel',
    setting: {
      ru: 'Ты в кафе. Бариста спрашивает:',
      uk: 'Ти в кав’ярні. Бариста питає:',
      es: 'Estás en una cafetería. El barista pregunta:',
    },
    hear: {
      text: 'What can I get you?',
      translation: {
        ru: 'Что вам предложить?',
        uk: 'Що вам запропонувати?',
        es: '¿Qué te pongo?',
      },
      timings: [
        { word: 'What', startMs: 0, endMs: 163 },
        { word: 'can', startMs: 197, endMs: 290 },
        { word: 'I', startMs: 325, endMs: 348 },
        { word: 'get', startMs: 395, endMs: 522 },
        { word: 'you?', startMs: 569, endMs: 975 },
      ],
      durationMs: 1194,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: 'Can I get a coffee to go?',
      translation: {
        ru: 'Можно кофе с собой?',
        uk: 'Можна каву з собою?',
        es: '¿Me das un café para llevar?',
      },
      timings: [
        { word: 'Can', startMs: 0, endMs: 197 },
        { word: 'I', startMs: 244, endMs: 267 },
        { word: 'get', startMs: 302, endMs: 406 },
        { word: 'a', startMs: 441, endMs: 464 },
        { word: 'coffee', startMs: 511, endMs: 789 },
        { word: 'to', startMs: 824, endMs: 871 },
        { word: 'go?', startMs: 917, endMs: 1347 },
      ],
      durationMs: 1559,
    },
    distractors: ['please', 'tea'],
  },
  work: {
    id: 'work',
    setting: {
      ru: 'Созвон с коллегой из Лондона. Он просит:',
      uk: 'Дзвінок із колегою з Лондона. Він просить:',
      es: 'Videollamada con un colega de Londres. Te pide:',
    },
    hear: {
      text: 'Could we move the meeting?',
      translation: {
        ru: 'Можем перенести встречу?',
        uk: 'Можемо перенести зустріч?',
        es: '¿Podemos mover la reunión?',
      },
      timings: [
        { word: 'Could', startMs: 0, endMs: 255 },
        { word: 'we', startMs: 290, endMs: 348 },
        { word: 'move', startMs: 418, endMs: 580 },
        { word: 'the', startMs: 604, endMs: 673 },
        { word: 'meeting?', startMs: 708, endMs: 1300 },
      ],
      durationMs: 1507,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: 'Sure, does tomorrow work?',
      translation: {
        ru: 'Конечно. Завтра подойдёт?',
        uk: 'Звісно. Завтра підійде?',
        es: 'Claro. ¿Te va bien mañana?',
      },
      timings: [
        { word: 'Sure,', startMs: 0, endMs: 313 },
        { word: 'does', startMs: 348, endMs: 488 },
        { word: 'tomorrow', startMs: 522, endMs: 801 },
        { word: 'work?', startMs: 836, endMs: 1347 },
      ],
      durationMs: 1559,
    },
    distractors: ['meeting', 'maybe'],
  },
  media: {
    id: 'media',
    setting: {
      ru: 'Вечер, сериал. Друг рядом выдыхает:',
      uk: 'Вечір, серіал. Друг поруч видихає:',
      es: 'Noche de serie. Tu amigo suelta:',
    },
    hear: {
      text: "I didn't see that coming.",
      translation: {
        ru: 'Вот этого я не ожидал.',
        uk: 'Оцього я не чекав.',
        es: 'No me lo esperaba.',
      },
      timings: [
        { word: 'I', startMs: 0, endMs: 81 },
        { word: "didn't", startMs: 151, endMs: 337 },
        { word: 'see', startMs: 372, endMs: 488 },
        { word: 'that', startMs: 522, endMs: 650 },
        { word: 'coming.', startMs: 720, endMs: 1300 },
      ],
      durationMs: 1507,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: 'Honestly, me neither.',
      translation: {
        ru: 'Честно? Я тоже.',
        uk: 'Чесно? Я теж.',
        es: 'La verdad, yo tampoco.',
      },
      timings: [
        { word: 'Honestly,', startMs: 0, endMs: 522 },
        { word: 'me', startMs: 557, endMs: 673 },
        { word: 'neither.', startMs: 743, endMs: 1347 },
      ],
      durationMs: 1559,
    },
    // ВАЖНО: не 'too' — перевод «Я тоже» подталкивает к "me too", отказ на
    // грамматически осмысленной альтернативе ощущается несправедливым.
    distractors: ['never', 'again'],
  },
  people: {
    id: 'people',
    setting: {
      ru: 'Вечеринка на террасе. Тебя спрашивают:',
      uk: 'Вечірка на терасі. Тебе питають:',
      es: 'Fiesta en la terraza. Te preguntan:',
    },
    hear: {
      text: 'How was your weekend?',
      translation: {
        ru: 'Как прошли выходные?',
        uk: 'Як минули вихідні?',
        es: '¿Qué tal el finde?',
      },
      timings: [
        { word: 'How', startMs: 0, endMs: 197 },
        { word: 'was', startMs: 232, endMs: 337 },
        { word: 'your', startMs: 372, endMs: 476 },
        { word: 'weekend?', startMs: 511, endMs: 1254 },
      ],
      durationMs: 1455,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: 'Pretty quiet, actually.',
      translation: {
        ru: 'Довольно спокойно, если честно.',
        uk: 'Доволі спокійно, якщо чесно.',
        es: 'Bastante tranquilo, la verdad.',
      },
      timings: [
        { word: 'Pretty', startMs: 0, endMs: 348 },
        { word: 'quiet,', startMs: 395, endMs: 755 },
        { word: 'actually.', startMs: 778, endMs: 1440 },
      ],
      durationMs: 1664,
    },
    distractors: ['busy', 'very'],
  },
  everyday: {
    id: 'everyday',
    setting: {
      ru: 'Ты опаздываешь. Звонок — тебя спрашивают:',
      uk: 'Ти запізнюєшся. Дзвінок — тебе питають:',
      es: 'Llegas tarde. Te llaman y preguntan:',
    },
    hear: {
      text: 'Where are you?',
      translation: {
        ru: 'Ты где?',
        uk: 'Ти де?',
        es: '¿Dónde estás?',
      },
      timings: [
        { word: 'Where', startMs: 0, endMs: 267 },
        { word: 'are', startMs: 313, endMs: 499 },
        { word: 'you?', startMs: 569, endMs: 1068 },
      ],
      durationMs: 1272,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: "I'll be there in ten minutes.",
      translation: {
        ru: 'Буду через десять минут.',
        uk: 'Буду за десять хвилин.',
        es: 'Llego en diez minutos.',
      },
      timings: [
        { word: "I'll", startMs: 0, endMs: 174 },
        { word: 'be', startMs: 209, endMs: 267 },
        { word: 'there', startMs: 302, endMs: 453 },
        { word: 'in', startMs: 488, endMs: 534 },
        { word: 'ten', startMs: 569, endMs: 720 },
        { word: 'minutes.', startMs: 766, endMs: 1254 },
      ],
      durationMs: 1455,
    },
    distractors: ['late', 'soon'],
  },
  self: {
    id: 'self',
    setting: {
      ru: 'Новое знакомство. Тебе говорят:',
      uk: 'Нове знайомство. Тобі кажуть:',
      es: 'Alguien nuevo te saluda:',
    },
    hear: {
      text: 'Nice to meet you.',
      translation: {
        ru: 'Приятно познакомиться.',
        uk: 'Приємно познайомитися.',
        es: 'Encantado de conocerte.',
      },
      timings: [
        { word: 'Nice', startMs: 0, endMs: 441 },
        { word: 'to', startMs: 464, endMs: 511 },
        { word: 'meet', startMs: 557, endMs: 708 },
        { word: 'you.', startMs: 755, endMs: 1115 },
      ],
      durationMs: 1324,
    },
    replyPrompt: REPLY_PROMPT,
    say: {
      text: 'Nice to meet you too.',
      translation: {
        ru: 'Мне тоже приятно.',
        uk: 'Мені теж приємно.',
        es: 'Igualmente, un placer.',
      },
      timings: [
        { word: 'Nice', startMs: 0, endMs: 244 },
        { word: 'to', startMs: 267, endMs: 313 },
        { word: 'meet', startMs: 348, endMs: 476 },
        { word: 'you', startMs: 511, endMs: 592 },
        { word: 'too.', startMs: 662, endMs: 1161 },
      ],
      durationMs: 1377,
    },
    distractors: ['glad', 'very'],
  },
};

/** Цель из CleanOnboarding → сценарий сцены.
 *  Анкета цели удалена (владелец, 2026-08-16): онбординг всегда играет ОДНУ
 *  витринную сцену — «кафе» (travel). Она самая демонстрирующая: контекст
 *  считывается с одной строки, ответ строится по переносимой формуле
 *  «Can I get…», а не повторяет услышанное. Маппинг целей сохранён для
 *  возможных входов сцены за пределами онбординга. */
export function resolveAhaScenario(goal: AhaGoalInput | null | undefined): AhaScenario {
  switch (goal) {
    case 'travel':
      return AHA_SCENARIOS.travel;
    case 'series':
      return AHA_SCENARIOS.media;
    case 'everyday':
      return AHA_SCENARIOS.people;
    case 'words':
      return AHA_SCENARIOS.everyday;
    case 'work':
      return AHA_SCENARIOS.work;
    case 'mind':
      return AHA_SCENARIOS.self;
    default:
      return AHA_SCENARIOS.travel;
  }
}

/** Общие строки сцены (вне сценариев). Голос Компаса: 1-е лицо, без пафоса. */
export const AHA_STRINGS = {
  skip: {
    ru: 'Пропустить сцену',
    uk: 'Пропустити сцену',
    es: 'Saltar la escena',
  },
  listenAgainHint: {
    ru: 'Тапни по фразе — повторю',
    uk: 'Тапни по вислову — повторю',
    es: 'Toca la frase para repetir',
  },
  assembledPraise: {
    ru: 'Да, так и говорят.',
    uk: 'Так, саме так і кажуть.',
    es: 'Sí, así se dice.',
  },
  speakTitle: {
    ru: 'А теперь скажи это сам.',
    uk: 'А тепер скажи це сам.',
    es: 'Ahora dilo tú.',
  },
  speakBody: {
    ru: 'Просто вслух. Я послушаю и покажу, что уже звучит.',
    uk: 'Просто вголос. Я послухаю й покажу, що вже звучить.',
    es: 'En voz alta. Te escucho y te muestro qué ya suena bien.',
  },
  speakAllow: {
    ru: 'Говорить',
    uk: 'Говорити',
    es: 'Hablar',
  },
  // «Зажми и говори» (Android-надёжность: палец держит микрофон открытым).
  speakHoldIdle: {
    ru: 'Зажми и говори',
    uk: 'Затисни й говори',
    es: 'Mantén pulsado y habla',
  },
  speakHoldListening: {
    ru: 'Говори… отпусти, когда закончишь',
    uk: 'Говори… відпусти, коли закінчиш',
    es: 'Habla… suelta al terminar',
  },
  speakNotNow: {
    ru: 'Не сейчас',
    uk: 'Не зараз',
    es: 'Ahora no',
  },
  listening: {
    ru: 'Слушаю…',
    uk: 'Слухаю…',
    es: 'Te escucho…',
  },
  speakPreparing: {
    ru: 'Готовлю микрофон…',
    uk: 'Готую мікрофон…',
    es: 'Preparando el micrófono…',
  },
  speakSuccess: {
    ru: 'Уже похоже на речь!',
    uk: 'Уже схоже на мовлення!',
    es: '¡Ya suena de verdad!',
  },
  speakSoft: {
    ru: 'Нормально. Этому и учимся.',
    uk: 'Нормально. Цього й вчимося.',
    es: 'Bien. Para eso estamos.',
  },
  myRecording: {
    ru: 'Моя запись',
    uk: 'Мій запис',
    es: 'Mi voz',
  },
  reference: {
    ru: 'Эталон',
    uk: 'Еталон',
    es: 'Nativo',
  },
  shadowPrompt: {
    ru: 'Повтори за диктором — просто вслух, для себя.',
    uk: 'Повтори за диктором — просто вголос, для себе.',
    es: 'Repite después del audio, en voz alta.',
  },
  retry: {
    ru: 'Ещё раз',
    uk: 'Ще раз',
    es: 'Otra vez',
  },
  continueCta: {
    ru: 'Дальше',
    uk: 'Далі',
    es: 'Seguir',
  },
  // зачем (D188-следствие, владелец 14.10): без названия языка и без мужского рода — человек может учить любой из пяти языков.
  payoffTitle: {
    ru: 'Первая фраза — сказана вслух!',
    uk: 'Перший вислів — сказано вголос!',
    es: '¡Primera frase dicha en voz alta!',
  },
  payoffBody: {
    ru: 'Это была первая фраза. Дальше — тысячи живых фраз твоего маршрута.',
    uk: 'Це був перший вислів. Далі — тисячі живих висловів твого маршруту.',
    es: 'Esa fue la primera. Adelante te esperan miles de frases vivas de tu ruta.',
  },
  payoffCta: {
    ru: 'Собрать мой маршрут',
    uk: 'Зібрати мій маршрут',
    es: 'Armar mi ruta',
  },
} as const satisfies Record<string, TriText>;

/** Число слов реплики (для валидации контента в тестах). */
export function ahaLineWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
