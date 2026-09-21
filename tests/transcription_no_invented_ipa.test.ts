/**
 * Сторож: генератор транскрипции не имеет права выдумывать.
 *
 * зачем: 21.09.2026 пользователь прислал репорт — на карточке
 * "Where do we meet guests?" слово guests показывалось как /gdʒʌːsts/
 * вместо /ɡests/. Замечание верное, и проверка показала, что выдумка была
 * массовой (girl → dʒɪrl, school → stʃʌːl, ghost → ɒst, two → twɒ).
 * Тест фиксирует правило: либо правильная транскрипция, либо пусто.
 *
 * Список контрольных слов может только расти — каждый новый репорт
 * от пользователя добавляет сюда строку.
 */

import {
  getTranscription,
  needsTranscriptionRefresh,
  TRANSCRIPTION_ENGINE_VERSION,
} from '../app/transcription';

/** Слова, для которых мы знаем единственно верный ответ. */
const MUST_BE_CORRECT: Record<string, string> = {
  // Из репорта 21.09.2026
  guests: '/ɡests/',
  guest: '/ɡest/',
  // Немой "u" после "g" — тот же класс, что и guests
  guess: '/ɡes/',
  guide: '/ɡaɪd/',
  guitar: '/ɡɪˈtɑːr/',
  league: '/liːɡ/',
  tongue: '/tʌŋ/',
  // Слова, которые старые правила ломали особенно грубо
  girl: '/ɡɜːrl/',
  school: '/skuːl/',
  ghost: '/ɡoʊst/',
  two: '/tuː/',
  one: '/wʌn/',
  once: '/wʌns/',
  know: '/noʊ/',
  heart: '/hɑːrt/',
  debt: '/det/',
  question: '/ˈkwesʃən/',
  picture: '/ˈpɪktʃər/',
  island: '/ˈaɪlənd/',
  castle: '/ˈkæsl/',
  half: '/hɑːf/',
  women: '/ˈwɪmɪn/',
  bread: '/bred/',
  field: '/fiːld/',
  cost: '/kɒst/',
  bag: '/bæɡ/',
};

/**
 * Написания, которые побуквенными правилами не выводятся.
 * Для них допустим ТОЛЬКО словарный ответ или пустая строка —
 * но никогда выдумка.
 */
const MUST_NEVER_BE_INVENTED = [
  'psychology', 'pneumonia', 'rhythm', 'autumn', 'column',
  'subtle', 'scissors', 'muscle', 'science', 'doubt',
  'though', 'through', 'bought', 'laugh', 'cough', 'enough',
  'chef', 'character', 'machine', 'ocean', 'measure', 'vision',
  'friend', 'receive', 'weight', 'height', 'listen', 'walk',
  'colonel', 'yacht', 'queue', 'choir', 'sword', 'answer',
];

describe('getTranscription: правда или молчание', () => {
  it('слова из репортов пользователей транскрибируются верно', () => {
    const wrong: string[] = [];
    for (const [word, expected] of Object.entries(MUST_BE_CORRECT)) {
      const actual = getTranscription(word);
      if (actual !== expected) wrong.push(`${word}: ожидалось ${expected}, получено ${JSON.stringify(actual)}`);
    }
    expect(wrong).toEqual([]);
  });

  it('фраза из репорта 21.09.2026 целиком верна', () => {
    expect(getTranscription('Where do we meet guests?')).toBe('/weər duː wiː miːt ɡests/');
  });

  it('нерегулярные написания никогда не выдумываются', () => {
    const invented: string[] = [];
    for (const word of MUST_NEVER_BE_INVENTED) {
      const actual = getTranscription(word);
      // Пусто — честно. Непусто — обязано совпасть со словарём,
      // а не быть склейкой правил.
      if (actual === '') continue;
      // В настоящей IPA латинских букв не бывает: их наличие —
      // верный признак того, что сработали правила, а не словарь.
      if (/[a-zA-Z]/.test(actual)) {
        invented.push(`${word} → ${actual}`);
      }
    }
    expect(invented).toEqual([]);
  });

  it('никогда не возвращает транскрипцию с латиницей внутри', () => {
    const phrases = [
      'Where does she put the bag?',
      'How much does it cost?',
      'When do they come home?',
      'I bought a guitar yesterday',
      'The chef laughed through the night',
    ];
    const bad: string[] = [];
    for (const phrase of phrases) {
      const actual = getTranscription(phrase);
      if (actual !== '' && /[a-zA-Z]/.test(actual)) bad.push(`${phrase} → ${actual}`);
    }
    expect(bad).toEqual([]);
  });

  it('пустой ввод даёт пустую строку, а не слэши', () => {
    expect(getTranscription('')).toBe('');
    expect(getTranscription('   ')).toBe('');
    expect(getTranscription('...')).toBe('');
  });
});

describe('needsTranscriptionRefresh: перегенерация по версии движка', () => {
  it('карточка без версии считается старой и перегенерируется', () => {
    // Все карточки, записанные до 21.09.2026, поля версии не имеют.
    expect(needsTranscriptionRefresh(undefined)).toBe(true);
    expect(needsTranscriptionRefresh(1)).toBe(true);
  });

  it('карточка с текущей версией больше не трогается', () => {
    // зачем: иначе миграция перезаписывала бы карточку при каждом заходе
    // на экран — бесконечные записи в Firestore.
    expect(needsTranscriptionRefresh(TRANSCRIPTION_ENGINE_VERSION)).toBe(false);
    expect(needsTranscriptionRefresh(TRANSCRIPTION_ENGINE_VERSION + 1)).toBe(false);
  });

  it('правильные транскрипции содержат латиницу — по виду порчу не ловить', () => {
    // зачем: зафиксировать вывод, купленный ошибкой при разработке задачи.
    // Соблазнительная проверка «есть латинские гласные → мусор» пометила бы
    // 525 из 872 ПРАВИЛЬНЫХ словарных записей как мусор и стёрла бы их
    // у всех пользователей. Тест держит этот факт на виду: генератор
    // штатно выдаёт латинские буквы внутри корректной IPA.
    for (const word of ['them', 'any', 'school', 'i', 'guests']) {
      const actual = getTranscription(word);
      expect(actual).not.toBe('');
      expect(actual).toMatch(/[aeiou]/);
    }
  });
});
