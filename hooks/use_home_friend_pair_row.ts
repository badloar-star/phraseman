/**
 * Строка «Серия вдвоём · Лидия» в «Сегодня» на Главной (идея 1).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html — homeRow): друг уже занимался, я ещё нет — Главная
 * напоминает, что огонь пары ждёт меня; тап ведёт туда же, куда «Пройти урок». Строка первая, над задачами дня (HomeV2TodayCard pairRow).
 * Данные — снимок «Вместе» на телефоне и свои дни активности; пересчёт при возвращении на Главную. Ни чтений, ни записей Firestore.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { useLang } from '../components/LangContext';
import type { TodayTask } from '../components/home/v2/home_v2_types';
import { getLocalDayKey } from '../app/local_date';
import { maskUid } from '../app/diagnostic_mask';
import { FRIENDS_TOGETHER_UI_ENABLED, useFriendsTogetherEnabled } from '../app/friends_together/together_config';
import { primeFriendsTogetherSnapshot, readMyActiveDays } from '../app/friends_together/together_store';
import { pairCandidatesFromSnapshot, pickHomePair } from '../app/friends_together/pair_today';
import { pairHomeSub, pairHomeTitle } from '../app/friends_together/pair_copy';

export type HomeFriendPairRow = Readonly<{ friendUid: string; title: string; subtitle: string; done: boolean; onPress: () => void }>;

type Picked = Readonly<{ friendUid: string; name: string; streak: number }>;

const log = (line: string): void => { console.log(`[FRIENDS-1] ${line}`); }; // guard-ok: журнал строки Главной, одна строка на пересчёт

async function pickFromSnapshot(): Promise<Picked | null> {
  const snapshot = await primeFriendsTogetherSnapshot();
  if (!snapshot) {
    log('home:pair_row none reason=no_snapshot');
    return null;
  }
  const myDays = await readMyActiveDays();
  const candidates = pairCandidatesFromSnapshot(snapshot, myDays, getLocalDayKey());
  const best = pickHomePair(candidates);
  log(`home:pair_row friends=${Object.keys(snapshot.pairs).length} named=${candidates.length} picked=${best ? `${maskUid(best.friendUid)}:${best.view.streak}` : 'none'} snapshotAgeMin=${Math.round((Date.now() - snapshot.updatedAtMs) / 60000)} myDays=${myDays ? 'yes' : 'no'}`);
  return best ? { friendUid: best.friendUid, name: best.name, streak: best.view.streak } : null;
}

/**
 * Строка для HomeV2TodayCard.pairRow или null. tasks и onOpenTask — те же, что Главная отдаёт карточке «Сегодня»:
 * тап открывает задачу «Пройти урок» (нет её — первую незакрытую задачу дня).
 */
export function useHomeFriendPairRow(tasks: readonly TodayTask[], onOpenTask: (task: TodayTask) => void): HomeFriendPairRow | null {
  const { enabled } = useFriendsTogetherEnabled();
  const { lang } = useLang();
  const [picked, setPicked] = useState<Picked | null>(null);
  const on = FRIENDS_TOGETHER_UI_ENABLED && enabled;

  useFocusEffect(useCallback(() => {
    if (!on) {
      setPicked(null);
      return undefined;
    }
    let cancelled = false;
    pickFromSnapshot()
      .then((next) => { if (!cancelled) setPicked(next); })
      .catch((e: unknown) => {
        console.warn(`[FRIENDS-1] home:pair_row failed → строки нет: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
        if (!cancelled) setPicked(null);
      });
    return () => { cancelled = true; };
  }, [on]));

  // зачем (скорость Главной, как HomeV2TodayCard latestRef): Главная пересобирает tasks и обработчики на каждый рендер —
  // строка берёт их из ref в момент тапа, а сам объект строки меняется только со сменой друга или языка
  const latest = useRef({ tasks, onOpenTask });
  latest.current = { tasks, onOpenTask };
  return useMemo(() => {
    if (!picked) return null;
    return {
      friendUid: picked.friendUid,
      title: pairHomeTitle(lang, picked.name),
      subtitle: pairHomeSub(lang, picked.streak),
      done: false,
      onPress: () => {
        const { tasks: list, onOpenTask: open } = latest.current;
        const target = list.find((task) => task.kind === 'lesson') ?? list.find((task) => !task.done) ?? list[0] ?? null;
        if (!target) {
          log(`home:pair_row tap → no_today_task friend=${maskUid(picked.friendUid)}`);
          return;
        }
        log(`home:pair_row tap → task=${target.kind} friend=${maskUid(picked.friendUid)} streak=${picked.streak}`);
        open(target);
      },
    };
  }, [lang, picked]);
}
