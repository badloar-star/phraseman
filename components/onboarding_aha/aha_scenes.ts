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
      ru: 'Ты в кафе в Лиссабоне. Бариста спрашивает:',
      uk: 'Ти в кав’ярні в Лісабоні. Бариста питає:',
      es: 'Estás en una cafetería de Lisboa. El barista pregunta:',
    },
    hear: {
      text: 'What can I get you?',
      translation: {
        ru: 'Что вам предложить?',
        uk: 'Що вам запропонувати?',
        es: '¿Qué te pongo?',
      },
      timings: [
        { word: 'What', startMs: 0, endMs: 420 },
        { word: 'can', startMs: 420, endMs: 640 },
        { word: 'I', startMs: 640, endMs: 860 },
        { word: 'get', startMs: 860, endMs: 1020 },
        { word: 'you?', startMs: 1020, endMs: 1220 },
      ],
      durationMs: 1620,
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
        { word: 'Can', startMs: 0, endMs: 420 },
        { word: 'I', startMs: 420, endMs: 740 },
        { word: 'get', startMs: 740, endMs: 880 },
        { word: 'a', startMs: 880, endMs: 1120 },
        { word: 'coffee', startMs: 1120, endMs: 1440 },
        { word: 'to', startMs: 1440, endMs: 1960 },
        { word: 'go?', startMs: 1960, endMs: 2180 },
      ],
      durationMs: 2580,
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
        { word: 'Could', startMs: 0, endMs: 560 },
        { word: 'we', startMs: 560, endMs: 760 },
        { word: 'move', startMs: 760, endMs: 940 },
        { word: 'the', startMs: 940, endMs: 1160 },
        { word: 'meeting?', startMs: 1160, endMs: 1360 },
      ],
      durationMs: 1760,
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
        { word: 'Sure,', startMs: 0, endMs: 980 },
        { word: 'does', startMs: 1200, endMs: 1840 },
        { word: 'tomorrow', startMs: 1840, endMs: 2360 },
        { word: 'work?', startMs: 2360, endMs: 2680 },
      ],
      durationMs: 3080,
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
        { word: 'I', startMs: 0, endMs: 420 },
        { word: "didn't", startMs: 420, endMs: 980 },
        { word: 'see', startMs: 980, endMs: 1200 },
        { word: 'that', startMs: 1200, endMs: 1500 },
        { word: 'coming.', startMs: 1500, endMs: 1780 },
      ],
      durationMs: 2180,
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
        { word: 'Honestly,', startMs: 0, endMs: 720 },
        { word: 'me', startMs: 860, endMs: 1520 },
        { word: 'neither.', startMs: 1520, endMs: 1820 },
      ],
      durationMs: 2220,
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
        { word: 'How', startMs: 0, endMs: 300 },
        { word: 'was', startMs: 300, endMs: 560 },
        { word: 'your', startMs: 560, endMs: 820 },
        { word: 'weekend?', startMs: 820, endMs: 980 },
      ],
      durationMs: 1380,
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
        { word: 'Pretty', startMs: 0, endMs: 560 },
        { word: 'quiet,', startMs: 560, endMs: 960 },
        { word: 'actually.', startMs: 1160, endMs: 1420 },
      ],
      durationMs: 1820,
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
        { word: 'Where', startMs: 0, endMs: 480 },
        { word: 'are', startMs: 480, endMs: 880 },
        { word: 'you?', startMs: 880, endMs: 1160 },
      ],
      durationMs: 1560,
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
        { word: "I'll", startMs: 0, endMs: 520 },
        { word: 'be', startMs: 520, endMs: 740 },
        { word: 'there', startMs: 740, endMs: 1000 },
        { word: 'in', startMs: 1000, endMs: 1300 },
        { word: 'ten', startMs: 1300, endMs: 1560 },
        { word: 'minutes.', startMs: 1560, endMs: 1880 },
      ],
      durationMs: 2280,
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
        { word: 'Nice', startMs: 0, endMs: 540 },
        { word: 'to', startMs: 540, endMs: 860 },
        { word: 'meet', startMs: 860, endMs: 1060 },
        { word: 'you.', startMs: 1060, endMs: 1340 },
      ],
      durationMs: 1740,
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
        { word: 'Nice', startMs: 0, endMs: 760 },
        { word: 'to', startMs: 760, endMs: 1020 },
        { word: 'meet', startMs: 1020, endMs: 1260 },
        { word: 'you', startMs: 1260, endMs: 1580 },
        { word: 'too.', startMs: 1580, endMs: 1900 },
      ],
      durationMs: 2300,
    },
    distractors: ['glad', 'very'],
  },
};

/** Цель из CleanOnboarding → сценарий сцены. */
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
    default:
      return AHA_SCENARIOS.self;
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
    uk: 'Тапни по фразі — повторю',
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
    es: '¡Ya suena a inglés de verdad!',
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
  payoffTitle: {
    ru: 'Ты только что говорил по-английски.',
    uk: 'Ти щойно говорив англійською.',
    es: 'Acabas de hablar en inglés.',
  },
  payoffBody: {
    ru: 'Это была первая фраза. Дальше — тысячи живых фраз твоего маршрута.',
    uk: 'Це була перша фраза. Далі — тисячі живих фраз твого маршруту.',
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
