// Клиентские метрики MAX-звонка (спека раздел 1, `max_voice_metrics.ts`).
//
// Считаем всё локально и без NLP: метрики нужны мгновенно на экране пост-разбора,
// а слабые Android не должны платить рендером за «умный» анализ. Сервер этим
// цифрам в деньгах всё равно не верит (XP клампится серверной формулой), поэтому
// здесь достаточно честной наивной оценки.
//
// Ноль React/native-импортов: модуль детерминирован и покрыт юнит-тестами.

import type { TranscriptTurn } from './max_call_transcript';

export interface VoiceCallMetrics {
  speechSec: number;
  userTurns: number;
  longestTurnWords: number;
  uniqueWords: number;
  weakWordsUsed: string[];
}

// Краткий встроенный список английских стоп-слов (~30): «словарь в речи» должен
// отражать содержательную лексику, а не артикли и местоимения. Полноценные
// stop-word-библиотеки не тянем — вес бандла дороже точности этой метрики.
const STOP_WORDS = new Set([
  'a', 'an', 'the',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your',
  'this', 'that',
  'is', 'am', 'are', 'was', 'were', 'be', 'do', 'does', 'did', 'have', 'has',
  'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'but', 'so', 'not', 'no', 'yes',
]);

// Токенизация «lowercase, без пунктуации»: латиница с внутренним апострофом
// (don't, i'm) — одно слово; всё остальное (запятые, тире транскрипта, эмодзи)
// — разделители. Цифры оставляем: «room 12» — это два услышанных токена.
function tokenize(text: string): string[] {
  const matched = text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)*/g);
  return matched ?? [];
}

// Экранируем weak word для регэкспа: фразы из истории ошибок могут
// содержать спецсимволы — падать на `new RegExp` в пост-разборе нельзя.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function computeVoiceCallMetrics(
  history: TranscriptTurn[],
  opts: { speechSec: number; weakWords: string[]; durationSec: number },
): VoiceCallMetrics {
  // Анти-AFK: клиентские «секунды речи» не могут превышать длительность звонка —
  // иначе залипший таймер речи раздувал бы XP-заявку и графики трендов.
  const durationSec = Number.isFinite(opts.durationSec) ? Math.max(0, opts.durationSec) : 0;
  const rawSpeech = Number.isFinite(opts.speechSec) ? opts.speechSec : 0;
  const speechSec = Math.min(Math.max(0, rawSpeech), durationSec);

  const userTurnsList = history.filter((turn) => turn.role === 'user');

  let longestTurnWords = 0;
  const unique = new Set<string>();
  const userTextParts: string[] = [];

  for (const turn of userTurnsList) {
    userTextParts.push(turn.text);
    const tokens = tokenize(turn.text);
    // Длина реплики — по всем словам, включая стоп-слова: «I would like a large
    // cappuccino» — это честные шесть слов беглости, а не два «содержательных».
    if (tokens.length > longestTurnWords) longestTurnWords = tokens.length;
    for (const token of tokens) {
      if (!STOP_WORDS.has(token)) unique.add(token);
    }
  }

  // Weak words ищем только в репликах юзера: зачёт «прозвучало» получает ученик,
  // а не ассистент, который сам же эти слова вплетает в вопросы.
  const userText = userTextParts.join('\n');
  const weakWordsUsed: string[] = [];
  const seenWeak = new Set<string>();
  for (const weak of opts.weakWords) {
    const trimmed = weak.trim();
    if (trimmed === '') continue;
    const key = trimmed.toLowerCase();
    if (seenWeak.has(key)) continue;
    seenWeak.add(key);
    // Граница слова обязательна: weak word «cap» не должно засчитываться из-за
    // «cappuccino» — иначе отчёт получает ложные «закрытые» слова.
    const re = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i');
    if (re.test(userText)) weakWordsUsed.push(trimmed);
  }

  return {
    speechSec,
    userTurns: userTurnsList.length,
    longestTurnWords,
    uniqueWords: unique.size,
    weakWordsUsed,
  };
}

// ---------------------------------------------------------------------------
// Тренды 4 недель для пост-разбора: «Говорил минут», «Словарь в речи»,
// «Чистых фраз %». Окно скользящее, вход — уже посчитанные метрики прошлых
// звонков (их хранит экран разбора), никакого повторного парсинга транскриптов.

export const TREND_WINDOW_MS = 28 * 24 * 60 * 60 * 1000;

/** Минимум звонков в окне, при котором показываем «чистых фраз %». */
export const CLEAN_PHRASE_MIN_CALLS = 3;

export interface VoiceCallTrendSample {
  atMs: number;
  speechSec: number;
  uniqueWords: number;
  cleanPhrases: number;
  totalPhrases: number;
}

export interface VoiceTrends {
  spokeMinutes: number;
  vocabWords: number;
  /** null — метрика скрыта: меньше CLEAN_PHRASE_MIN_CALLS звонков в окне. */
  cleanPhrasePct: number | null;
}

export function computeVoiceTrends(samples: VoiceCallTrendSample[], nowMs: number): VoiceTrends {
  const from = nowMs - TREND_WINDOW_MS;
  const inWindow = samples.filter((s) => s.atMs >= from && s.atMs <= nowMs);

  let speechSec = 0;
  let vocabWords = 0;
  let clean = 0;
  let total = 0;
  for (const s of inWindow) {
    speechSec += Math.max(0, s.speechSec);
    vocabWords += Math.max(0, s.uniqueWords);
    clean += Math.max(0, s.cleanPhrases);
    total += Math.max(0, s.totalPhrases);
  }

  // «Чистых фраз %» на 1–2 звонках — шум, который демотивирует сильнее, чем
  // помогает: показываем процент только при достаточной выборке.
  const cleanPhrasePct =
    inWindow.length >= CLEAN_PHRASE_MIN_CALLS && total > 0
      ? Math.round((clean / total) * 100)
      : null;

  return {
    spokeMinutes: Math.round(speechSec / 60),
    vocabWords,
    cleanPhrasePct,
  };
}
