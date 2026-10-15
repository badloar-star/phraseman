// Score bands + the "what exactly drags the score down" hint for the speaking
// ("Устно") mode. Turns the raw 0–100 score into a human verdict (Отлично /
// score band) and picks ONE concrete, actionable hint per
// attempt — the most damaging issue first, so the learner is never left with
// just a percentage.
//
// Pure, no React/native imports, fully unit-testable.

import type { SpokenWordEntry } from './speaking_word_report';
import type { StressFeedback } from './speaking_prosody';

export type SpeakingBand = 'excellent' | 'good' | 'almost' | 'rough';

/**
 * Score → band. `threshold` is the pass threshold (75).
 *
 * `passed` — итог проверки (`PronunciationScoringResult.passed`). Он строже балла: кроме порога требует, чтобы каждое
 * слово фразы прозвучало. зачем (Карточки 2.0, двоичный вердикт «Устно», 11.10): при 80 баллах и пропущенном слове
 * подпись говорила «Хорошо! Зачтено», а ответ не засчитывался. Не засчитано → полоса не выше «Почти».
 */
export function speakingBand(score: number, threshold: number, passed?: boolean): SpeakingBand {
  if (score >= 90) return passed === false ? 'almost' : 'excellent';
  if (score >= threshold) return passed === false ? 'almost' : 'good';
  if (score >= 50) return 'almost';
  return 'rough';
}

/**
 * Двоичный вердикт «Устно» («Верно» / «Неверно» поверх звёзд) — единый источник для экрана карточек и урока.
 * correct совпадает с тем, что засчитано в прогрессе (`passed`), а полоса не противоречит вердикту.
 */
export function speakingVerdict(result: Readonly<{ score: number; passed: boolean }>, threshold: number): Readonly<{
  correct: boolean;
  band: SpeakingBand;
}> {
  return { correct: result.passed === true, band: speakingBand(result.score, threshold, result.passed) };
}

const BAND_LABELS: Readonly<Record<SpeakingBand, Readonly<Record<string, string>>>> = {
  // зачем (Q61, координатор 01.10): балл — совпадение распознанного текста с фразой, а не оценка
  // звучания; подписи не обещают «чисто/чётко».
  excellent: {
    ru: 'Отлично! Совпало с фразой',
    uk: 'Чудово! Збіглося з висловом',
    es: '¡Excelente! Coincide con la frase', en: 'Excellent! Matches the phrase',
    'pt-BR': 'Excelente! Bateu com a frase',
    vi: 'Xuất sắc! Khớp với câu',
    id: 'Luar biasa! Cocok dengan frasa',
    tr: 'Mükemmel! İfadeyle eşleşti',
    pl: 'Świetnie! Zgadza się z frazą',
  },
  good: {
    ru: 'Хорошо! Зачтено',
    uk: 'Добре! Зараховано',
    es: '¡Bien! Aprobado', en: 'Good! Counted',
    'pt-BR': 'Bom! Aprovado',
    vi: 'Tốt! Đã đạt',
    id: 'Bagus! Lulus',
    tr: 'İyi! Geçtin',
    pl: 'Dobrze! Zaliczone',
  },
  almost: {
    ru: 'Почти получилось',
    uk: 'Майже вийшло',
    es: 'Casi lo logras', en: 'Almost there',
    'pt-BR': 'Quase conseguiu',
    vi: 'Suýt nữa là được',
    id: 'Hampir berhasil',
    tr: 'Neredeyse oldu',
    pl: 'Prawie się udało',
  },
  rough: {
    ru: 'Пока не совпало — попробуй ещё',
    uk: 'Поки не збіглося — спробуй ще',
    es: 'Aún no coincide — inténtalo otra vez', en: 'Doesn\'t match yet — try again',
    'pt-BR': 'Ainda não bateu — tente de novo',
    vi: 'Chưa khớp — thử lại nhé',
    id: 'Belum cocok — coba lagi',
    tr: 'Henüz eşleşmedi — bir daha dene',
    pl: 'Jeszcze się nie zgadza — spróbuj ponownie',
  },
};

export function speakingBandLabel(band: SpeakingBand, lang: string): string {
  const map = BAND_LABELS[band];
  return map[lang] ?? map.ru ?? '';
}

/** ONE concrete, actionable hint per attempt — most damaging issue first. */
export type SpeakingHint =
  | { kind: 'none' }
  /** Control pass without target biasing failed hard — the biased engine was
   *  "helped" to hear the phrase; ask for a clearer, slower delivery. */
  | { kind: 'say_clearer' }
  | { kind: 'missed_words'; words: string[] }
  | { kind: 'fuzzy_words'; words: string[] }
  | { kind: 'incomplete' }
  | { kind: 'monotone' }
  | { kind: 'stress' };

const HINT_WORDS_CAP = 3;

export type BuildSpeakingHintInput = {
  report: readonly SpokenWordEntry[];
  /** True when the honesty control pass lowered the score. */
  honestyFlagged: boolean;
  stress: StressFeedback;
  /** Completeness percentage from the scorer breakdown (0..100). */
  completeness?: number;
};

export function buildSpeakingHint(input: BuildSpeakingHintInput): SpeakingHint {
  if (input.honestyFlagged) return { kind: 'say_clearer' };

  // зачем (координатор 15.10, эталон Макетов «не засчитано»): маска «t____» снята — фраза и пропущенные слова показываются целиком, человек видит, что именно повторить
  const missed = input.report.filter((w) => w.status === 'missed').map((w) => w.target);
  if (missed.length > 0) {
    return { kind: 'missed_words', words: missed.slice(0, HINT_WORDS_CAP) };
  }

  const fuzzy = input.report.filter((w) => w.status === 'fuzzy').map((w) => w.target);
  if (fuzzy.length > 0) return { kind: 'fuzzy_words', words: fuzzy.slice(0, HINT_WORDS_CAP) };

  if (typeof input.completeness === 'number' && input.completeness < 80) {
    return { kind: 'incomplete' };
  }
  if (input.stress === 'monotone') return { kind: 'monotone' };
  if (input.stress === 'too_early' || input.stress === 'too_late') return { kind: 'stress' };
  return { kind: 'none' };
}

type HintTexts = Readonly<Record<string, string>>;

const HINT_TEXTS: Readonly<Record<Exclude<SpeakingHint['kind'], 'none'>, HintTexts>> = {
  say_clearer: {
    ru: 'Фраза распознаётся только с подсказкой — скажи чётче и чуть медленнее',
    uk: 'Вислів розпізнається лише з підказкою — скажи чіткіше й трохи повільніше',
    es: 'La frase solo se reconoce con ayuda — dilo más claro y un poco más despacio', en: 'The phrase is only recognized with a hint — say it clearer and a bit slower',
    'pt-BR': 'A frase só é reconhecida com ajuda — fale mais claro e um pouco mais devagar',
    vi: 'Câu chỉ được nhận ra khi có gợi ý — hãy nói rõ và chậm hơn một chút',
    id: 'Frasa hanya dikenali dengan bantuan — ucapkan lebih jelas dan sedikit lebih pelan',
    tr: 'İfade ancak ipucuyla tanınıyor — daha net ve biraz daha yavaş söyle',
    pl: 'Fraza jest rozpoznawana tylko z podpowiedzią — powiedz wyraźniej i nieco wolniej',
  },
  missed_words: {
    ru: 'Не прозвучало: {words}',
    uk: 'Не пролунало: {words}',
    es: 'No se oyó: {words}', en: 'Not heard: {words}',
    'pt-BR': 'Não deu para ouvir: {words}',
    vi: 'Chưa nghe thấy: {words}',
    id: 'Tidak terdengar: {words}',
    tr: 'Duyulmadı: {words}',
    pl: 'Nie zabrzmiało: {words}',
  },
  fuzzy_words: {
    ru: 'Нечётко прозвучало: {words}',
    uk: 'Нечітко пролунало: {words}',
    es: 'Sonó poco claro: {words}', en: 'Unclear: {words}',
    'pt-BR': 'Soou pouco claro: {words}',
    vi: 'Nghe chưa rõ: {words}',
    id: 'Terdengar kurang jelas: {words}',
    tr: 'Net duyulmadı: {words}',
    pl: 'Zabrzmiało niewyraźnie: {words}',
  },
  incomplete: {
    ru: 'Скажи фразу целиком, не обрывая конец',
    uk: 'Скажи вислів повністю, не обриваючи кінець',
    es: 'Di la frase completa, sin cortar el final', en: 'Say the whole phrase, don\'t cut off the ending',
    'pt-BR': 'Diga a frase inteira, sem cortar o final',
    vi: 'Hãy nói trọn câu, đừng bỏ dở phần cuối',
    id: 'Ucapkan frasa sampai selesai, jangan putus di akhir',
    tr: 'İfadeyi sonunu kesmeden tamamen söyle',
    pl: 'Powiedz całą frazę, nie urywając końca',
  },
  monotone: {
    ru: 'Звучит ровно — добавь выражения и ударения',
    uk: 'Звучить рівно — додай виразності та наголосу',
    es: 'Suena plano — añade más énfasis', en: 'Sounds flat — add expression and stress',
    'pt-BR': 'Soa monótono — dê mais ênfase',
    vi: 'Nghe đều đều — hãy nhấn nhá hơn',
    id: 'Terdengar datar — beri lebih banyak penekanan',
    tr: 'Tekdüze geldi — vurgu ekle',
    pl: 'Brzmi płasko — dodaj akcentu',
  },
  stress: {
    ru: 'Обрати внимание на ударение во фразе',
    uk: 'Зверни увагу на наголос у вислові',
    es: 'Cuida el acento de la frase', en: 'Mind the stress in the phrase',
    'pt-BR': 'Atenção à ênfase da frase',
    vi: 'Chú ý trọng âm của câu',
    id: 'Perhatikan penekanan kalimat',
    tr: 'Cümledeki vurguya dikkat et',
    pl: 'Zwróć uwagę na akcent w zdaniu',
  },
};

/** Localized hint line, or null when there is nothing to say. */
export function speakingHintText(hint: SpeakingHint, lang: string): string | null {
  if (hint.kind === 'none') return null;
  const map = HINT_TEXTS[hint.kind];
  const template = map[lang] ?? map.ru ?? '';
  if (!template) return null;
  const words = 'words' in hint ? hint.words.join(', ') : '';
  return template.replace('{words}', words);
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
