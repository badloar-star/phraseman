/**
 * Транскрипция ролика → таймкоды фраз.
 *
 * зачем (владелец 2026-09-25): под плеером список фраз, тап по фразе
 * перематывает видео к моменту, где она звучит. Время берём из файла
 * транскрипции, который админ загружает рядом с документом фраз: .srt / .vtt
 * из YouTube Studio или текст из «Показать расшифровку» (строки «0:12»).
 *
 * Чистые функции без сети и Firestore: сервер вызывает их в callable, а тесты
 * проверяют напрямую.
 */

export type TranscriptCue = Readonly<{ startSec: number; endSec: number; text: string }>;

export type PhraseTimingMatch = Readonly<{
  /** Секунда начала или null, если фраза не найдена уверенно. */
  startSec: number | null;
  /** Доля слов фразы, найденных подряд в транскрипции: 0..1. */
  score: number;
  /** По какому тексту нашли: сама фраза или её перевод (голос за кадром). */
  matchedBy: 'phrase' | 'translation' | null;
}>;

/** Ниже этой доли совпавших слов таймкод не ставим — лучше пусто, чем мимо. */
export const TIMING_MIN_SCORE = 0.5;
/** Ниже этой доли таймкод ставим, но админка просит проверить глазами. */
export const TIMING_CONFIDENT_SCORE = 0.75;
/** Прыжок чуть раньше первого слова, чтобы начало фразы не обрезалось. */
const LEAD_IN_SEC = 0.4;
const MAX_TRANSCRIPT_CHARS = 2_000_000;

function clockToSec(raw: string): number {
  const parts = raw.trim().replace(',', '.').split(':');
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + Number(part);
  return Number.isFinite(seconds) ? seconds : NaN;
}

const CUE_ARROW_RE = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/;
/** Строка-таймкод из «Показать расшифровку» YouTube: «0:12», «1:02:03», можно с текстом после. */
const BARE_CLOCK_RE = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s+(.*))?$/;

function cleanCueLine(line: string): string {
  // VTT YouTube несёт пословные теги <00:00:01.000><c>…</c> и разметку <b>/<i>.
  return line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseArrowCues(lines: readonly string[]): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  let lastLine = '';
  for (let index = 0; index < lines.length; index += 1) {
    const arrow = CUE_ARROW_RE.exec(lines[index]);
    if (!arrow) continue;
    const startSec = clockToSec(arrow[1]);
    const endSec = clockToSec(arrow[2]);
    const textLines: string[] = [];
    for (index += 1; index < lines.length && lines[index].trim() !== ''; index += 1) {
      const line = cleanCueLine(lines[index]);
      // Автосубтитры YouTube «катятся»: строка прошлого кадра повторяется в
      // следующем. Без этого фильтра каждое слово попало бы в поиск дважды.
      if (line && line !== lastLine) textLines.push(line);
      if (line) lastLine = line;
    }
    const text = textLines.join(' ').trim();
    if (text && Number.isFinite(startSec)) cues.push({ startSec, endSec: Number.isFinite(endSec) ? endSec : startSec, text });
  }
  return cues;
}

function parseBareClockCues(lines: readonly string[]): TranscriptCue[] {
  const cues: { startSec: number; endSec: number; text: string }[] = [];
  for (const raw of lines) {
    const clock = BARE_CLOCK_RE.exec(raw);
    if (clock) {
      cues.push({ startSec: clockToSec(clock[1]), endSec: NaN, text: (clock[2] ?? '').trim() });
      continue;
    }
    const line = raw.trim();
    const last = cues[cues.length - 1];
    if (line && last) last.text = `${last.text} ${line}`.trim();
  }
  // Конец реплики — начало следующей; у последней — плюс 5 секунд.
  return cues
    .map((cue, index) => ({ ...cue, endSec: cues[index + 1]?.startSec ?? cue.startSec + 5 }))
    .filter((cue) => cue.text && Number.isFinite(cue.startSec));
}

/**
 * Разбор файла транскрипции. Бросает понятную ошибку, если таймкодов нет:
 * текст без времени бесполезен, и админ должен узнать это сразу.
 */
export function parseTranscript(source: string): readonly TranscriptCue[] {
  const text = String(source ?? '').replace(/^﻿/, '');
  if (!text.trim()) throw new Error('transcript_empty');
  if (text.length > MAX_TRANSCRIPT_CHARS) throw new Error('transcript_too_long');
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const arrowCues = parseArrowCues(lines);
  const cues = arrowCues.length ? arrowCues : parseBareClockCues(lines);
  if (!cues.length) throw new Error('transcript_has_no_timecodes');
  return cues.slice().sort((left, right) => left.startSec - right.startSec);
}

export function normalizeTimingWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ё/g, 'е')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function tokenize(text: string): string[] {
  return String(text ?? '').split(/[\s\-–—/]+/).map(normalizeTimingWord).filter(Boolean);
}

type TimedWord = Readonly<{ word: string; sec: number }>;

/** Слова реплики получают время равномерно внутри её интервала. */
function timedWords(cues: readonly TranscriptCue[]): TimedWord[] {
  const words: TimedWord[] = [];
  for (const cue of cues) {
    const tokens = tokenize(cue.text);
    const span = Math.max(0, cue.endSec - cue.startSec);
    tokens.forEach((word, index) => {
      words.push({ word, sec: cue.startSec + (tokens.length ? (span * index) / tokens.length : 0) });
    });
  }
  return words;
}

type WindowHit = Readonly<{ index: number; score: number }>;

/** Лучшее окно, где слова фразы идут по порядку (допускаем пропуски и вставки). */
function bestWindow(words: readonly TimedWord[], tokens: readonly string[], cursor: number): WindowHit | null {
  if (!tokens.length) return null;
  const tokenSet = new Set(tokens);
  const slack = Math.max(2, Math.ceil(tokens.length * 0.5));
  let best: WindowHit | null = null;
  for (let start = 0; start < words.length; start += 1) {
    if (!tokenSet.has(words[start].word)) continue;
    let matched = 0;
    let firstHit = -1;
    let tokenIndex = 0;
    const limit = Math.min(words.length, start + tokens.length + slack);
    for (let position = start; position < limit && tokenIndex < tokens.length; position += 1) {
      const found = tokens.indexOf(words[position].word, tokenIndex);
      if (found === -1) continue;
      if (firstHit === -1) firstHit = position;
      matched += 1;
      tokenIndex = found + 1;
    }
    if (firstHit === -1) continue;
    const score = matched / tokens.length;
    // При равной точности — ближе к порядку фраз: ролик идёт по документу.
    const better = !best
      || score > best.score + 1e-9
      || (Math.abs(score - best.score) < 1e-9 && firstHit >= cursor && (best.index < cursor || firstHit < best.index));
    if (better) best = { index: firstHit, score };
  }
  return best;
}

/**
 * Подбор таймкодов для фраз по транскрипции.
 *
 * Ищем и саму фразу, и перевод: в роликах Лингмана диктор часто говорит
 * по-русски, а английская фраза в автосубтитрах распознаётся криво — тогда
 * выручает перевод. Берём вариант с большей долей совпавших слов.
 */
export function alignPhrasesToTranscript(
  phrases: readonly Readonly<{ phrase: string; translation?: string }>[],
  cues: readonly TranscriptCue[],
): readonly PhraseTimingMatch[] {
  const words = timedWords(cues);
  let cursor = 0;
  return phrases.map((item) => {
    const byPhrase = bestWindow(words, tokenize(item.phrase), cursor);
    const byTranslation = bestWindow(words, tokenize(item.translation ?? ''), cursor);
    const pick = (byTranslation && (!byPhrase || byTranslation.score > byPhrase.score))
      ? { hit: byTranslation, matchedBy: 'translation' as const }
      : byPhrase ? { hit: byPhrase, matchedBy: 'phrase' as const } : null;
    if (!pick || pick.hit.score < TIMING_MIN_SCORE) {
      return { startSec: null, score: pick ? pick.hit.score : 0, matchedBy: null };
    }
    cursor = pick.hit.index;
    const startSec = Math.max(0, Math.round((words[pick.hit.index].sec - LEAD_IN_SEC) * 10) / 10);
    return { startSec, score: Math.round(pick.hit.score * 100) / 100, matchedBy: pick.matchedBy };
  });
}

/** «75.4» → «1:15» для админки и приложения. */
export function formatTimingClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}
