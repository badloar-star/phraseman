// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_local_facts.ts — факты телефона для особых сцен пачки 2: та же ошибка снова, ошибка исправлена сегодня,
// выучено фраз, взаимный друг уже занимался сегодня.
//
// зачем (координатор 25.10 одобрил замены данных; спецификация home-scene-new-states-spec-2026-10-25.md): всё — из того, что
// уже лежит на телефоне, 0 чтений Firestore. Журнал ошибок — одно локальное чтение на вход в Главную (тот же, что у хаба ошибок);
// выучено фраз — кэш статистики профиля; друзья — снимок «Вместе» в памяти (только взаимные пары). Отбор — чистые функции ниже.
// Журнал [HOME-SCENE] special:facts — что нашли и откуда; каждый сбой — с причиной.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react';

const LOG = '[HOME-SCENE]';

type MistakeRow = Readonly<{ mistakeId: string; phrase: string; status: string; captureCount: number; correctedAtMs: number | null; firstCapturedAtMs: number }>;
export type HomeSceneMistakeFact = Readonly<{ id: string; phrase: string }>;

const sameLocalDay = (ms: number, now: Date): boolean => {
  const d = new Date(ms);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
};

/** Ошибка, на которой спотыкались ≥ 2 раз и ещё не исправленная: чаще всех, при равенстве — свежее. */
export function homeScenePickRepeatedMistake(items: readonly MistakeRow[]): HomeSceneMistakeFact | null {
  let best: MistakeRow | null = null;
  for (const it of items) {
    if (it.status !== 'active' || it.captureCount < 2 || !it.phrase) continue;
    if (!best || it.captureCount > best.captureCount || (it.captureCount === best.captureCount && it.firstCapturedAtMs > best.firstCapturedAtMs)) best = it;
  }
  return best ? { id: best.mistakeId, phrase: best.phrase } : null;
}

/** Ошибка, исправленная сегодня (по часам телефона): самая свежая. */
export function homeScenePickMasteredToday(items: readonly MistakeRow[], now: Date): HomeSceneMistakeFact | null {
  let best: MistakeRow | null = null;
  for (const it of items) {
    if (it.status !== 'corrected' || it.correctedAtMs === null || !it.phrase || !sameLocalDay(it.correctedAtMs, now)) continue;
    if (!best || (it.correctedAtMs ?? 0) > (best.correctedAtMs ?? 0)) best = it;
  }
  return best ? { id: best.mistakeId, phrase: best.phrase } : null;
}

type PairLike = Readonly<{ friendUid: string; name?: string; friendActiveDays?: unknown }>;
export type HomeSceneFriendFact = Readonly<{ uid: string; name: string }>;

/** Взаимный друг с именем, у которого сегодня (день телефона снимка) есть занятие; первый по имени — стабильно. */
export function homeScenePickActiveFriend(pairs: readonly PairLike[], myDayKey: string, activeDaysOf: (state: unknown) => Set<string>): HomeSceneFriendFact | null {
  const active = pairs
    .filter((p) => typeof p.name === 'string' && p.name.trim().length > 0 && activeDaysOf(p.friendActiveDays ?? null).has(myDayKey))
    .map((p) => ({ uid: p.friendUid, name: (p.name ?? '').trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return active[0] ?? null;
}

export type HomeSceneLocalFacts = Readonly<{
  repeatedMistake: HomeSceneMistakeFact | null;
  masteredMistake: HomeSceneMistakeFact | null;
  phrasesLearned: number | null;
  friend: HomeSceneFriendFact | null;
}>;

const EMPTY: HomeSceneLocalFacts = Object.freeze({ repeatedMistake: null, masteredMistake: null, phrasesLearned: null, friend: null });

/** Факты пачки 2; enabled=false — ничего не читаем (особые сцены выключены у этого входа). */
export function useHomeSceneLocalFacts(studyTarget: unknown, enabled: boolean): HomeSceneLocalFacts {
  const [facts, setFacts] = useState<HomeSceneLocalFacts>(EMPTY);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const startedAt = Date.now();
    const mistakesP = import('../../../../modules/mistake-practice/contracts').then(async (c) => {
      if (!c.isMistakeStudyTargetValue(studyTarget)) { console.log(LOG, 'special:facts_mistakes_skip', JSON.stringify({ reason: 'not_mistake_target', studyTarget: String(studyTarget) })); return null; } // guard-ok: ранний выход с причиной
      const m = await import('../../../../app/mistake_practice_insights');
      return m.loadMistakePracticeHubSnapshot(studyTarget);
    }).catch((error: unknown) => { console.warn(LOG, 'special:facts_mistakes_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; }); // guard-ok: сбой с причиной
    const statsP = import('../../../../app/lifetime_profile_stats').then((m) => m.readLifetimeProfileStatsCache())
      .catch((error: unknown) => { console.warn(LOG, 'special:facts_stats_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; }); // guard-ok: сбой с причиной
    const friendP = Promise.all([import('../../../../app/friends_together/together_store'), import('../../../../app/friends_together/together_days')])
      .then(([store, days]) => {
        const snap = store.getFriendsTogetherSnapshot();
        if (!snap) return null;
        return homeScenePickActiveFriend(Object.values(snap.pairs), snap.myDayKey, (s) => days.decodeActiveDays(s as Parameters<typeof days.decodeActiveDays>[0]));
      })
      .catch((error: unknown) => { console.warn(LOG, 'special:facts_friend_failed', JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); return null; }); // guard-ok: сбой с причиной
    void Promise.all([mistakesP, statsP, friendP]).then(([hub, stats, friend]) => {
      if (!alive) return;
      const now = new Date();
      const items = (hub?.items ?? []) as readonly MistakeRow[];
      const next: HomeSceneLocalFacts = Object.freeze({
        repeatedMistake: homeScenePickRepeatedMistake(items),
        masteredMistake: homeScenePickMasteredToday(items, now),
        phrasesLearned: typeof stats?.phrasesLearned === 'number' ? stats.phrasesLearned : null,
        friend,
      });
      console.log(LOG, 'special:facts', JSON.stringify({ mistakes: items.length, repeated: next.repeatedMistake?.id ?? null, mastered: next.masteredMistake?.id ?? null, phrasesLearned: next.phrasesLearned, friend: next.friend ? 'есть' : 'нет', ms: Date.now() - startedAt })); // guard-ok: одна строка на чтение
      setFacts(next);
    });
    return () => { alive = false; };
  }, [studyTarget, enabled]);
  return facts;
}
