// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_more_facts.ts — факты телефона для последних особых сцен Главной: фраза дня не показана, личный рекорд,
// рубеж, тебя обогнали в Пике.
//
// зачем (координатор 25.10 одобрил замены данных; всё локально, 0 чтений Firestore):
//   - фраза дня — своя отметка «показана сегодня» (Главная ставит её, когда карточка фразы видна; ответ на квиз тоже считается);
//   - личный рекорд — рекорд серии из статистики профиля на телефоне (longestStreakDays) против текущей серии: счётчики заданий
//     дня — разные единицы (уроки, слова, минуты), сумма соврала бы «N заданий»;
//   - рубеж — свой снимок счётчиков (уроки, выучено фраз, ранг монеты): рубеж засчитан, когда счётчик перешёл порог с прошлого входа;
//   - тебя обогнали — своё место в комнате недели при прошлом входе на Главную (тот же день держит одну базу, без «скачков»).
// Отбор — чистые функции ниже (сторож tests/home_scene_special_more.test.ts). Журнал [HOME-SCENE] special:more — что нашли.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const LOG = '[HOME-SCENE]';
const MILESTONE_KEY = 'home_scene_milestone_snapshot_v1';
const PEAK_KEY = 'home_scene_peak_place_v1';
const PHRASE_SEEN_KEY = 'home_scene_phrase_seen_v1';

export const HOME_SCENE_LESSON_MILESTONES: readonly number[] = [5, 10, 25, 50, 100, 200];
export const HOME_SCENE_PHRASE_MILESTONES: readonly number[] = [50, 100, 250, 500, 1000, 2500];

export const homeSceneDayKeyOf = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Понедельник недели (по часам телефона) — ключ недели для места в Пике. */
export const homeSceneWeekKeyOf = (d: Date): string => homeSceneDayKeyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)));

export type HomeSceneCounters = Readonly<{ lessons: number; phrases: number | null; rank: number | null }>;

/**
 * Снимок для записи: неизвестные сейчас счётчики (null) не стирают прошлые значения.
 * зачем (Ревизор 25.10 по a796ac60e, 🔴 ложный рубеж): иначе «неизвестно» затирало снимок, и следующий вход видел «переход порога».
 */
export function homeSceneMergeCounters(prev: HomeSceneCounters | null, now: HomeSceneCounters): HomeSceneCounters {
  return { lessons: now.lessons, phrases: now.phrases ?? prev?.phrases ?? null, rank: now.rank ?? prev?.rank ?? null };
}

/** Рубеж с прошлого снимка: первый порог, который счётчик перешёл; ранг — любое повышение. Снимка нет — рубежа нет. */
export function homeScenePickMilestone(prev: HomeSceneCounters | null, now: HomeSceneCounters): Readonly<{ key: string; n: number }> | null {
  if (!prev) return null;
  if (now.rank !== null && prev.rank !== null && now.rank > prev.rank) return { key: `rank_${now.rank}`, n: now.rank };
  const crossed = (list: readonly number[], a: number, b: number): number | null => {
    let hit: number | null = null;
    for (const t of list) if (a < t && b >= t) hit = t;
    return hit;
  };
  if (now.phrases !== null && prev.phrases !== null) {
    const t = crossed(HOME_SCENE_PHRASE_MILESTONES, prev.phrases, now.phrases);
    if (t !== null) return { key: `phrases_${t}`, n: t };
  }
  const t = crossed(HOME_SCENE_LESSON_MILESTONES, prev.lessons, now.lessons);
  return t !== null ? { key: `lessons_${t}`, n: t } : null;
}

export type HomeScenePeakMemo = Readonly<{ week: string; place: number; day: string; basePlace: number | null; baseDay: string }>;

/**
 * Место в комнате недели: база — место при последнем входе ДО сегодняшнего дня (на весь день одна), обогнали — сейчас место хуже базы.
 * Возвращает новую запись памяти и факт.
 */
export function homeScenePeakStep(memo: HomeScenePeakMemo | null, place: number, now: Date): Readonly<{ memo: HomeScenePeakMemo; overtaken: Readonly<{ from: number; to: number }> | null }> {
  const day = homeSceneDayKeyOf(now);
  const week = homeSceneWeekKeyOf(now);
  const sameWeek = memo !== null && memo.week === week;
  let basePlace: number | null;
  if (!sameWeek) basePlace = null;
  else if (memo.baseDay === day) basePlace = memo.basePlace;
  else basePlace = memo.day === day ? memo.basePlace : memo.place;
  const next: HomeScenePeakMemo = { week, place, day, basePlace, baseDay: day };
  return { memo: next, overtaken: basePlace !== null && place > basePlace ? { from: basePlace, to: place } : null };
}

/** Своя отметка «фраза дня показана сегодня»: Главная зовёт, когда карточка фразы видна. Память сразу, диск фоном. */
let phraseSeenDay: string | null = null;
export function markHomeScenePhraseSeen(now: Date = new Date()): void {
  const day = homeSceneDayKeyOf(now);
  if (phraseSeenDay === day) return;
  phraseSeenDay = day;
  console.log(LOG, 'special:phrase_seen', JSON.stringify({ day })); // guard-ok: одна строка на день
  AsyncStorage.setItem(PHRASE_SEEN_KEY, day).catch((error: unknown) => {
    console.warn(LOG, 'special:phrase_seen_save_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой с причиной
  });
}

export type HomeSceneMoreFacts = Readonly<{
  phrase: Readonly<{ text: string; tr: string | null }> | null;
  phraseSeen: boolean | null;
  streakBest: Readonly<{ streak: number; best: number }> | null;
  milestone: Readonly<{ key: string; n: number }> | null;
  peakOvertaken: Readonly<{ from: number; to: number }> | null;
}>;

const EMPTY: HomeSceneMoreFacts = Object.freeze({ phrase: null, phraseSeen: null, streakBest: null, milestone: null, peakOvertaken: null });

type Input = Readonly<{
  enabled: boolean;
  /**
   * Личный прогресс прочитан с диска (personal.hydrated). До этого уроков «0» — ни читать, ни писать снимок нельзя.
   * зачем (Ревизор 25.10 по a796ac60e, 🔴): снимок {lessons:0} до гидрации → после гидрации «перешёл порог 100» у каждого занимающегося.
   */
  ready: boolean;
  studyTarget: unknown;
  lang: string;
  streakDays: number;
  lessons: number;
  phrasesLearned: number | null;
  coinRank: number | null;
  /** Место в комнате недели из копии на телефоне (useSpireHomePlace); null — нет. */
  peakPlace: number | null;
}>;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.warn(LOG, 'special:more_read_failed', JSON.stringify({ key, error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой с причиной
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch((error: unknown) => {
    console.warn(LOG, 'special:more_write_failed', JSON.stringify({ key, error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой с причиной
  });
}

export function useHomeSceneMoreFacts(i: Input): HomeSceneMoreFacts {
  const [facts, setFacts] = useState<HomeSceneMoreFacts>(EMPTY);
  // зачем: один раз на вход (и при смене цели/языка) — снимок и сравнение; счётчики, пришедшие позже, догоняют вторым проходом
  const countersKey = `${i.lessons}|${String(i.phrasesLearned)}|${String(i.coinRank)}|${String(i.peakPlace)}|${i.streakDays}`;
  useEffect(() => {
    if (!i.enabled) return undefined;
    if (!i.ready) { console.log(LOG, 'special:more_skip', JSON.stringify({ reason: 'personal_progress_not_hydrated' })); return undefined; } // guard-ok: ранний выход с причиной
    let alive = true;
    const now = new Date();
    const today = homeSceneDayKeyOf(now);
    void (async () => {
      const [stats, phraseMod, prevCounters, peakMemo, seenDay] = await Promise.all([
        import('../../../../app/lifetime_profile_stats').then((m) => m.readLifetimeProfileStatsCache()).catch((error: unknown) => {
          console.warn(LOG, 'special:more_stats_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; // guard-ok: сбой с причиной — без рекорда серии
        }),
        import('../../../../app/daily_phrase_system').catch((error: unknown) => {
          console.warn(LOG, 'special:more_phrase_module_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; // guard-ok: сбой с причиной — без фразы дня
        }),
        readJson<HomeSceneCounters>(MILESTONE_KEY),
        readJson<HomeScenePeakMemo>(PEAK_KEY),
        AsyncStorage.getItem(PHRASE_SEEN_KEY).catch((error: unknown) => {
          console.warn(LOG, 'special:more_phrase_seen_read_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; // guard-ok: сбой с причиной — считаем «не показана»
        }),
      ]);
      if (!alive) return;
      const counters: HomeSceneCounters = { lessons: i.lessons, phrases: i.phrasesLearned, rank: i.coinRank };
      const milestone = homeScenePickMilestone(prevCounters, counters);
      writeJson(MILESTONE_KEY, homeSceneMergeCounters(prevCounters, counters));
      let peakOvertaken: HomeSceneMoreFacts['peakOvertaken'] = null;
      if (i.peakPlace !== null) {
        const step = homeScenePeakStep(peakMemo, i.peakPlace, now);
        peakOvertaken = step.overtaken;
        writeJson(PEAK_KEY, step.memo);
      }
      // зачем: язык Главной и цель обучения — те же, что у карточки фразы; типы берём у самой функции (без приведения к «любому типу» — храповик)
      type PhraseArgs = Parameters<typeof import('../../../../app/daily_phrase_system').getTodayPhraseSyncForTarget>;
      const p = phraseMod ? phraseMod.getTodayPhraseSyncForTarget(i.studyTarget as PhraseArgs[0], i.lang as PhraseArgs[1]) : null;
      const phrase = p && p.english ? { text: p.english, tr: (i.lang === 'uk' ? p.literal_uk : p.literal) || null } : null;
      const phraseSeen = phraseSeenDay === today || seenDay === today;
      const best = typeof stats?.longestStreakDays === 'number' ? stats.longestStreakDays : null;
      // зачем (координатор 25.10, тот же класс, что ложный рубеж): серия 0 — ещё не прочитана или её нет; «0 из N» не показываем
      const streakBest = best !== null && best > 0 && i.streakDays > 0 ? { streak: i.streakDays, best } : null;
      const next: HomeSceneMoreFacts = Object.freeze({ phrase, phraseSeen: phrase ? phraseSeen : null, streakBest, milestone, peakOvertaken });
      console.log(LOG, 'special:more', JSON.stringify({ phrase: Boolean(phrase), phraseSeen: next.phraseSeen, streak: i.streakDays, best, milestone: milestone?.key ?? null, prevCounters, counters, peakOvertaken })); // guard-ok: одна строка на вход
      setFacts(next);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: пересчёт по ключу счётчиков, цели и языку
  }, [i.enabled, i.ready, i.studyTarget, i.lang, countersKey]);
  return facts;
}
