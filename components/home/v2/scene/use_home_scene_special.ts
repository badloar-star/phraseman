// ═══════════════════════════════════════════════════════════════════════════
// use_home_scene_special.ts — особая сцена Главной: собирает факты телефона, зовёт pickHomeSceneSpecial, отмечает показ.
//
// зачем (владелец 25.10 утвердил 12 новых состояний; спецификация docs/work/tasks/home-scene-new-states-spec-2026-10-25.md):
// всё из данных телефона — 0 новых чтений Firestore. Пачка 1: «Накопились ошибки» (счётчик ошибок уже считает Главная),
// «Слова на повтор» (память свайпа карточек — один ключ хранилища), «Праздник» (календарь телефона), «Итоги недели»
// (дни занятий из личного прогресса). Остальные состояния ждут своих данных (их входы — null, модель их не выбирает).
// Журнал [HOME-SCENE] special: факты, решение с причиной, показ; каждый ранний выход и сбой — с причиной.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';

import type { Lang } from '../../../../constants/i18n';
import type { HomeSceneCopy } from './home_scene_copy';
import { pickHomeSceneSpecial, type HomeSceneSpecialDecision, type HomeSceneSpecialInput, type HomeSceneSpecialJournal, type HomeSceneSpecialState } from './home_scene_special';
import { buildHomeSceneSpecialCopy } from './home_scene_special_copy';
import { noteHomeSceneSpecialShown, peekHomeSceneSpecialJournal, readHomeSceneSpecialJournal } from './home_scene_special_journal';
import type { HomeSceneDecision } from './home_scene_state';

const LOG = '[HOME-SCENE]';

/** Куда ведёт кнопка особой сцены; переход делает Главная (её охраняемая навигация и учёт открытий). */
export type HomeSceneSpecialRoute = 'mistakes' | 'cards' | 'continue' | 'stats';

const ROUTE: Readonly<Record<HomeSceneSpecialState, HomeSceneSpecialRoute>> = Object.freeze({
  mistakes_pile: 'mistakes', mistake_poke: 'mistakes', mistake_mastered: 'mistakes', words_due: 'cards',
  holiday: 'continue', personal_best: 'continue', friend_nudge: 'continue', phrase_of_day_unseen: 'continue',
  peak_overtaken: 'continue', milestone: 'stats', fun_stats: 'stats', weekly_recap: 'stats',
});

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Дней с занятиями на прошлой неделе (пн–вс перед текущей), по датам прогресса 'YYYY-MM-DD'. */
export function homeSceneLastWeekDays(activityDates: readonly string[], now: Date): number {
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (now.getDay() + 6) % 7;
  const thisMonday = todayUtc - sinceMonday * 86_400_000;
  const lastMonday = thisMonday - 7 * 86_400_000;
  const days = new Set<number>();
  for (const d of activityDates) {
    const m = DAY_KEY.exec(d);
    if (!m) continue;
    const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (t >= lastMonday && t < thisMonday) days.add(t);
  }
  return days.size;
}

export type HomeSceneSpecialFacts = Readonly<{
  /** Неразобранные ошибки (счётчик Главной); null — ещё не прочитан. */
  mistakesOpen: number | null;
  /** Карточки «пора повторить»; null — ещё не прочитаны. */
  wordsDue: number | null;
  activityDates: readonly string[];
}>;

export type HomeSceneSpecialView = Readonly<{
  special: HomeSceneSpecialState;
  key: string | null;
  copy: HomeSceneCopy;
  route: HomeSceneSpecialRoute;
}>;

export function useHomeSceneSpecial(i: Readonly<{
  lang: Lang;
  decision: HomeSceneDecision;
  facts: HomeSceneSpecialFacts;
  /** Подпись места продолжения («Урок 1 · Эпизод 2») — строка праздника. */
  place: string | null;
  /** Главная на экране и приложение активно: показ отмечаем только тогда. */
  active: boolean;
}>): HomeSceneSpecialView | null {
  const [journal, setJournal] = useState<HomeSceneSpecialJournal | null>(peekHomeSceneSpecialJournal);
  useEffect(() => {
    if (journal) return undefined;
    let alive = true;
    void readHomeSceneSpecialJournal().then((j) => { if (alive) setJournal(j); });
    return () => { alive = false; };
  }, [journal]);
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const hour = now.getHours();
  const weekDays = useMemo(() => homeSceneLastWeekDays(i.facts.activityDates, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: неделя меняется вместе с днём
    [i.facts.activityDates, dayKey]);
  const decision: HomeSceneSpecialDecision | null = useMemo(() => {
    if (!journal) return null;
    const input: HomeSceneSpecialInput = {
      now: new Date(), mistakesOpen: i.facts.mistakesOpen, repeatedMistake: null, masteredMistake: null, phraseOfDaySeen: null,
      wordsDue: i.facts.wordsDue, progressDays: null, today: null, activeLastWeek: weekDays > 0, milestoneKey: null, friendAhead: null, peakOvertaken: null,
    };
    return pickHomeSceneSpecial(input, i.decision, journal);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: час нужен только для «фразы дня до 20:00» и смены дня
  }, [journal, i.decision, i.facts.mistakesOpen, i.facts.wordsDue, weekDays, dayKey, hour]);
  const logRef = useRef('');
  useEffect(() => {
    const key = decision ? `${decision.special ?? 'none'}|${decision.reason}` : 'journal_pending';
    if (logRef.current === key) return;
    logRef.current = key;
    console.log(LOG, 'special', JSON.stringify({ special: decision?.special ?? null, key: decision?.key ?? null, reason: decision?.reason ?? 'journal_pending', base: i.decision.state, mistakesOpen: i.facts.mistakesOpen, wordsDue: i.facts.wordsDue, lastWeekDays: weekDays, last: journal?.last ?? null })); // guard-ok: одна строка на смену решения
  }, [decision, i.decision.state, i.facts.mistakesOpen, i.facts.wordsDue, weekDays, journal]);
  const special = decision?.special ?? null;
  const specialKey = decision?.key ?? null;
  // Показ отмечаем, когда сцену правда видно: Главная на экране и приложение активно.
  useEffect(() => {
    if (!special || !i.active) return;
    const next = noteHomeSceneSpecialShown(special, specialKey);
    if (next !== journal) setJournal(next);
  }, [special, specialKey, i.active, journal]);
  return useMemo(() => {
    if (!special) return null;
    const copy = buildHomeSceneSpecialCopy({
      lang: i.lang, special,
      n: special === 'mistakes_pile' ? i.facts.mistakesOpen ?? 0 : special === 'words_due' ? i.facts.wordsDue ?? 0 : undefined,
      holiday: special === 'holiday' ? specialKey ?? undefined : undefined,
      place: i.place ?? undefined,
      weekDays,
    });
    return Object.freeze({ special, key: specialKey, copy, route: ROUTE[special] });
  }, [special, specialKey, i.lang, i.facts.mistakesOpen, i.facts.wordsDue, i.place, weekDays]);
}

/**
 * Карточки «пора повторить» — один ключ хранилища (память свайпа), раз на вход в Главную; сбой — null (сцены «Слова» нет).
 * зачем (💸): без сети и без повторных чтений — пересчёт только при смене цели обучения.
 */
export function useHomeSceneWordsDue(studyTarget: unknown): number | null {
  const [due, setDue] = useState<number | null>(null);
  useEffect(() => {
    if (studyTarget === undefined || studyTarget === null) { console.log(LOG, 'special:words_due_skip', JSON.stringify({ reason: 'no_study_target' })); return undefined; } // guard-ok: ранний выход с причиной
    let alive = true;
    void import('../../../../app/flashcards/cardStatus')
      .then((m) => m.loadFlashcardStatuses(studyTarget as Parameters<typeof m.loadFlashcardStatuses>[0], Date.now()))
      .then((map) => {
        if (!alive) return;
        const n = Object.values(map).filter((s) => s === 'review').length;
        console.log(LOG, 'special:words_due', JSON.stringify({ studyTarget: String(studyTarget), due: n, cards: Object.keys(map).length })); // guard-ok: одна строка на чтение
        setDue(n);
      })
      .catch((error: unknown) => {
        console.warn(LOG, 'special:words_due_failed', JSON.stringify({ studyTarget: String(studyTarget), error: error instanceof Error ? error.message : String(error) })); // guard-ok: сбой с причиной
        if (alive) setDue(null);
      });
    return () => { alive = false; };
  }, [studyTarget]);
  return due;
}
