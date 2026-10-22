/**
 * Финал занятия: данные и «Позвать» для карточек «Серия вдвоём» (идея 1).
 *
 * зачем (владелец 21.10, макет docs/design/v2-app/friends-full.html «Финал занятия»): сразу после занятия видно, что общая серия
 * выросла, и кого позвать. Пары — из снимка «Вместе» на телефоне, огонь пересчитан по свежим своим дням (занятие только что
 * засчитано) — без сети и без Firestore. «Позвать» — мгновенно «Позвали», ответ сервера догоняет; сбой сети — снова «Позвать».
 * Виден только при FRIENDS_TOGETHER_UI_ENABLED и включённом friends_together_enabled.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import FriendPairFinishRows, { type FinishPairRow } from './FriendPairFinishRows';
import type { FriendCallState } from './FriendCallPill';
import { useIsPlus } from '../plus/use_is_plus';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { getLocalDayKey } from '../../app/local_date';
import { maskUid } from '../../app/diagnostic_mask';
import { FRIENDS_TOGETHER_UI_ENABLED, useFriendsTogetherEnabled } from '../../app/friends_together/together_config';
import { primeFriendsTogetherSnapshot, readMyActiveDays } from '../../app/friends_together/together_store';
import { pairCandidatesFromSnapshot, pickFinishPairs } from '../../app/friends_together/pair_today';
import { isNudgedToday, nudgeFriend, primeNudgedTodayCache } from '../../app/friends_together/nudge_client';

type Picked = Readonly<{ together: FinishPairRow | null; pending: FinishPairRow | null }>;

const log = (line: string): void => { console.log(`[FRIENDS-1] ${line}`); }; // guard-ok: журнал финала, одна строка на шаг

async function pickFromSnapshot(): Promise<Readonly<{ picked: Picked; myName: string }> | null> {
  const [snapshot, myDays, myName] = await Promise.all([
    primeFriendsTogetherSnapshot(),
    readMyActiveDays(),
    AsyncStorage.getItem('user_name').catch((e: unknown) => {
      console.warn(`[FRIENDS-1] finish:pairs user_name read failed → инициал без имени: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
      return null;
    }),
  ]);
  if (!snapshot) {
    log('finish:pairs none reason=no_snapshot');
    return null;
  }
  const candidates: FinishPairRow[] = pairCandidatesFromSnapshot(snapshot, myDays, getLocalDayKey());
  const picked = pickFinishPairs(candidates);
  log(`finish:pairs friends=${Object.keys(snapshot.pairs).length} together=${picked.together ? `${maskUid(picked.together.friendUid)}:${picked.together.view.streak}` : 'none'} pending=${picked.pending ? `${maskUid(picked.pending.friendUid)}:${picked.pending.view.streak}` : 'none'}`);
  return { picked, myName: myName ?? '' };
}

function callStateFor(result: Awaited<ReturnType<typeof nudgeFriend>>): FriendCallState {
  if (result.ok) return result.queued ? 'queued' : 'called';
  if (result.reason === 'quiet_hours') return 'quiet';
  if (result.reason === 'daily_limit' || result.reason === 'sender_limit' || result.reason === 'receiver_limit') return 'limit';
  return 'idle'; // сеть / не друзья / выключено у друга — снова «Позвать», можно повторить
}

export default function FinishFriendPairs() {
  const { enabled } = useFriendsTogetherEnabled();
  const on = FRIENDS_TOGETHER_UI_ENABLED && enabled;
  const myCoinRank = useMyCoinRank();
  const myIsPlus = useIsPlus();
  const [state, setState] = useState<Readonly<{ picked: Picked; myName: string }> | null>(null);
  const [callState, setCallState] = useState<FriendCallState>('idle');
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!on) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        await primeNudgedTodayCache();
        const next = await pickFromSnapshot();
        if (cancelled || !next) return;
        setState(next);
        const pendingUid = next.picked.pending?.friendUid;
        if (pendingUid && isNudgedToday(pendingUid)) setCallState('called');
      } catch (e) {
        console.warn(`[FRIENDS-1] finish:pairs failed → карточек нет: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
      }
    })();
    return () => { cancelled = true; };
  }, [on]);

  const pending = state?.picked.pending ?? null;
  const onCall = useCallback(() => {
    if (!pending || inFlightRef.current) {
      log(`finish:call skip reason=${pending ? 'in_flight' : 'no_pending'}`);
      return;
    }
    inFlightRef.current = true;
    setCallState('called'); // зачем (Optimistic UI): «Позвали» сразу, до ответа сервера
    void nudgeFriend(pending.friendUid)
      .then((result) => {
        const next = callStateFor(result);
        log(`finish:call result friend=${maskUid(pending.friendUid)} ok=${result.ok}${result.ok ? '' : ` reason=${result.reason}`} → ${next}`);
        setCallState(next);
      })
      .catch((e: unknown) => {
        console.warn(`[FRIENDS-1] finish:call failed → снова «Позвать»: ${e instanceof Error ? e.message : String(e)}`); // guard-ok: catch называет причину
        setCallState('idle');
      })
      .finally(() => { inFlightRef.current = false; });
  }, [pending]);

  if (!on || !state || (!state.picked.together && !pending)) return null;
  return (
    <FriendPairFinishRows
      me={{ name: state.myName, coinRank: myCoinRank, isPlus: myIsPlus }}
      together={state.picked.together}
      pending={pending ? { ...pending, callState, onCall } : null}
    />
  );
}
