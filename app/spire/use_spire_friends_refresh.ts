// ═══════════════════════════════════════════════════════════════════════════
// use_spire_friends_refresh.ts — ручное обновление ряда «Друзья на этой неделе» (потянуть экран Шпиля).
//
// зачем (смета Firebase 13.10, п. 5; координатор): профили друзей живут в кэше 30 мин, обновить их раньше можно вручную. Идёт мимо кэша; повторное потягивание
// во время загрузки игнорируется (один вызов, а не пачка); сбой не стирает ряд (spireLoadFriendChips вернёт null); смена числа чипов — плавным переходом.
//
// зачем (Ревизор F02, координатор 15.10, R40): новый друг не появлялся в ряду до ручного потягивания. Теперь ряд следит за снимком друзей
// (app_snapshot_store; его обновляет вкладка «Друзья», в том числе оптимистично при принятии заявки): сменился НАБОР друзей → ряд
// перечитывается из кэша профилей (сеть — только за профилем нового друга). Серия правок склеивается в одно обновление.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getAppSnapshot, subscribeAppSnapshot } from '../app_snapshot_store';
import type { SpireLang } from '../../modules/spire/report_queue';
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import { spireLoadFriendChips } from './spire_friends_client';
import type { SpireLiveGate } from './spire_live_gate';

const LOG = '[SPIRE]';
const FOLLOW_DEBOUNCE_MS = 400;

/** Набор друзей владельца myUid из снимка (сортированный список uid) или null — снимка нет / он чужой. */
function friendSetKey(myUid: string): string | null {
  const snap = getAppSnapshot().friends;
  if (!snap || snap.canonicalUid !== myUid) return null;
  return snap.friends.map((f) => f.uid).filter(Boolean).sort().join(',');
}
const sizeOf = (key: string | null): number => (key ? key.split(',').length : 0);

type Input = Readonly<{
  gate: SpireLiveGate | null;
  ids: Readonly<{ uid: string; stableId: string }> | null;
  lang: SpireLang | null;
  friendsCount: number;
  setFriends: (chips: readonly SpireFriendChip[]) => void;
  runtimeActive: boolean;
  ownerEpoch: number;
}>;

export function useSpireFriendsRefresh({ gate, ids, lang, friendsCount, setFriends, runtimeActive, ownerEpoch }: Input): () => Promise<void> {
  const inFlightRef = useRef<Readonly<{ ownerKey: string; sessionGeneration: number; token: symbol }> | null>(null);
  const loadedKeyByOwnerRef = useRef(new Map<string, string | null>());
  const requestGenerationByOwnerRef = useRef(new Map<string, number>());
  const runtimeSessionRef = useRef<Readonly<{ signature: string | null; generation: number }>>({ signature: null, generation: 0 });
  const countRef = useRef(0);
  countRef.current = friendsCount;
  const ownerKey = gate && ids && lang ? `${ids.uid}|${ids.stableId}|${lang}` : null;
  const activeOwnerKey = runtimeActive ? ownerKey : null;
  const runtimeSessionSignature = `${ownerEpoch}|${activeOwnerKey ?? 'inactive'}`;
  const activeOwnerKeyRef = useRef(activeOwnerKey);
  useLayoutEffect(() => {
    if (runtimeSessionRef.current.signature !== runtimeSessionSignature) {
      runtimeSessionRef.current = { signature: runtimeSessionSignature, generation: runtimeSessionRef.current.generation + 1 };
      inFlightRef.current = null; // новый committed runtime-сеанс не ждёт старый manual; old finally защищён своим token
    }
    activeOwnerKeyRef.current = activeOwnerKey;
  }, [activeOwnerKey, runtimeSessionSignature]);
  useEffect(() => {
    if (!gate || !ids || !lang || !ownerKey) { DebugLogger.info(LOG, `friends: слежение выключено (gate=${gate ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} lang=${lang ?? '—'} active=${runtimeActive ? 'да' : 'нет'})`); return undefined; }
    const currentKey = friendSetKey(ids.uid);
    const loadedKeys = loadedKeyByOwnerRef.current;
    if (!loadedKeys.has(ownerKey)) loadedKeys.set(ownerKey, currentKey); // baseline нужен и hidden-владельцу: его entry-load уже мог показать S0
    if (!runtimeActive) { DebugLogger.info(LOG, `friends: hidden baseline сохранён (${currentKey === null ? 'снимка нет' : sizeOf(currentKey)})`); return undefined; }
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = (key: string, before: string | null): void => {
      if (timer) clearTimeout(timer);
      if (key === loadedKeys.get(ownerKey)) { timer = null; return; }
      timer = setTimeout(() => {
        timer = null;
        const sessionGeneration = runtimeSessionRef.current.generation;
        const generation = (requestGenerationByOwnerRef.current.get(ownerKey) ?? 0) + 1;
        requestGenerationByOwnerRef.current.set(ownerKey, generation);
        DebugLogger.info(LOG, `friends: набор друзей изменился (было ${sizeOf(before)}, стало ${sizeOf(key)}) — обновляю ряд`);
        void spireLoadFriendChips(gate, { myUid: ids.uid, lang }).then((chips) => {
          if (!alive || runtimeSessionRef.current.generation !== sessionGeneration || activeOwnerKeyRef.current !== ownerKey || friendSetKey(ids.uid) !== key || requestGenerationByOwnerRef.current.get(ownerKey) !== generation) { DebugLogger.info(LOG, 'friends: обновление пришло после скрытия/смены владельца или устарело — не показываю'); return; }
          // без force загрузчик отвечает [] и на сбой — при непустом наборе это не «друзей нет», прежний ряд не стираем
          if (!chips || (chips.length === 0 && sizeOf(key) > 0)) { DebugLogger.info(LOG, `friends: обновление по смене набора не загрузилось (${chips ? 'пусто при непустом наборе' : 'null'}) — прежний ряд остаётся`); return; }
          loadedKeys.set(ownerKey, key);
          if (chips.length !== countRef.current) animateNextLayoutTransition();
          setFriends(chips);
        });
      }, FOLLOW_DEBOUNCE_MS);
    };
    if (currentKey !== null && currentKey !== loadedKeys.get(ownerKey)) scheduleRefresh(currentKey, loadedKeys.get(ownerKey) ?? null);
    DebugLogger.info(LOG, `friends: слежу за набором друзей (сейчас ${currentKey === null ? 'снимка нет' : sizeOf(currentKey)})`);
    const unsubscribe = subscribeAppSnapshot(() => {
      const key = friendSetKey(ids.uid);
      if (key === null) return;
      if (key === loadedKeys.get(ownerKey)) { if (timer) clearTimeout(timer); timer = null; return; }
      scheduleRefresh(key, loadedKeys.get(ownerKey) ?? null);
    });
    return () => { alive = false; unsubscribe(); if (timer) clearTimeout(timer); };
  }, [gate, ids, lang, ownerKey, runtimeActive, runtimeSessionSignature, setFriends]);
  return useCallback(async (): Promise<void> => {
    if (!gate || !ids || !lang || !ownerKey || !runtimeActive) {
      DebugLogger.info(LOG, `friends: потягивание проигнорировано (gate=${gate ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} lang=${lang ?? '—'} active=${runtimeActive ? 'да' : 'нет'})`);
      return;
    }
    const sessionGeneration = runtimeSessionRef.current.generation;
    if (inFlightRef.current?.sessionGeneration === sessionGeneration) {
      DebugLogger.info(LOG, 'friends: потягивание проигнорировано — обновление уже идёт');
      return;
    }
    const token = Symbol(ownerKey);
    inFlightRef.current = { ownerKey, sessionGeneration, token };
    const requestKey = friendSetKey(ids.uid);
    const generation = (requestGenerationByOwnerRef.current.get(ownerKey) ?? 0) + 1;
    requestGenerationByOwnerRef.current.set(ownerKey, generation);
    try {
      const chips = await spireLoadFriendChips(gate, { myUid: ids.uid, lang }, { force: true });
      if (!chips || runtimeSessionRef.current.generation !== sessionGeneration || activeOwnerKeyRef.current !== ownerKey || friendSetKey(ids.uid) !== requestKey || requestGenerationByOwnerRef.current.get(ownerKey) !== generation) return;
      loadedKeyByOwnerRef.current.set(ownerKey, requestKey);
      if (chips.length !== countRef.current) animateNextLayoutTransition();
      setFriends(chips);
    } finally {
      if (inFlightRef.current?.token === token) inFlightRef.current = null;
    }
  }, [gate, ids, lang, ownerKey, runtimeActive, setFriends]);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
