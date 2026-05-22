import AsyncStorage from '@react-native-async-storage/async-storage';
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
