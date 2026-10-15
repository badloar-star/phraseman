// ═══════════════════════════════════════════════════════════════════════════
// use_spire_position_moments.ts — Ядро для окон m05 Пика (договор components/spire/moments/position_moments_contract.ts).
//
// зачем (координатор 15.10): Дизайн показывает «Позиция выросла», «Тебя обогнали», «Последний шанс» по готовым решениям; «когда» —
// здесь. Решения считает чистое ядро (spire_position_moments_core.ts) по строкам комнаты, которые экран Пика уже держит, —
// 0 чтений сети. Хранится на устройстве только служебное: последняя виденная позиция (для «обогнали» между загрузками комнаты)
// и неделя, в которую «последний шанс» уже показан. Непоказанное не копится (фундамент «празднование не durable»).
//   • rise — событие перехода зоны после своей ступени; пометка показа — в памяти;
//   • overtake — не чаще раза за сессию (процесс);
//   • lastChance — раз в неделю (пометка на устройстве).
// Журнал [SPIRE-MOMENT-TRIGGER] — каждое решение и каждый пропуск с причиной.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { useEnergy } from '../../components/EnergyContext';

import type {
  SpireOvertakeShow,
  SpirePositionMomentKind,
  SpirePositionMoments,
  SpirePositionRiseShow,
} from '../../components/spire/moments/position_moments_contract';
import type { SpireRoomRow } from '../../modules/spire/room_rows';
import {
  spireDecideLastChance,
  spireDecideOvertake,
  spireDecideRise,
  spirePositionOf,
  type SpirePositionState,
  type SpireRankByView,
} from './spire_position_moments_core';
import { peekSpirePositionFeed, subscribeSpirePositionFeed } from './spire_position_feed';

const LOG = '[SPIRE-MOMENT-TRIGGER]'; // ветка общего журнала Пика '[SPIRE]'
const seenKey = (uid: string, lang: string): string => `spire_position_seen_v1:${uid}:${lang}`;
const lastChanceKey = (uid: string, lang: string): string => `spire_last_chance_shown_v1:${uid}:${lang}`;

/** «Тебя обогнали» — не чаще раза за сессию (процесс приложения). */
let overtakeShownThisSession = false;

export function __resetSpirePositionMomentsForTests(): void {
  overtakeShownThisSession = false;
}

export type SpirePositionMomentsInput = Readonly<{
  /** Ворота Пика открыты и комната загружена. */
  enabled: boolean;
  uid: string | null;
  lang: string | null;
  weekId: string | null;
  /** room.fetchedAtMs — отличает одну загрузку комнаты от другой. */
  roomFetchedAtMs: number | null;
  /** Строки комнаты, уже отсортированные (useSpireGame().rows). */
  rows: readonly SpireRoomRow[] | null;
  rankBy: SpireRankByView;
  /** Когда будет энергия на ступень: сейчас (есть энергия / Plus) или now + timeUntilNextMs. Берётся в момент решения. */
  energyReadyAtMs: number;
  /** Только тесты: «сейчас». */
  nowMs?: number;
}>;

function readSeen(raw: string | null): SpirePositionState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<SpirePositionState>;
    return typeof s.weekId === 'string' && Number.isFinite(s.roomFetchedAtMs) && Number.isFinite(s.place)
      ? (s as SpirePositionState) : null;
  } catch (error) {
    console.warn(`${LOG} overtake: прежняя позиция не разобралась (${String(error)}) — считаем, что её нет`);
    return null;
  }
}

/**
 * Для SpireMomentsLayer (договор Дизайна: вызов без аргументов). Позиция — из spire_position_feed (её публикует useSpireGame),
 * энергия — из useEnergy: когда будет энергия на ступень (сейчас — если есть или Plus).
 */
export function useSpirePositionMoments(): SpirePositionMoments {
  const feed = useSyncExternalStore(subscribeSpirePositionFeed, peekSpirePositionFeed, peekSpirePositionFeed);
  const { energy, bonusEnergy, isUnlimited, timeUntilNextMs } = useEnergy();
  const energyReadyAtMs = isUnlimited || energy + bonusEnergy > 0 ? Date.now() : Date.now() + Math.max(0, timeUntilNextMs);
  return useSpirePositionMomentsWith({
    enabled: feed !== null,
    uid: feed?.uid ?? null,
    lang: feed?.lang ?? null,
    weekId: feed?.weekId ?? null,
    roomFetchedAtMs: feed?.roomFetchedAtMs ?? null,
    rows: feed?.rows ?? null,
    rankBy: feed?.rankBy ?? 'steps',
    energyReadyAtMs,
  });
}

/** То же по явным данным (тесты, превью). */
export function useSpirePositionMomentsWith(input: SpirePositionMomentsInput): SpirePositionMoments {
  const { enabled, uid, lang, weekId, roomFetchedAtMs, rows, rankBy, nowMs } = input;
  const energyRef = useRef(input.energyReadyAtMs);
  energyRef.current = input.energyReadyAtMs;
  const [rise, setRise] = useState<SpirePositionRiseShow | null>(null);
  const [overtake, setOvertake] = useState<SpireOvertakeShow | null>(null);
  /** undefined — пометка ещё не прочитана (окно не решаем, чтобы не показать дважды). */
  const [lastChanceShownWeek, setLastChanceShownWeek] = useState<string | null | undefined>(undefined);
  const consumedRef = useRef(new Set<string>());
  const [consumedTick, setConsumedTick] = useState(0);
  const prevRef = useRef<SpirePositionState | null>(null);

  const snapshot = useMemo(
    () => (enabled && rows && weekId && roomFetchedAtMs !== null ? spirePositionOf(rows, rankBy, weekId, roomFetchedAtMs) : null),
    [enabled, rows, weekId, roomFetchedAtMs, rankBy],
  );

  // ── rise: переход зоны после своей ступени ──
  useEffect(() => {
    if (!snapshot || !rows) return;
    const prev = prevRef.current;
    prevRef.current = snapshot;
    const d = spireDecideRise(prev, snapshot, rows);
    if (prev) console.log(`${LOG} rise ${d.show ? 'show' : 'skip'}: ${d.why}`);
    if (d.show && !consumedRef.current.has(`rise:${d.show.key}`)) setRise(d.show);
  }, [snapshot, rows]);

  // ── overtake: место хуже между двумя загрузками комнаты (позиция хранится на устройстве) ──
  useEffect(() => {
    if (!snapshot || !rows || !uid || !lang) return undefined;
    let alive = true;
    const key = seenKey(uid, lang);
    void (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(key);
      } catch (error) {
        console.warn(`${LOG} overtake: чтение прежней позиции упало (${String(error)}) — решение пропускаем`);
      }
      if (!alive) { console.log(`${LOG} overtake: экран ушёл до решения`); return; }
      const seen = readSeen(raw);
      if (seen && seen.roomFetchedAtMs !== snapshot.roomFetchedAtMs) {
        const d = spireDecideOvertake(seen, snapshot, rows);
        if (d.show && overtakeShownThisSession) console.log(`${LOG} overtake skip: уже показывали в этой сессии (${d.why})`);
        else console.log(`${LOG} overtake ${d.show ? 'show' : 'skip'}: ${d.why}`);
        if (d.show && !overtakeShownThisSession && !consumedRef.current.has(`overtake:${d.show.key}`)) setOvertake(d.show);
      }
      try {
        await AsyncStorage.setItem(key, JSON.stringify(snapshot));
      } catch (error) {
        console.warn(`${LOG} overtake: позиция не сохранилась (${String(error)}) — следующая загрузка сравнит со старой`);
      }
    })();
    return () => { alive = false; };
  }, [snapshot, rows, uid, lang]);

  // ── lastChance: пометка «показано на неделе» ──
  useEffect(() => {
    if (!uid || !lang) return undefined;
    let alive = true;
    setLastChanceShownWeek(undefined);
    void AsyncStorage.getItem(lastChanceKey(uid, lang))
      .then((raw) => { if (alive) setLastChanceShownWeek(raw); })
      .catch((error: unknown) => {
        console.warn(`${LOG} lastChance: пометка не прочиталась (${String(error)}) — считаем, что не показывали`);
        if (alive) setLastChanceShownWeek(null);
      });
    return () => { alive = false; };
  }, [uid, lang]);

  const lastChanceDecision = useMemo(() => {
    if (!snapshot || !rows || lastChanceShownWeek === undefined) return null;
    if (lastChanceShownWeek === snapshot.weekId) return { show: null, why: `уже показывали на неделе ${snapshot.weekId}` }; // guard-ok: причина для журнала
    return spireDecideLastChance(nowMs ?? Date.now(), snapshot, rows, rankBy, energyRef.current);
  }, [snapshot, rows, rankBy, lastChanceShownWeek, nowMs]);
  useEffect(() => {
    if (lastChanceDecision) console.log(`${LOG} lastChance ${lastChanceDecision.show ? 'show' : 'skip'}: ${lastChanceDecision.why}`);
  }, [lastChanceDecision]);

  const consume = useCallback((kind: SpirePositionMomentKind, key: string) => {
    consumedRef.current.add(`${kind}:${key}`);
    console.log(`${LOG} consume kind=${kind} key=${key}`);
    if (kind === 'overtake') overtakeShownThisSession = true;
    if (kind === 'lastChance' && uid && lang) {
      const week = key.split(':')[0] ?? '';
      setLastChanceShownWeek(week);
      AsyncStorage.setItem(lastChanceKey(uid, lang), week)
        .catch((error: unknown) => console.warn(`${LOG} lastChance: пометка не сохранилась (${String(error)}) — может показаться ещё раз на этой неделе`));
    }
    setConsumedTick((n) => n + 1);
  }, [uid, lang]);

  return useMemo<SpirePositionMoments>(() => {
    const live = <T extends { key: string }>(kind: SpirePositionMomentKind, show: T | null): T | null =>
      (show && !consumedRef.current.has(`${kind}:${show.key}`) ? show : null);
    return {
      rise: live('rise', rise),
      overtake: live('overtake', overtake),
      lastChance: live('lastChance', lastChanceDecision?.show ?? null),
      consume,
    };
    // consumedTick — пересчёт после consume (сама пометка живёт в ref)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rise, overtake, lastChanceDecision, consume, consumedTick]);
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
