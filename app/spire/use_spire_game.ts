// ═══════════════════════════════════════════════════════════════════════════
// use_spire_game.ts — модель игровой части главного экрана Шпиля (пакеты B, D, E).
//
// зачем: SpireHomeScreen остаётся вёрсткой и двумя замками, а всё, что трогает
// сеть и игру, живёт здесь и ТОЛЬКО за SpireLiveGate (spire_tab_enabled +
// config/spire_v1.enabled). Пока ворота закрыты, хук не делает ни одного
// сетевого вызова и ни одной записи — возвращает пустую модель.
//
// Optimistic UI (правило владельца): итог ступени применяется к локальной
// неделе СРАЗУ (маркер едет вверх до записи на диск и до сервера); запись на
// диск догоняет; не записалось — откат к прежней неделе и понятный текст.
// Поздний ответ не затирает свежий (сверка по reportId последней ступени).
// Празднование — только в памяти экрана (фундамент: не durable-очередь).
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, InteractionManager } from 'react-native';

import { spireStepBudgetMs, type SpireConfigDoc } from '../../modules/spire/config_contract';
import { spirePickStepPlan, type SpireStepPick } from '../../modules/spire/pack_plan';
import {
  SPIRE_REPORT_FLUSH_INTERVAL_MS,
  spireApplyStepReport,
  spireCreateWeekLocal,
  type SpireFlushTrigger,
  type SpireLang,
  type SpireWeekLocal,
} from '../../modules/spire/report_queue';
import { spireBuildRoomRows, spireMyPlace, type SpireRoomRow } from '../../modules/spire/room_rows';
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import { spireCurrentWeekKey } from '../../components/spire/spire_tower_model';
import { DebugLogger } from '../debug-logger';
import { recordTodayTaskActivity } from '../../modules/today-tasks/today_tasks_store';
import { spireFlushNow, spireRecordStepResult } from '../spire_report_client';
import { getStableId } from '../stable_id';
import { getCanonicalUserId } from '../user_id_policy';
import { spireLoadFriendChips } from './spire_friends_client';
import { spireOpenLiveGate, type SpireLiveGate } from './spire_live_gate';
import { spirePeekStepAttempt } from './spire_local_store';
import { spireEnsureWeekPack, type SpirePackLoad } from './spire_pack_client';
import { peekSpireRoom, spireSyncRoom, type SpireRoomLoad } from './spire_room_client';
import type { SpireStepContext, SpireStepFinish } from './use_spire_step_runner';
import { spireDismissWeekResult, spireLoadWeekResult, type SpireWeekResultView } from './spire_week_result_client';

const LOG = '[SPIRE]';

export type SpireStepSession = Readonly<{ pick: SpireStepPick; ctx: SpireStepContext; attempt: number; runId: string }>;

/** Итог ступени для панели на сцене башни — только память экрана. */
export type SpireStepOutcome = Readonly<{
  kind: 'passed' | 'floor' | 'summit' | 'failed' | 'save_failed';
  report: SpireStepFinish['report'];
  errors: number;
  usedMs: number;
  budgetMs: number;
  floorBefore: number;
  local: SpireWeekLocal;
  failReason: SpireStepFinish['state']['failReason'];
}>;

export type SpireStartBlock = 'pack_missing' | 'pack_offline' | 'no_identity' | 'no_tier' | null;

type Input = Readonly<{
  config: SpireConfigDoc | null;
  unlocked: boolean;
  lang: SpireLang | null;
  week: SpireWeekLocal | null;
  setWeek: (week: SpireWeekLocal | null) => void;
}>;

export function useSpireGame({ config, unlocked, lang, week, setWeek }: Input) {
  const gate: SpireLiveGate | null = useMemo(
    () => (unlocked && lang ? spireOpenLiveGate(config, 'home') : null),
    [unlocked, lang, config],
  );
  const [ids, setIds] = useState<Readonly<{ uid: string; stableId: string }> | null>(null);
  const [roomLoad, setRoomLoad] = useState<SpireRoomLoad | null>(null);
  const [friends, setFriends] = useState<readonly SpireFriendChip[]>([]);
  const [weekResult, setWeekResult] = useState<SpireWeekResultView | null>(null);
  const [session, setSession] = useState<SpireStepSession | null>(null);
  const [outcome, setOutcome] = useState<SpireStepOutcome | null>(null);
  const [starting, setStarting] = useState(false);
  const [startBlock, setStartBlock] = useState<SpireStartBlock>(null);
  const startingRef = useRef(false);
  const lastReportRef = useRef<string | null>(null);
  const weekRef = useRef(week);
  weekRef.current = week;

  // ── Идентичность: только за воротами (без ворот не нужен даже uid) ──
  useEffect(() => {
    if (!gate) return undefined;
    let alive = true;
    void (async () => {
      const uid = await getCanonicalUserId();
      const stableId = await getStableId();
      if (!alive) return;
      if (!uid || !stableId) {
        DebugLogger.info(LOG, `game: нет идентичности (uid=${uid ? 'есть' : 'нет'}) — сеть Шпиля не трогаем`);
        return;
      }
      setIds({ uid, stableId });
      const peek = peekSpireRoom(uid, lang as SpireLang);
      if (peek) setRoomLoad({ status: 'cache', room: peek, reason: 'memory_peek' });
    })();
    return () => { alive = false; };
  }, [gate, lang]);

  // ── Вход на экран: комната (кэш 6 ч), друзья, итог прошлой недели ──
  useEffect(() => {
    if (!gate || !ids || !lang) return undefined;
    let alive = true;
    void spireSyncRoom(gate, { uid: ids.uid, stableId: ids.stableId, lang }).then((load) => {
      if (!alive) return;
      DebugLogger.info(LOG, `game: комната status=${load.status} reason=${load.reason} group=${load.room?.groupId ?? '—'}`);
      setRoomLoad(load);
      if (load.room) {
        // Прогрев пакета недели: «Подняться» стартует без ожидания сети. После анимаций
        // входа — разбор файла (~1 МБ JSON) не должен съесть первый кадр экрана.
        const room = load.room;
        InteractionManager.runAfterInteractions(() => {
          if (!alive) return;
          void spireEnsureWeekPack(gate, { lang, tier: room.tier, weekId: room.weekId })
            .then((p) => DebugLogger.info(LOG, `game: прогрев пакета status=${p.status} source=${p.source}`));
        });
      }
    });
    void spireLoadFriendChips(gate, { myUid: ids.uid, lang }).then((chips) => { if (alive) setFriends(chips); });
    void spireLoadWeekResult(gate, { uid: ids.uid, lang }).then((res) => { if (alive) setWeekResult(res); });
    return () => { alive = false; };
  }, [gate, ids, lang]);

  // ── Досылка очереди: вход, уход в фон, раз в 5 минут на экране, уход с экрана ──
  const flush = useCallback((trigger: SpireFlushTrigger) => {
    if (!gate || !ids || !lang) return;
    void spireFlushNow({ uid: ids.uid, stableId: ids.stableId, lang, trigger }).then((out) => {
      if (out?.local && out.status === 'sent') {
        // Сервер не трогает локальный маркер; берём свежую очередь, только если неделя та же.
        const cur = weekRef.current;
        if (cur && out.local.weekKey === cur.weekKey && out.local.stepsCleared >= cur.stepsCleared) setWeek(out.local);
      }
    });
  }, [gate, ids, lang, setWeek]);

  useEffect(() => {
    if (!gate || !ids) return undefined;
    flush('app_start');
    const id = setInterval(() => flush('interval'), SPIRE_REPORT_FLUSH_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (next) => { if (next !== 'active') flush('app_background'); });
    return () => {
      clearInterval(id);
      sub.remove();
      flush('screen_leave');
    };
  }, [gate, ids, flush]);

  // ── Строки комнаты: чужие из кэша, свои — локальные (мгновенно после ступени) ──
  const room = roomLoad?.room ?? null;
  const rows: readonly SpireRoomRow[] | null = useMemo(() => {
    if (!room || !ids || !config) return null;
    const mine = week && week.weekKey === room.weekId ? week : null;
    return spireBuildRoomRows({
      room, myUid: ids.uid, mySteps: mine?.stepsCleared ?? 0, myReachedAtMs: mine?.reachedAtMs ?? 0,
      nowMs: Date.now(), tuning: config.residents,
    });
  }, [room, ids, config, week]);
  const myPlace = rows ? spireMyPlace(rows) : null;
  const tier = room?.tier ?? week?.tier ?? null;

  // ── Старт ступени (защита от двойного тапа: один старт за раз) ──
  const startStep = useCallback(async () => {
    if (!gate || !lang || !config) return;
    if (startingRef.current || session) {
      DebugLogger.info(LOG, 'game: старт уже идёт — второй тап игнорируем');
      return;
    }
    if (!ids) { setStartBlock('no_identity'); return; }
    if (tier === null || !room) { setStartBlock('no_tier'); return; }
    startingRef.current = true;
    setStarting(true);
    setStartBlock(null);
    setOutcome(null);
    try {
      const weekKey = spireCurrentWeekKey(Date.now());
      const cur = weekRef.current && weekRef.current.weekKey === weekKey ? weekRef.current : null;
      const floor = cur?.floor ?? 1;
      const stepInFloor = cur?.stepInFloor ?? 0;
      const packLoad: SpirePackLoad = await spireEnsureWeekPack(gate, { lang, tier, weekId: weekKey });
      if (!packLoad.pack) {
        DebugLogger.warn(LOG, `game: старт невозможен — пакета нет (status=${packLoad.status} reason=${packLoad.reason})`);
        setStartBlock(packLoad.status === 'offline' ? 'pack_offline' : 'pack_missing');
        return;
      }
      const attempt = await spirePeekStepAttempt(ids.uid, lang, weekKey, floor, stepInFloor + 1);
      const pick = spirePickStepPlan(packLoad.pack, {
        floor, step: stepInFloor + 1, attempt,
        budgetMs: (kinds) => spireStepBudgetMs(config.timer, floor, kinds),
      });
      if (!pick) {
        DebugLogger.warn(LOG, `game: в пакете нет ступени этаж=${floor} ступень=${stepInFloor + 1}`);
        setStartBlock('pack_missing');
        return;
      }
      const runId = `${weekKey}:${floor}:${stepInFloor + 1}:${attempt}:${Date.now()}`;
      DebugLogger.info(LOG, `game: открываем ступень этаж=${floor} ступень=${stepInFloor + 1} попытка=${attempt} пакет=${packLoad.source}`);
      setSession({ pick, ctx: { lang, weekKey, tier, floor, stepInFloor }, attempt, runId });
    } catch (error) {
      DebugLogger.warn(LOG, `game: старт упал (${error instanceof Error ? error.message : String(error)})`);
      setStartBlock('pack_missing');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [gate, lang, config, session, ids, tier, room]);

  // ── Итог ступени: сначала экран (optimistic), потом диск; не записалось — откат ──
  const onStepFinish = useCallback((finish: SpireStepFinish) => {
    const s = session;
    setSession(null);
    if (!s || !ids || !lang || !config) return;
    const base = weekRef.current && weekRef.current.weekKey === finish.report.weekKey
      ? weekRef.current
      : spireCreateWeekLocal({ lang, weekKey: finish.report.weekKey, tier: finish.report.tier, packHash: finish.report.packHash });
    const applied = spireApplyStepReport(base, finish.report);
    const kind: SpireStepOutcome['kind'] = finish.report.outcome === 'failed' ? 'failed'
      : applied.effect === 'floor_cleared' ? (base.floor === 15 ? 'summit' : 'floor') : 'passed';
    DebugLogger.info(LOG, `game: итог ${finish.report.reportId} effect=${applied.effect} → панель ${kind}; этаж ${base.floor}→${applied.local.floor}`);
    lastReportRef.current = finish.report.reportId;
    setWeek(applied.local);
    const view: SpireStepOutcome = {
      kind, report: finish.report, errors: 3 - finish.state.hearts, usedMs: finish.state.elapsedBudgetMs,
      budgetMs: finish.state.budgetMs, floorBefore: base.floor, local: applied.local, failReason: finish.state.failReason,
    };
    setOutcome(view);
    void spireRecordStepResult(ids.uid, lang, finish.report).then((res) => {
      if (lastReportRef.current !== finish.report.reportId) {
        DebugLogger.info(LOG, `game: запись ${finish.report.reportId} пришла поздно — экран уже новее, не трогаем`);
        return;
      }
      if (!res.persisted) {
        DebugLogger.warn(LOG, `game: ступень ${finish.report.reportId} не записалась на диск — откат маркера`);
        setWeek(base);
        setOutcome({ ...view, kind: 'save_failed', local: base });
        return;
      }
      setWeek(res.local);
      // зачем (D49 + PM-280-A2, «Сегодня»): пройденная НОВАЯ ступень, легшая на
      // диск, засчитывает «Пройти N ступеней Шпиля». Провал и повтор того же отчёта
      // не считаются; ключ — reportId (повтор записи не двигает счётчик дважды).
      if (finish.report.outcome === 'passed' && res.effect !== 'duplicate_ignored') {
        void recordTodayTaskActivity({ kind: 'spire_steps', unitKey: `spire:${finish.report.reportId}`, source: 'spire_step_passed' });
      } else {
        DebugLogger.info('[TODAY-TASKS]', `spire:skip outcome=${finish.report.outcome} effect=${res.effect} report=${finish.report.reportId}`);
      }
    }).catch((error: unknown) => {
      DebugLogger.warn(LOG, `game: запись ступени упала (${String(error)}) — откат маркера`);
      if (lastReportRef.current !== finish.report.reportId) return;
      setWeek(base);
      setOutcome({ ...view, kind: 'save_failed', local: base });
    });
  }, [session, ids, lang, config, setWeek]);

  const onStepAbort = useCallback((reason: 'no_energy' | 'cancelled') => {
    DebugLogger.info(LOG, `game: ступень не началась (${reason}) — энергия не тронута`);
    setSession(null);
  }, []);

  const dismissOutcome = useCallback(() => setOutcome(null), []);
  const dismissWeekResult = useCallback(() => {
    const res = weekResult;
    setWeekResult(null);
    if (res && ids && lang) void spireDismissWeekResult(ids.uid, lang, res.weekId);
  }, [weekResult, ids, lang]);

  return {
    live: gate !== null,
    uid: ids?.uid ?? null,
    stableId: ids?.stableId ?? null,
    roomLoad, rows, myPlace, tier, friends, weekResult, dismissWeekResult,
    session, starting, startBlock, startStep, onStepFinish, onStepAbort, outcome, dismissOutcome,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
