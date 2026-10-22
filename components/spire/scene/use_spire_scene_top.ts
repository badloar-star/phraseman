// ═══════════════════════════════════════════════════════════════════════════
// use_spire_scene_top.ts — данные «Сцены» Пика для экрана: состояние входа, тексты и комната из того, что экран уже знает.
//
// зачем (Пик v2, шаг 3b; владелец 22.10 выбрал V2 «Пьедестал перед башней»): экран Пика держится в лимите 400 строк — сборка сцены
// здесь, экран зовёт одну строку. Энергия — из памяти процесса (peekEnergy), без подписки на EnergyContext: подписка перерисовывала бы
// весь экран раз в секунду, пока идёт восстановление (живой отсчёт — у кнопки и у заголовка сцены). «2 ч 20 мин» вечером обновляется
// раз в минуту и только пока Пик на экране. Новых чтений нет. Журнал [SPIRE-SCENE]: одна строка на смену решения, с причиной.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react';

import { peekEnergy } from '../../../app/energy_peek_cache';
import type { Lang } from '../../../constants/i18n';
import { SPIRE_CONFIG_DEFAULTS, type SpireCoinsConfig } from '../../../modules/spire/config_contract';
import { spireWeekStartMs } from '../../../modules/spire/residents';
import { spireTierName } from '../../../modules/spire/tier_names';
import type { SpireMemberRow, SpireRankByView } from '../spire_room_types';
import { SPIRE_FLOOR_COUNT, spireFloorCoinsOf, spireStepsIn } from '../spire_tower_model';
import {
  SPIRE_SCENE_V2_ENABLED, buildSpireSceneCopy, pickSpireSceneState, spireSceneRoom, type SpireSceneCopy, type SpireSceneDecision, type SpireSceneRoom,
} from './spire_scene_model';

const LOG = '[SPIRE-SCENE]';
const WEEK_MS = 7 * 86_400_000;
const DASH = '—';

export type SpireSceneTop = Readonly<{ decision: SpireSceneDecision; copy: SpireSceneCopy; room: SpireSceneRoom; tierName: string }>;

export type SpireSceneTopArgs = Readonly<{
  lang: Lang;
  /** Комната недели (строки экрана); null — ещё не пришла. */
  members: readonly SpireMemberRow[] | null;
  rankBy: SpireRankByView;
  /** Комната подбирается: экран рисовал бы скелет пьедестала. */
  roomSearching: boolean;
  offline: boolean;
  plus: boolean;
  tier: number | null;
  floor: number | null;
  stepInFloor: number | null;
  /** Монеты из конфига сервера; null — конфиг ещё не прочитан (тогда — значения по умолчанию, экран всё равно рисует скелет). */
  coins: SpireCoinsConfig | null;
  /** Пик на экране (вкладка видна): только тогда тикают минуты вечера. */
  active: boolean;
}>;

/** Данные «Сцены» Пика; null — флаг выключен (экран рисует прежние заголовок, комнату и окно башни). */
export function useSpireSceneTop(a: SpireSceneTopArgs): SpireSceneTop | null {
  const [minuteTick, setMinuteTick] = useState(0);
  const room = useMemo(() => spireSceneRoom(a.members, a.rankBy), [a.members, a.rankBy]);
  const peek = peekEnergy();
  const energy = a.plus ? null : peek ? peek.energy : null;
  const nowMs = Date.now();
  const msLeft = Math.max(0, spireWeekStartMs(nowMs) + WEEK_MS - nowMs);
  // зачем: остаток недели сравниваем по минутам — иначе решение и тексты пересоздавались бы на каждый рендер экрана
  const minuteKey = Math.floor(msLeft / 60_000);
  const decision = useMemo(
    () => pickSpireSceneState({ roomSearching: a.roomSearching, msLeft, placesToPromo: room.placesToPromo, plus: a.plus, energy, offline: a.offline }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: msLeft меняется каждую миллисекунду, решению хватает минуты (minuteKey)
    [a.roomSearching, minuteKey, room.placesToPromo, a.plus, energy, a.offline],
  );
  const evening = decision.state === 'eve';
  useEffect(() => {
    if (!SPIRE_SCENE_V2_ENABLED || !evening || !a.active) return undefined;
    const timer = setInterval(() => setMinuteTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, [evening, a.active]);
  const tierName = a.tier !== null ? spireTierName(a.tier, a.lang) : DASH;
  const floor = Math.min(Math.max(a.floor ?? 1, 1), SPIRE_FLOOR_COUNT);
  const coins = a.coins ?? SPIRE_CONFIG_DEFAULTS.coins;
  const copy = useMemo(
    () => buildSpireSceneCopy(a.lang, decision.state, {
      tierName, msLeft, floor, stepDone: a.stepInFloor ?? 0, stepTotal: spireStepsIn(floor), perStep: coins.perStep, floorCoins: spireFloorCoinsOf(floor, coins), placesToPromo: room.placesToPromo,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: тексты вечера меняются раз в минуту (minuteKey, minuteTick)
    [a.lang, decision.state, tierName, minuteKey, minuteTick, floor, a.stepInFloor, coins, room.placesToPromo],
  );
  const logKeyRef = useRef('');
  useEffect(() => {
    if (!SPIRE_SCENE_V2_ENABLED) return;
    const key = `${decision.state}|${decision.reason}|${String(decision.offlineLine)}`;
    if (logKeyRef.current === key) return;
    logKeyRef.current = key;
    console.log(LOG, 'decision', JSON.stringify({ state: decision.state, reason: decision.reason, offlineLine: decision.offlineLine, energy, energySource: a.plus ? 'Plus: без лимита' : peek ? 'память процесса (peekEnergy)' : 'нет в памяти', place: room.myPlace, toPromo: room.placesToPromo, members: room.count, roomSearching: a.roomSearching, tier: a.tier, floor, stepInFloor: a.stepInFloor })); // guard-ok: одна строка на смену решения
  }, [decision, energy, peek, a.plus, room, a.roomSearching, a.tier, floor, a.stepInFloor]);
  return useMemo(() => (SPIRE_SCENE_V2_ENABLED ? Object.freeze({ decision, copy, room, tierName }) : null), [decision, copy, room, tierName]);
}
