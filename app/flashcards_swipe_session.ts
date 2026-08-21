import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeDeckIds, type FcDeckId } from './flashcards/deck_selection';
import {
  flashcardsSwipeSessionDraftKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';

export type FlashcardsSwipeCardProgress = {
  wrong: number;
  hints: number;
  attempts: number;
  recoveryCorrect: number;
  scoreAwarded: number;
};

export type FlashcardsSwipeSessionStats = {
  total: number;
  answered: number;
  mastered: number;
  correctSwipes: number;
  wrong: number;
  hints: number;
  streak: number;
  bestStreak: number;
  score: number;
};

export type FlashcardsSwipePromptDraft = {
  id: string;
  cardKey: string;
  shownTranslation: string;
  trueTranslation: string;
  isMatch: boolean;
};

export type FlashcardsSwipeFeedbackDraft = {
  kind: 'wrong' | 'hint';
  prompt: FlashcardsSwipePromptDraft;
};

export type FlashcardsSwipeSessionScope = {
  sourceIds: string[];
  routeSource: string;
  routeFilter: string;
  contentLang: string;
};

export type FlashcardsSwipeSessionDraft = FlashcardsSwipeSessionScope & {
  version: 1;
  savedAt: number;
  trainingKeys: string[];
  queue: FlashcardsSwipePromptDraft[];
  feedback: FlashcardsSwipeFeedbackDraft | null;
  stats: FlashcardsSwipeSessionStats;
  progress: Record<string, FlashcardsSwipeCardProgress>;
};

export const FLASHCARDS_SWIPE_SESSION_DRAFT_TTL_MS = 36 * 60 * 60 * 1000;

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSourceIds(sourceIds: unknown): string[] {
  if (!Array.isArray(sourceIds)) return [];
  return [...new Set(sourceIds.map(cleanString).filter(Boolean))].sort();
}

function cleanStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

function sameSourceIds(left: string[], right: string[]): boolean {
  const a = normalizeSourceIds(left);
  const b = normalizeSourceIds(right);
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function validNumber(value: unknown, defaultValue = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function parseStats(value: unknown): FlashcardsSwipeSessionStats | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    total: validNumber(row.total),
    answered: validNumber(row.answered),
    mastered: validNumber(row.mastered),
    correctSwipes: validNumber(row.correctSwipes),
    wrong: validNumber(row.wrong),
    hints: validNumber(row.hints),
    streak: validNumber(row.streak),
    bestStreak: validNumber(row.bestStreak),
    score: validNumber(row.score),
  };
}

function parsePrompt(value: unknown): FlashcardsSwipePromptDraft | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const id = cleanString(row.id);
  const cardKey = cleanString(row.cardKey);
  const shownTranslation = cleanString(row.shownTranslation);
  const trueTranslation = cleanString(row.trueTranslation);
  if (!id || !cardKey || !shownTranslation || !trueTranslation || typeof row.isMatch !== 'boolean') {
    return null;
  }
  return {
    id,
    cardKey,
    shownTranslation,
    trueTranslation,
    isMatch: row.isMatch,
  };
}

function parseFeedback(value: unknown): FlashcardsSwipeFeedbackDraft | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== 'wrong' && row.kind !== 'hint') return null;
  const prompt = parsePrompt(row.prompt);
  return prompt ? { kind: row.kind, prompt } : null;
}

function parseProgress(value: unknown): Record<string, FlashcardsSwipeCardProgress> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, FlashcardsSwipeCardProgress> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    out[key] = {
      wrong: validNumber(row.wrong),
      hints: validNumber(row.hints),
      attempts: validNumber(row.attempts),
      recoveryCorrect: validNumber(row.recoveryCorrect),
      scoreAwarded: validNumber(row.scoreAwarded),
    };
  }
  return out;
}

function parseDraft(raw: string | null): FlashcardsSwipeSessionDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== 1) return null;

    const savedAt = validNumber(parsed.savedAt);
    const sourceIds = normalizeSourceIds(parsed.sourceIds);
    const routeSource = cleanString(parsed.routeSource);
    const routeFilter = cleanString(parsed.routeFilter);
    const contentLang = cleanString(parsed.contentLang);
    const trainingKeys = cleanStringList(parsed.trainingKeys);
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.map(parsePrompt).filter((prompt): prompt is FlashcardsSwipePromptDraft => prompt !== null)
      : [];
    const stats = parseStats(parsed.stats);
    if (!savedAt || sourceIds.length === 0 || !contentLang || trainingKeys.length === 0 || queue.length === 0 || !stats) {
      return null;
    }

    return {
      version: 1,
      savedAt,
      sourceIds,
      routeSource,
      routeFilter,
      contentLang,
      trainingKeys,
      queue,
      feedback: parseFeedback(parsed.feedback),
      stats,
      progress: parseProgress(parsed.progress),
    };
  } catch {
    return null;
  }
}

function draftMatchesScope(draft: FlashcardsSwipeSessionDraft, scope: FlashcardsSwipeSessionScope): boolean {
  return (
    sameSourceIds(draft.sourceIds, scope.sourceIds)
    && draft.routeSource === cleanString(scope.routeSource)
    && draft.routeFilter === cleanString(scope.routeFilter)
    && draft.contentLang === cleanString(scope.contentLang)
  );
}

export async function saveFlashcardsSwipeSessionDraft(
  draft: FlashcardsSwipeSessionDraft,
  studyTarget?: RuntimeStudyTarget,
): Promise<void> {
  await AsyncStorage.setItem(
    flashcardsSwipeSessionDraftKey(studyTarget),
    JSON.stringify({
      ...draft,
      sourceIds: normalizeSourceIds(draft.sourceIds),
      trainingKeys: cleanStringList(draft.trainingKeys),
    }),
  );
}

export async function loadFlashcardsSwipeSessionDraft(
  scope: FlashcardsSwipeSessionScope,
  now = Date.now(),
  studyTarget?: RuntimeStudyTarget,
): Promise<FlashcardsSwipeSessionDraft | null> {
  const draft = parseDraft(await AsyncStorage.getItem(flashcardsSwipeSessionDraftKey(studyTarget)));
  if (!draft) return null;
  const expired = now - draft.savedAt > FLASHCARDS_SWIPE_SESSION_DRAFT_TTL_MS;
  if (expired || !draftMatchesScope(draft, scope)) {
    await clearFlashcardsSwipeSessionDraft(studyTarget);
    return null;
  }
  return draft;
}

export async function clearFlashcardsSwipeSessionDraft(studyTarget?: RuntimeStudyTarget): Promise<void> {
  await AsyncStorage.removeItem(flashcardsSwipeSessionDraftKey(studyTarget));
}

// ── Жест свайпа: чистые числа и предикат (FIX владельца, 2026-08-13) ─────────
//
// Раньше экран решал «свайп засчитан?» инлайном по фиксированному `dx > 96`.
// На реальном iPhone обычный быстрый флик до 96px не доезжал, карта уезжала
// пружиной назад — жалоба «свайпаю, а они прыгают назад». Логика вынесена сюда:
// без RN-импортов, покрывается юнит-тестами (tests/flashcards_swipe_session.test.ts).

/** Порог по расстоянию — доля ширины экрана (а не фиксированные пиксели). */
export const SWIPE_DISTANCE_RATIO = 0.16;
/** Границы порога, чтобы он оставался разумным на очень узких/широких экранах. */
export const SWIPE_DISTANCE_MIN_PX = 44;
export const SWIPE_DISTANCE_MAX_PX = 92;
/** Скорость флика (px/мс), при которой свайп берётся, не доехав до порога. */
export const SWIPE_VELOCITY_THRESHOLD = 0.3;
/** Даже быстрый флик требует минимального смещения — защита от тапа/дрожи. */
export const SWIPE_FLICK_MIN_DX = 22;
/** Подпись набирает полную непрозрачность на этой доле ширины экрана. */
export const BADGE_FULL_RATIO = 0.12;

/** Число или 0 — жест приходит из нативного слоя, NaN/undefined реальны. */
const finiteNum = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/** Порог свайпа по расстоянию в пикселях для ширины экрана `width`. */
export function swipeDistanceThresholdPx(width: number): number {
  const w = Math.max(0, finiteNum(width));
  return Math.round(
    Math.min(SWIPE_DISTANCE_MAX_PX, Math.max(SWIPE_DISTANCE_MIN_PX, w * SWIPE_DISTANCE_RATIO)),
  );
}

/** Смещение, на котором подпись «Верно/Неверно» уже полностью непрозрачна. */
export function swipeBadgeFullAtPx(width: number): number {
  const w = Math.max(0, finiteNum(width));
  return Math.max(28, Math.min(70, Math.round(w * BADGE_FULL_RATIO)));
}

// ── Наборы: общий `?deck=` ↔ источники экрана свайпа ─────────────────────────
//
// FIX (владелец, 2026-08-13): «Тренировка» в таббаре раздела «Карточки» — это
// свайп-режим (этот экран). Таббар и
// DeckPickerSheet говорят на общем языке `FcDeckId` (`saved` / `custom` /
// `pack:<id>`), а экран свайпа — на своих id источников (`saved:all`,
// `custom:all`, `official:<id>`, `community:<id>`). Перевод между ними — здесь:
// чистые функции без RN, покрыты юнит-тестами.

/** Источник экрана свайпа в объёме, нужном для сопоставления с набором. */
export type SwipeSourceLike = {
  id: string;
  kind: 'saved' | 'custom' | 'official' | 'community';
};

/** `FcDeckId` источника (`null` — источник без опознаваемого набора). */
export function deckIdForSwipeSource(source: SwipeSourceLike | null | undefined): FcDeckId | null {
  if (!source) return null;
  if (source.kind === 'saved') return 'saved';
  if (source.kind === 'custom') return 'custom';
  const raw = typeof source.id === 'string' ? source.id : '';
  const packId = raw.slice(raw.indexOf(':') + 1).trim();
  return packId && raw.includes(':') ? (`pack:${packId}` as FcDeckId) : null;
}

/** Отметить в списке источников ровно те, что пришли в `?deck=` (порядок списка). */
export function swipeSourceIdsForDeckIds(
  sources: readonly SwipeSourceLike[] | null | undefined,
  deckIds: readonly FcDeckId[] | null | undefined,
): string[] {
  const wanted = new Set(normalizeDeckIds(deckIds ?? []));
  if (wanted.size === 0 || !sources) return [];
  const out: string[] = [];
  for (const source of sources) {
    const deckId = deckIdForSwipeSource(source);
    if (deckId && wanted.has(deckId) && !out.includes(source.id)) out.push(source.id);
  }
  return out;
}

/** Обратный перевод — что запомнить в `fc_mode_prefs_v1` после старта сессии. */
export function deckIdsForSwipeSources(
  sources: readonly SwipeSourceLike[] | null | undefined,
): FcDeckId[] {
  if (!sources) return [];
  return normalizeDeckIds(sources.map(deckIdForSwipeSource).filter((id): id is FcDeckId => id !== null));
}

export type SwipeGestureSample = { dx: number; dy: number; vx: number };

/**
 * Куда улетает карточка по отпущенному жесту: 'right' — «совпадает»,
 * 'left' — «не совпадает», null — вернуть пружиной на место.
 * Два независимых пути срабатывания: пройденное расстояние ИЛИ скорость флика.
 */
export function swipeCommitDirection(
  gesture: SwipeGestureSample,
  width: number,
): 'left' | 'right' | null {
  const dx = finiteNum(gesture?.dx);
  const dy = finiteNum(gesture?.dy);
  const vx = finiteNum(gesture?.vx);
  const byDistance = Math.abs(dx) >= swipeDistanceThresholdPx(width);
  const byVelocity =
    Math.abs(vx) >= SWIPE_VELOCITY_THRESHOLD &&
    Math.abs(dx) >= SWIPE_FLICK_MIN_DX &&
    Math.abs(dx) > Math.abs(dy);
  if (!byDistance && !byVelocity) return null;
  if (dx === 0) return null;
  return dx > 0 ? 'right' : 'left';
}
