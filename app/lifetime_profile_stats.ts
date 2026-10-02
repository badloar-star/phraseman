/**
 * Сводные «за всё время» метрики для экрана статистики.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readCustomCards } from './flashcards/storage';
import { getForegroundDailyMsMap } from './foreground_usage_ms';
import {
  diagnosticLastKey,
  lessonProgressKey,
  lessonWordsKey,
  type RuntimeStudyTarget,
} from './target_storage_keys';
import { DebugLogger } from './debug-logger';
import { LEARNING_LANGUAGE_TARGETS, type LearningLanguageTarget } from './learning_language_contour';

const WORD_REQUIRED = 3;
const MIN_ACTIVE_MS = 60_000;

// зачем (PM-289, D70): счётчики жемчуга «заработано/потрачено за всё время» удалены
// вместе с валютой — ни один экран их больше не показывает.

/** Сколько фраз в одном уроке по сетке прогресса (см. lesson1). */
const LESSON_PHRASE_SLOTS_CAP = 50;
// зачем (PM-121-A3, D129–D134): раньше суммировались только ['en','fr'] — es/de/it молча не
// попадали в «За всё время», а язык суммы нигде не назывался. Теперь считаем ВСЕ языки курса
// и отдаём разбивку `byTarget` — экран подписывает сумму («по всем языкам») и может показать
// язык. Общими остаются только баланс/ранг/подписка (PM-121-A1), статистика — со своими метками.
const LIFETIME_STATS_TARGETS: readonly LearningLanguageTarget[] = LEARNING_LANGUAGE_TARGETS;

/**
 * Сколько фраз из уроков сейчас в состоянии «выучено» (correct / replay_correct),
 * по всем урокам 1–32. Считаем только первые LESSON_PHRASE_SLOTS_CAP ячеек на урок
 * (защита от раздутых массивов в хранилище).
 */
async function countPhrasesLearnedFromLessonProgress(): Promise<Record<LearningLanguageTarget, number>> {
  const pairs = Array.from({ length: 32 }, (_, i) => i + 1).flatMap(lessonId =>
    LIFETIME_STATS_TARGETS.map(studyTarget => ({ studyTarget, key: lessonProgressKey(lessonId, studyTarget) })),
  );
  const rows = await AsyncStorage.multiGet(pairs.map(pair => pair.key));
  const sums = emptyPerTarget();
  rows.forEach(([, val], index) => {
    if (!val) return;
    try {
      const p: unknown = JSON.parse(val);
      if (!Array.isArray(p)) return;
      const slice = p.slice(0, LESSON_PHRASE_SLOTS_CAP);
      sums[pairs[index].studyTarget] += slice.filter(x => x === 'correct' || x === 'replay_correct').length;
    } catch (e) {
      // skip
      DebugLogger.error('lifetime_profile_stats:slice', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });
  return sums;
}

function emptyPerTarget(): Record<LearningLanguageTarget, number> {
  return { en: 0, es: 0, fr: 0, de: 0, it: 0 };
}


async function countLearnedWordsByTarget(): Promise<Record<LearningLanguageTarget, number>> {
  const { LESSONS_WITH_WORDS } = await import('./lesson_words');
  const lessons = [...LESSONS_WITH_WORDS];
  const pairs = lessons.flatMap(id =>
    LIFETIME_STATS_TARGETS.map(studyTarget => ({ studyTarget, key: lessonWordsKey(id, studyTarget) })),
  );
  const rows = await AsyncStorage.multiGet(pairs.map(pair => pair.key));
  const sums = emptyPerTarget();
  rows.forEach(([, val], index) => {
    if (!val) return;
    const target = pairs[index].studyTarget;
    try {
      const data = JSON.parse(val) as unknown;
      if (Array.isArray(data)) {
        sums[target] += data.length;
        return;
      }
      if (typeof data === 'object' && data !== null) {
        for (const c of Object.values(data as Record<string, unknown>)) {
          const n = typeof c === 'number' ? c : Number(c);
          if (Number.isFinite(n) && n >= WORD_REQUIRED) sums[target] += 1;
        }
      }
    } catch (e) {
      // skip
      DebugLogger.error('lifetime_profile_stats:n', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  });
  return sums;
}

const sumPerTarget = (sums: Record<LearningLanguageTarget, number>): number =>
  LIFETIME_STATS_TARGETS.reduce((acc, target) => acc + sums[target], 0);

export type LifetimeProfileStats = {
  wordsLearned: number;
  flashcardsSaved: number;
  phrasesLearned: number;
  englishLevel: string | null;
  appDaysUnion: number;
  longestStreakDays: number;
  /**
   * зачем (PM-121-A3): сумма «за всё время» — по ВСЕМ языкам аккаунта; здесь та же сумма с
   * разбивкой по языку обучения, чтобы экран мог подписать её и не выдавать за один язык.
   * Времена/дни/серия — общие по аккаунту и в разбивку не входят. Поле необязательное:
   * старый снимок кэша его не содержит (читается как «разбивки нет»).
   */
  byTarget?: Readonly<Record<LearningLanguageTarget, LifetimeTargetCounts>>;
};

export type LifetimeTargetCounts = Readonly<{
  wordsLearned: number;
  phrasesLearned: number;
  flashcardsSaved: number;
}>;

const LIFETIME_PROFILE_STATS_CACHE_KEY = 'lifetime_profile_stats_snapshot_v1';

function isLifetimeProfileStatsSnapshot(o: unknown): o is LifetimeProfileStats {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  const nums = [
    'wordsLearned',
    'flashcardsSaved',
    'phrasesLearned',
    'appDaysUnion',
    'longestStreakDays',
  ] as const;
  for (const k of nums) {
    const v = r[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
  }
  if (r.englishLevel !== null && typeof r.englishLevel !== 'string') return false;
  // зачем: разбивка необязательна (старый снимок), но если есть — должна быть целой, иначе
  // экран подписал бы сумму чужими числами.
  if (r.byTarget !== undefined) {
    if (!r.byTarget || typeof r.byTarget !== 'object') return false;
    for (const target of LIFETIME_STATS_TARGETS) {
      const row = (r.byTarget as Record<string, unknown>)[target] as Record<string, unknown> | undefined;
      if (!row || typeof row !== 'object') return false;
      for (const k of ['wordsLearned', 'phrasesLearned', 'flashcardsSaved'] as const) {
        const v = row[k];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return false;
      }
    }
  }
  return true;
}

/** Мгновенный снимок для экрана статистики (без ожидания тяжёлого пересчёта и арены). */
export async function readLifetimeProfileStatsCache(): Promise<LifetimeProfileStats | null> {
  try {
    const raw = await AsyncStorage.getItem(LIFETIME_PROFILE_STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isLifetimeProfileStatsSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function persistLifetimeProfileStatsCache(s: LifetimeProfileStats): Promise<void> {
  try {
    await AsyncStorage.setItem(LIFETIME_PROFILE_STATS_CACHE_KEY, JSON.stringify(s));
  } catch (e) {
      // ignore
      DebugLogger.error('lifetime_profile_stats:persistLifetimeProfileStatsCache', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export async function loadLifetimeProfileStats(): Promise<LifetimeProfileStats> {
  const readCardsByTarget = async () => {
    const lists = await Promise.all(LIFETIME_STATS_TARGETS.map(studyTarget => readCustomCards(studyTarget)));
    const counts = emptyPerTarget();
    LIFETIME_STATS_TARGETS.forEach((target, index) => { counts[target] = lists[index].length; });
    return counts;
  };

  const [
    wordsByTarget,
    diagnosticLastRaw,
    fgDaily,
    cardsByTarget,
    phrasesByTarget,
  ] = await Promise.all([
    countLearnedWordsByTarget(),
    AsyncStorage.getItem(diagnosticLastKey('en')),
    getForegroundDailyMsMap(),
    readCardsByTarget(),
    countPhrasesLearnedFromLessonProgress(),
  ]);
  const wordsLearned = sumPerTarget(wordsByTarget);
  const phrasesLearned = sumPerTarget(phrasesByTarget);
  const flashcardsSaved = sumPerTarget(cardsByTarget);
  const byTarget = Object.fromEntries(LIFETIME_STATS_TARGETS.map(target => [target, {
    wordsLearned: wordsByTarget[target],
    phrasesLearned: phrasesByTarget[target],
    flashcardsSaved: cardsByTarget[target],
  }])) as Record<LearningLanguageTarget, LifetimeTargetCounts>;
  let diagnosticLevel: string | null = null;
  if (diagnosticLastRaw) {
    try {
      const parsed = JSON.parse(diagnosticLastRaw);
      diagnosticLevel = typeof parsed?.level === 'string' ? parsed.level.trim() || null : null;
    } catch {
      diagnosticLevel = null;
    }
  }

  const sortedDates = Object.keys(fgDaily).sort();
  let run = 0;
  let longest = 0;
  let appDaysUnion = 0;
  let previousActiveDay: string | null = null;
  for (const d of sortedDates) {
    const ms = fgDaily[d] ?? 0;
    const active = ms >= MIN_ACTIVE_MS;
    if (active) {
      appDaysUnion++;
      const dayTime = Date.parse(`${d}T00:00:00Z`);
      const previousTime = previousActiveDay ? Date.parse(`${previousActiveDay}T00:00:00Z`) : NaN;
      run = dayTime - previousTime === 86_400_000 ? run + 1 : 1;
      longest = Math.max(longest, run);
      previousActiveDay = d;
    } else {
      run = 0;
      previousActiveDay = null;
    }
  }

  const result: LifetimeProfileStats = {
    wordsLearned,
    flashcardsSaved,
    phrasesLearned,
    englishLevel: diagnosticLevel,
    appDaysUnion,
    longestStreakDays: longest,
    byTarget,
  };
  // зачем (логи, CLAUDE.md): по языкам видно, откуда взялась каждая цифра «За всё время».
  console.log(`[LIFETIME-STATS] words=${wordsLearned} phrases=${phrasesLearned} cards=${flashcardsSaved} byTarget=${JSON.stringify(byTarget)}`);
  void persistLifetimeProfileStatsCache(result);
  return result;
}
