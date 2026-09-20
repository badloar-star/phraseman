import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '../constants/i18n';
import {
  dailyPhraseCopyForLang,
  type DailyPhrase,
  type DailyPhraseInterfaceLang,
  type DailyPhraseQuestPoolItem,
} from './daily_phrase_system';
import { registerXP } from './xp_manager';
import { DebugLogger } from './debug-logger';
import type { RuntimeStudyTarget } from './target_storage_keys';

export const DAILY_PHRASE_QUEST_XP = 50;

export type DailyPhraseQuestOption = {
  id: string;
  text: string;
  correct: boolean;
  feedback?: string;
  misconceptionCode?: string;
};

export type DailyPhraseQuestAwardResult = {
  awarded: boolean;
  finalDelta: number;
};

const AWARD_KEY_PREFIX = 'daily_phrase_quest_xp_awarded_v1';
const ANSWER_KEY_PREFIX = 'daily_phrase_quest_answered_v1';
const QUEST_MARKER_MAX_KEYS = 192;
const QUEST_MARKER_TTL_MS = 120 * 24 * 60 * 60 * 1000;
const QUEST_MARKER_PRUNE_INTERVAL_MS = 12 * 60 * 60 * 1000;
let lastQuestMarkerPruneAt = 0;
let questMarkerPruneInFlight = false;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

type DailyPhraseQuestStudyTarget = 'en' | 'es' | 'fr' | 'de';

function dailyPhraseQuestStudyTarget(value?: RuntimeStudyTarget): DailyPhraseQuestStudyTarget | null {
  if (value == null) return 'en';
  switch (value) {
    case 'en':
    case 'es':
    case 'fr':
    case 'de':
      return value as DailyPhraseQuestStudyTarget;
    default:
      return null;
  }
}

function effectiveDailyPhraseQuestStudyTarget(
  phrase: DailyPhrase,
  explicitTarget?: RuntimeStudyTarget,
): DailyPhraseQuestStudyTarget | null {
  const phraseTargetValue = (phrase as Partial<DailyPhrase>).studyTarget;
  const phraseTarget = phraseTargetValue == null ? null : dailyPhraseQuestStudyTarget(phraseTargetValue);
  if (phraseTargetValue != null && !phraseTarget) return null;

  if (explicitTarget != null) {
    const requestedTarget = dailyPhraseQuestStudyTarget(explicitTarget);
    if (!requestedTarget || (phraseTarget && phraseTarget !== requestedTarget)) return null;
    return requestedTarget;
  }
  return phraseTarget ?? 'en';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function comparableText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function poolMeaningForLang(
  candidate: DailyPhraseQuestPoolItem,
  lang: DailyPhraseInterfaceLang,
): string {
  if (lang === 'uk') return cleanText(candidate.meaning_uk) || cleanText(candidate.meaning);
  if (lang === 'es') return cleanText(candidate.meaning_es) || cleanText(candidate.meaning);
  if (lang !== 'ru') {
    return cleanText(candidate.sourceLocales?.[lang]?.meaning) || cleanText(candidate.meaning);
  }
  return cleanText(candidate.meaning);
}

function safeDailyPhraseEventPart(value: unknown, max = 60): string {
  return String(value ?? 'na').trim().replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, max) || 'na';
}

export function buildDailyPhraseQuestOptions(
  phrase: DailyPhrase,
  pool: readonly DailyPhraseQuestPoolItem[],
  lang: DailyPhraseInterfaceLang = 'ru',
  studyTargetInput?: RuntimeStudyTarget,
): DailyPhraseQuestOption[] {
  const studyTarget = effectiveDailyPhraseQuestStudyTarget(phrase, studyTargetInput);
  if (!studyTarget) return [];
  const correctText = cleanText(dailyPhraseCopyForLang(phrase, lang).meaning);
  if (studyTarget !== 'en') {
    const quiz: unknown = lang === 'ru' ? phrase.quiz_ru : lang === 'uk' ? phrase.quiz_uk : undefined;
    if (!isRecord(quiz) || !Array.isArray(quiz.distractors) || quiz.distractors.length !== 2) return [];
    const correctFeedback = cleanText(quiz.correctFeedback);
    if (!correctText || !correctFeedback) return [];

    const distractors = quiz.distractors.map((distractor) => (isRecord(distractor) ? {
      id: cleanText(distractor.id),
      text: cleanText(distractor.text),
      feedback: cleanText(distractor.feedback),
      misconceptionCode: cleanText(distractor.misconceptionCode),
    } : null));
    if (distractors.some((item) => item === null)) return [];
    const validDistractors = distractors.filter((item): item is NonNullable<typeof item> => item !== null);
    if (validDistractors.some((item) => !item.id || !item.text || !item.feedback || !item.misconceptionCode)) return [];
    if (new Set(validDistractors.map((item) => item.id)).size !== 2) return [];
    if (new Set(validDistractors.map((item) => comparableText(item.text))).size !== 2) return [];
    if (new Set(validDistractors.map((item) => item.misconceptionCode)).size !== 2) return [];
    if (validDistractors.some((item) => comparableText(item.text) === comparableText(correctText))) return [];

    const seed = `${studyTarget}:${phrase.id}:${phrase.date || phrase.scheduledDate || ''}`;
    return [
      {
        id: `correct:${phrase.id}`,
        text: correctText,
        correct: true,
        feedback: correctFeedback,
      },
      ...validDistractors.map((distractor) => ({
        id: `distractor:${phrase.id}:${distractor.id}`,
        text: distractor.text,
        correct: false,
        feedback: distractor.feedback,
        misconceptionCode: distractor.misconceptionCode,
      })),
    ].sort((a, b) => hashString(`${seed}:order:${a.id}`) - hashString(`${seed}:order:${b.id}`));
  }

  const seed = `${phrase.id}:${phrase.date}:${phrase.english}`;
  const distractors = pool
    .filter((candidate) => String(candidate.id) !== phrase.id)
    .map((candidate) => ({
      id: `distractor:${candidate.id}`,
      text: poolMeaningForLang(candidate, lang),
      correct: false,
      rank: hashString(`${seed}:${candidate.id}`),
    }))
    .filter((candidate) => candidate.text && candidate.text !== correctText)
    .sort((a, b) => a.rank - b.rank);

  const byText = new Map<string, DailyPhraseQuestOption>();
  byText.set(correctText, {
    id: `correct:${phrase.id}`,
    text: correctText,
    correct: true,
  });
  for (const distractor of distractors) {
    if (byText.size >= 3) break;
    byText.set(distractor.text, {
      id: distractor.id,
      text: distractor.text,
      correct: false,
    });
  }

  return [...byText.values()]
    .sort((a, b) => hashString(`${seed}:order:${a.id}`) - hashString(`${seed}:order:${b.id}`));
}

export function isDailyPhraseQuestAnswerCorrect(
  options: readonly DailyPhraseQuestOption[],
  selectedOptionId: string,
): boolean {
  return options.some((option) => option.id === selectedOptionId && option.correct);
}

function awardKey(phraseId: string, date: string, studyTarget: DailyPhraseQuestStudyTarget): string {
  return studyTarget === 'en'
    ? `${AWARD_KEY_PREFIX}:${date}:${phraseId}`
    : `${AWARD_KEY_PREFIX}:${studyTarget}:${date}:${phraseId}`;
}

function answerKey(phraseId: string, date: string, studyTarget: DailyPhraseQuestStudyTarget): string {
  return studyTarget === 'en'
    ? `${ANSWER_KEY_PREFIX}:${date}:${phraseId}`
    : `${ANSWER_KEY_PREFIX}:${studyTarget}:${date}:${phraseId}`;
}

function questMarkerDateFromKey(key: string): string | null {
  if (!key.startsWith(`${AWARD_KEY_PREFIX}:`) && !key.startsWith(`${ANSWER_KEY_PREFIX}:`)) return null;
  const parts = key.split(':');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] ?? '') ? parts[1]! : parts[2] ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

export function selectDailyPhraseQuestMarkerKeysToRemove(
  keys: readonly string[],
  nowMs = Date.now(),
  retainKeys: readonly string[] = [],
): string[] {
  const retain = new Set(retainKeys.filter(Boolean));
  const markers = keys
    .map((key) => ({ key, date: questMarkerDateFromKey(key) }))
    .filter((item): item is { key: string; date: string } => item.date !== null)
    .sort((a, b) => (b.date === a.date ? b.key.localeCompare(a.key) : b.date.localeCompare(a.date)));
  if (markers.length === 0) return [];

  const cutoffMs = nowMs - QUEST_MARKER_TTL_MS;
  const remove = new Set<string>();
  for (const marker of markers) {
    const markerMs = Date.parse(`${marker.date}T00:00:00.000Z`);
    if (Number.isFinite(markerMs) && markerMs < cutoffMs && !retain.has(marker.key)) {
      remove.add(marker.key);
    }
  }

  let kept = 0;
  for (const marker of markers) {
    if (remove.has(marker.key)) continue;
    kept += 1;
    if (kept > QUEST_MARKER_MAX_KEYS && !retain.has(marker.key)) remove.add(marker.key);
  }
  return [...remove];
}

async function pruneDailyPhraseQuestMarkers(retainKeys: readonly string[]): Promise<void> {
  const now = Date.now();
  if (questMarkerPruneInFlight || now - lastQuestMarkerPruneAt < QUEST_MARKER_PRUNE_INTERVAL_MS) return;
  questMarkerPruneInFlight = true;
  lastQuestMarkerPruneAt = now;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const remove = selectDailyPhraseQuestMarkerKeysToRemove(keys, now, retainKeys);
    if (remove.length > 0) await AsyncStorage.multiRemove(remove);
  } catch (e) {
      // Best-effort marker cleanup only.
      DebugLogger.error('daily_phrase_quest:remove', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
    questMarkerPruneInFlight = false;
  }
}

export async function markDailyPhraseQuestAnswered(params: {
  phraseId: string;
  date: string;
  studyTarget?: RuntimeStudyTarget;
}): Promise<void> {
  const phraseId = cleanText(params.phraseId);
  const date = cleanText(params.date);
  const studyTarget = dailyPhraseQuestStudyTarget(params.studyTarget);
  if (!phraseId || !date || !studyTarget) return;

  const key = answerKey(phraseId, date, studyTarget);
  await AsyncStorage.setItem(key, '1');
  void pruneDailyPhraseQuestMarkers([key]).catch(() => {});
}

export async function hasDailyPhraseQuestAnswered(params: {
  phraseId: string;
  date: string;
  studyTarget?: RuntimeStudyTarget;
}): Promise<boolean> {
  const phraseId = cleanText(params.phraseId);
  const date = cleanText(params.date);
  const studyTarget = dailyPhraseQuestStudyTarget(params.studyTarget);
  if (!phraseId || !date || !studyTarget) return false;

  const [answered, awarded] = await Promise.all([
    AsyncStorage.getItem(answerKey(phraseId, date, studyTarget)),
    AsyncStorage.getItem(awardKey(phraseId, date, studyTarget)),
  ]);
  return Boolean(answered || awarded);
}

export async function awardDailyPhraseQuestXpOnce(params: {
  phraseId: string;
  date: string;
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
}): Promise<DailyPhraseQuestAwardResult> {
  const phraseId = cleanText(params.phraseId);
  const date = cleanText(params.date);
  const studyTarget = dailyPhraseQuestStudyTarget(params.studyTarget);
  if (!phraseId || !date || !studyTarget) return { awarded: false, finalDelta: 0 };

  const key = awardKey(phraseId, date, studyTarget);
  const alreadyAwarded = await AsyncStorage.getItem(key);
  if (alreadyAwarded) return { awarded: false, finalDelta: 0 };

  const userName = (await AsyncStorage.getItem('user_name')) || '';
  const legacyEventId = [
    'daily_phrase_quest',
    safeDailyPhraseEventPart(date, 20),
    safeDailyPhraseEventPart(phraseId, 80),
    'award',
  ].join(':');
  const result = await registerXP(DAILY_PHRASE_QUEST_XP, 'daily_phrase_quest', userName, params.lang, undefined, {
    eventId: studyTarget === 'en'
      ? legacyEventId
      : `daily_phrase_quest:${safeDailyPhraseEventPart(studyTarget, 10)}:${safeDailyPhraseEventPart(date, 20)}:${safeDailyPhraseEventPart(phraseId, 80)}:award`,
    payload: studyTarget === 'en'
      ? { phraseId, date }
      : { phraseId, date, studyTarget },
  });
  if (Math.max(0, Math.round(result.finalDelta || 0)) <= 0) {
    throw new Error('daily_phrase_quest_xp_not_confirmed');
  }
  await AsyncStorage.setItem(key, '1');
  void pruneDailyPhraseQuestMarkers([key]).catch(() => {});
  return { awarded: true, finalDelta: result.finalDelta };
}

export async function hasDailyPhraseQuestXpAwarded(params: {
  phraseId: string;
  date: string;
  studyTarget?: RuntimeStudyTarget;
}): Promise<boolean> {
  const phraseId = cleanText(params.phraseId);
  const date = cleanText(params.date);
  const studyTarget = dailyPhraseQuestStudyTarget(params.studyTarget);
  if (!phraseId || !date || !studyTarget) return false;

  return Boolean(await AsyncStorage.getItem(awardKey(phraseId, date, studyTarget)));
}
