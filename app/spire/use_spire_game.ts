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
import { tryPlayV2Event } from '../../modules/sound_v2/legacy_bridge';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { spireStepBudgetMs, type SpireConfigDoc } from '../../modules/spire/config_contract';
import { spirePickStepPlan, type SpireStepPick } from '../../modules/spire/pack_plan';
import {
  spireApplyStepReport,
  spireCreateWeekLocal, spireSummitBlocksStart,
  type SpireFlushTrigger, spireNearWeekEnd,
  type SpireLang,
  type SpireWeekLocal,
} from '../../modules/spire/report_queue';
import { spireBuildRoomRows, spireMyPlace, type SpireRoomRow } from '../../modules/spire/room_rows';
import { spireResolveRankBy } from './spire_rank_by_resolve';
import type { SpireFriendChip } from '../../components/spire/spire_room_types';
import { spireCurrentWeekKey, spireFloorOfSteps } from '../../components/spire/spire_tower_model';
import { DebugLogger } from '../debug-logger';
import { spireCloseMark, spireRunStepCloseTail, spireSameWeek, spireStepCoinsNow, spireStepCoinsUndo } from './spire_step_close';
import { spireFlushNow, spireRecordStepResult } from '../spire_report_client';
import { useSpireRejectRollback } from './spire_screen_rollback';
import { animateNextLayoutTransition } from '../smooth_layout';
import { getStableId } from '../stable_id';
import { getCanonicalUserId } from '../user_id_policy';
import { spireLoadFriendChips } from './spire_friends_client';
import { useSpireFriendsRefresh } from './use_spire_friends_refresh';
import { spireOpenLiveGate, type SpireLiveGate } from './spire_live_gate';
import { spireEstimateStepBudgetMs, spireRememberStepBudget } from './spire_step_budget';
import { spirePeekStepAttempt } from './spire_local_store';
import { spireEnsureWeekPack, type SpirePackLoad } from './spire_pack_client';
import type { SpireRoomLoad } from './spire_room_client';
import { useSpireRoomSync } from './use_spire_room_sync';
import { spireFirstFrameRoom } from './spire_load_trace';
import { publishSpirePositionFeed } from './spire_position_feed';
import { useSpireOwnerEpoch } from './spire_owner_epoch';
import type { SpireStepContext, SpireStepFinish } from './use_spire_step_runner';
import { spireDismissWeekResult, spireLoadWeekResult, type SpireWeekResultView } from './spire_week_result_client';
const LOG = '[SPIRE]';

export type SpireStepSession = Readonly<{ pick: SpireStepPick; ctx: SpireStepContext; attempt: number; runId: string }>;

/**
 * Ступень открыта, пакет недели ещё грузится (обзор R1, п.1): экран «Готовим ступень…» стоит с первого тапа.
 * budgetMs — оценка до пакета; точное время подставит настоящая ступень (раскладка та же).
 */
export type SpirePendingStep = Readonly<{ prepId: string; ctx: SpireStepContext; budgetMs: number }>;

// зачем (≤ 400 строк, 13.10): оценка бюджета до пакета — в spire_step_budget.ts; прежние имена реэкспортом для тестов.
export { spireEstimateStepBudgetMs, __resetSpireBudgetEstimateForTests } from './spire_step_budget';

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
    () => (unlocked && lang ? spireOpenLiveGate(config, 'home') : null), // зачем (замер 17.10 [SPIRE-LOAD]): тот же конфиг новым объектом (кэш → сеть) пересоздавал ворота — повторные identity и тройной room:sync
    [unlocked, lang, config ? JSON.stringify(config) : null], // eslint-disable-line react-hooks/exhaustive-deps -- зачем: ворота меняются только при смене содержимого конфига
  );
  const [ids, setIds] = useState<Readonly<{ uid: string; stableId: string }> | null>(null);
  const [roomLoad, setRoomLoad] = useState<SpireRoomLoad | null>(null);
  useSpireRoomSync({ gate, ids, lang, setRoomLoad }); // [SPIRE-ROOM] владелец 25.10: комната не остаётся пустой до перезахода
  const [friends, setFriends] = useState<readonly SpireFriendChip[]>([]);
  const [weekResult, setWeekResult] = useState<SpireWeekResultView | null>(null);
  const [session, setSession] = useState<SpireStepSession | null>(null);
  const [pending, setPending] = useState<SpirePendingStep | null>(null);
  const prepIdRef = useRef<string | null>(null);
  const [outcome, setOutcome] = useState<SpireStepOutcome | null>(null);
  const [starting, setStarting] = useState(false);
  const [startBlock, setStartBlock] = useState<SpireStartBlock>(null);
  const startingRef = useRef(false);
  const lastReportRef = useRef<string | null>(null);
  const weekRef = useRef(week);
  weekRef.current = week;
  // зачем (решение владельца 13.10, журнал п.86): сервер отверг пройденную ступень → откат маркера и одна спокойная строка (spire_screen_rollback.ts).
  const { rejectNotice, setRejectNotice, applyRollback } = useSpireRejectRollback({ weekRef, setWeek, setOutcome });

  // зачем (аудит §AUTH-0110, координатор 15.10): при смене изучаемого языка без перезапуска на экране оставались комната, друзья, итог недели и шаг СТАРОГО языка.
  // Сброс по lang (кроме первого монтирования) идёт ДО загрузчиков ниже, поздние ответы старого языка отсекает их флаг alive. Идентичность и идущий старт не трогаем.
  const ownerEpoch = useSpireOwnerEpoch(); // зачем (R39, Ревизор F02): выход/смена аккаунта сбрасывает всё, как язык, плюс личность — иначе B видел Пик A и досылал очередь с ids A
  const prevLangRef = useRef<string>(`${lang}|${ownerEpoch}`);
  useEffect(() => {
    const before = prevLangRef.current;
    if (before === `${lang}|${ownerEpoch}`) return;
    prevLangRef.current = `${lang}|${ownerEpoch}`;
    const ownerChanged = !before.endsWith(`|${ownerEpoch}`); if (ownerChanged) setIds(null);
    console.log('[SPIRE-TARGET] use_spire_game: язык/владелец', JSON.stringify({ from: before, to: `${lang}|${ownerEpoch}`, ownerChanged, kept: { ids: !ownerChanged && ids !== null, starting: startingRef.current }, // guard-ok: трассировка сброса при смене изучаемого языка
      reset: { roomLoad: roomLoad?.status ?? null, friends: friends.length, weekResult: weekResult !== null, session: session !== null, pending: pending !== null, outcome: outcome?.kind ?? null, startBlock } }));
    setRoomLoad(null); setFriends([]); setWeekResult(null); setSession(null); setPending(null);
    prepIdRef.current = null;
    setOutcome(null); setStartBlock(null); setRejectNotice(false);
    lastReportRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, ownerEpoch]);

  // ── Идентичность: только за воротами (без ворот не нужен даже uid) ──
  useEffect(() => {
    if (!gate) return undefined;
    let alive = true;
    void (async () => {
      const identityStartedAt = Date.now(); const uid = await getCanonicalUserId();
      const stableId = await getStableId();
      if (!alive) return;
      if (!uid || !stableId) {
        DebugLogger.info(LOG, `game: нет идентичности (uid=${uid ? 'есть' : 'нет'}) — сеть Шпиля не трогаем`);
        return;
      }
      setIds({ uid, stableId }); // зачем (жалоба владельца 17.10, [SPIRE-LOAD]): комната — память, иначе диск этой недели любого возраста; люди и «Играть» сразу, spireSyncRoom ниже освежает
      void spireFirstFrameRoom(uid, lang as SpireLang, Date.now() - identityStartedAt).then((first) => { if (alive && first) setRoomLoad((cur) => cur ?? first); });
    })();
    return () => { alive = false; };
  }, [gate, lang, ownerEpoch]);

  // ── Вход на экран: комната (кэш 6 ч), друзья, итог прошлой недели ──
  useEffect(() => {
    if (!gate || !ids || !lang) return undefined;
    let alive = true;
    // комната недели — use_spire_room_sync (кэш сразу, тайм-аут, автоповтор, повтор при возврате; [SPIRE-ROOM])
    // зачем (аудит «пропала сеть», Авторизация 13.10): ранние выходы загрузки друзей и итога недели были немыми — пишем причину.
    void spireLoadFriendChips(gate, { myUid: ids.uid, lang }).then((chips) => {
      if (!alive) { DebugLogger.info(LOG, 'game: друзья пришли после ухода с экрана — не показываю'); return; }
      if (!chips) { DebugLogger.info(LOG, 'game: друзей нет или не загрузились (null) — плашки друзей не будет'); return; }
      setFriends(chips);
    });
    void spireLoadWeekResult(gate, { uid: ids.uid, lang }).then((res) => {
      if (!alive) { DebugLogger.info(LOG, 'game: итог недели пришёл после ухода с экрана — не показываю'); return; }
      if (!res) DebugLogger.info(LOG, 'game: итога недели нет (null) — карточки не будет');
      // зачем (там же): карточка «Итог недели» встаёт НАД башней — сдвиг контента идёт плавно, а не скачком.
      if (res) animateNextLayoutTransition();
      setWeekResult(res);
    });
    return () => { alive = false; };
  }, [gate, ids, lang]);

  // ── Досылка очереди: вход, уход в фон, закрытие этажа, уход с экрана (💸 аудит 17.10 №13: без опроса раз в 5 мин — [SPIRE-COST]) ──
  const flush = useCallback((trigger: SpireFlushTrigger) => {
    if (!gate || !ids || !lang) return;
    void spireFlushNow({ uid: ids.uid, stableId: ids.stableId, lang, trigger }).then((out) => {
      if (out) applyRollback(out);
      if (out?.local && out.status === 'sent') {
        // Сервер не трогает локальный маркер; берём свежую очередь, только если неделя та же.
        const cur = weekRef.current;
        if (cur && out.local.weekKey === cur.weekKey && out.local.stepsCleared >= cur.stepsCleared) setWeek(out.local);
      }
    });
  }, [gate, ids, lang, setWeek, applyRollback]);

  useEffect(() => {
    if (!gate || !ids) return undefined;
    flush('app_start');
    const sub = AppState.addEventListener('change', (next) => { if (next !== 'active') flush('app_background'); });
    return () => {
      sub.remove();
      flush('screen_leave');
    };
  }, [gate, ids, flush]);

  // ── Строки комнаты: чужие из кэша, свои — локальные (мгновенно после ступени) ──
  const room = roomLoad?.room ?? null;
  const { rankBy, devRankBy } = spireResolveRankBy(config, room?.weekId ?? null); // зачем (D162/D190): рубильник места, dev-подмена Сверки, текст тура
  const rows: readonly SpireRoomRow[] | null = useMemo(() => {
    if (!room || !ids || !config) return null;
    const mine = week && week.weekKey === room.weekId ? week : null;
    return spireBuildRoomRows({
      room, myUid: ids.uid, mySteps: mine?.stepsCleared ?? 0, myReachedAtMs: mine?.reachedAtMs ?? 0,
      nowMs: Date.now(), tuning: config.residents, rankBy, fillMissingWeekCoinsForPreview: devRankBy === 'coins',
    });
  }, [room, ids, config, week, rankBy, devRankBy]);
  const myPlace = rows ? spireMyPlace(rows) : null;
  // зачем (13.10, «сперва логи»): что реально пришло в комнату — откуда, живые/боты, соперники по этажам (console: кадры Сверки снимают logcat).
  // + m05 (координатор 15.10): позиция для окон Пика — в spire_position_feed (память, 0 чтений), её читает useSpirePositionMoments.
  // зачем (координатор 25.10, тот же класс, что ложный рубеж Главной): на холодном старте своя неделя ещё не прочитана — свои ступени 0,
  // место «последнее», и окна «поднялся/обогнали» видели ложный скачок, когда неделя дочитывалась. Позицию отдаём только после чтения недели.
  const [weekCheckedLang, setWeekCheckedLang] = useState<string | null>(week ? lang : null);
  useEffect(() => {
    if (!lang || weekCheckedLang === lang) return undefined;
    if (week) { setWeekCheckedLang(lang); return undefined; }
    let alive = true;
    void import('../../components/spire/spire_home_week').then((m) => m.readCurrentLocalWeek(lang as Parameters<typeof m.readCurrentLocalWeek>[0]))
      // зачем (Ревизор 25.10 по 30dfcf973): прочитанную неделю отдаём в тот же рендер, что и «готово» — иначе гейт открывался при week=null (ступени 0)
      .then((local) => { if (!alive) return; if (!weekRef.current && local) setWeek(local); setWeekCheckedLang(lang); })
      .catch((error: unknown) => { console.warn('[SPIRE-POSITION] неделя не прочиталась — позицию всё равно отдаём', String(error)); if (alive) setWeekCheckedLang(lang); }); // guard-ok: сбой с причиной
    return () => { alive = false; };
  }, [lang, week, weekCheckedLang]);
  const positionReady = lang !== null && weekCheckedLang === lang;
  useEffect(() => {
    const floors: Record<number, number> = {};
    for (const r of rows ?? []) if (!r.isMe) floors[spireFloorOfSteps(r.steps)] = (floors[spireFloorOfSteps(r.steps)] ?? 0) + 1;
    const me = rows?.find((r) => r.isMe);
    console.log('[SPIRE-RIVALS]', JSON.stringify({ source: roomLoad ? `${roomLoad.status}/${roomLoad.reason}` : 'нет загрузки', roomId: room?.groupId ?? null, live: room?.members?.length ?? null, // guard-ok: одна строка на смену строк комнаты, только счётчики
      botFaces: room?.roster?.length ?? null, rows: rows?.length ?? null, rivalsByFloor: floors, myFloor: me ? spireFloorOfSteps(me.steps) : null, why: rows ? 'ok' : !room ? 'комнаты нет' : !ids ? 'нет личности' : 'нет конфига' }));
    if (rows && !positionReady) console.log('[SPIRE-POSITION] позиция ждёт чтения своей недели — окна мест не считаем'); // guard-ok: ранний выход с причиной
    publishSpirePositionFeed(rows && room && ids && lang && positionReady ? { uid: ids.uid, lang, weekId: room.weekId, roomFetchedAtMs: room.fetchedAtMs, rows, rankBy } : null);
  }, [rows, roomLoad, room, ids, lang, rankBy, positionReady]);
  const tier = room?.tier ?? week?.tier ?? null;

  // ── Старт ступени (защита от двойного тапа: один старт за раз) ──
  const startStep = useCallback(async () => {
    if (!gate || !lang || !config || spireSummitBlocksStart(weekRef.current, spireCurrentWeekKey(Date.now()))) return; // ЗАМОК ВЛАДЕЛЬЦА 22.10: «16 — всё, это потолок» — на вершине забег не стартует, энергия не тратится; причина — [SPIRE-SUMMIT]
    if (startingRef.current || session) {
      DebugLogger.info(LOG, 'game: старт уже идёт — второй тап игнорируем');
      return;
    }
    if (!ids) { setStartBlock('no_identity'); return; }
    if (tier === null || !room) { setStartBlock('no_tier'); return; }
    startingRef.current = true;
    setStarting(true);
    setStartBlock(null);
    setRejectNotice(false);
    setOutcome(null);
    const weekKey = spireCurrentWeekKey(Date.now());
    const cur = weekRef.current && weekRef.current.weekKey === weekKey ? weekRef.current : null;
    const floor = cur?.floor ?? 1;
    const stepInFloor = cur?.stepInFloor ?? 0; const stepNumber = (cur?.stepsCleared ?? 0) + 1; // [SPIRE-GOLD] номер ступени недели — как у сервера
    // зачем (обзор R1 п.1, координатор 12.10): первый тап в Шпиле. Раньше при непрогретом пакете кнопка тускнела
    // до ответа сети без отклика. Теперь экран ступени открывается сразу («Готовим ступень…»), пакет догружается
    // внутри. Энергия по-прежнему списывается только на первом задании (раннер).
    const prepId = `${weekKey}:${floor}:${stepInFloor + 1}:${Date.now()}`;
    prepIdRef.current = prepId;
    const startedAt = Date.now();
    setPending({ prepId, ctx: { lang, weekKey, tier, floor, stepInFloor, stepNumber }, budgetMs: spireEstimateStepBudgetMs(config.timer, floor, tier) });
    DebugLogger.info(LOG, `game: ступень открыта сразу (Готовим…) prep=${prepId} — пакет догружаем`);
    const stillMine = (where: string): boolean => {
      if (prepIdRef.current === prepId) return true;
      DebugLogger.info(LOG, `game: подготовка ${prepId} отменена или заменена (${where}, сейчас=${String(prepIdRef.current)}) — результат игнорируем`);
      return false;
    };
    const failStart = (block: Exclude<SpireStartBlock, null>, why: string) => {
      DebugLogger.warn(LOG, `game: старт невозможен (${why}) → экран ступени закрыт, на кнопке ${block} и «Повторить» за ${Date.now() - startedAt} мс`);
      setPending(null);
      setStartBlock(block);
    };
    try {
      const packLoad: SpirePackLoad = await spireEnsureWeekPack(gate, { lang, tier, weekId: weekKey });
      if (!stillMine('pack')) return;
      if (!packLoad.pack) {
        failStart(packLoad.status === 'offline' ? 'pack_offline' : 'pack_missing', `пакета нет: status=${packLoad.status} reason=${packLoad.reason}`);
        return;
      }
      const attempt = await spirePeekStepAttempt(ids.uid, lang, weekKey, floor, stepInFloor + 1);
      if (!stillMine('attempt')) return;
      const pick = spirePickStepPlan(packLoad.pack, {
        floor, step: stepInFloor + 1, attempt,
        budgetMs: (kinds) => spireStepBudgetMs(config.timer, floor, kinds, tier), // зачем (владелец 17.10): шкала «база × лига × этаж»
      });
      if (!pick) {
        failStart('pack_missing', `в пакете нет ступени этаж=${floor} ступень=${stepInFloor + 1}`);
        return;
      }
      spireRememberStepBudget(floor, pick.plan.budgetMs, { tier, tasks: pick.tasks }); // [SPIRE-TIME]
      const runId = `${weekKey}:${floor}:${stepInFloor + 1}:${attempt}:${Date.now()}`;
      DebugLogger.info(LOG, `game: открываем ступень этаж=${floor} ступень=${stepInFloor + 1} попытка=${attempt} пакет=${packLoad.source} за ${Date.now() - startedAt} мс (бюджет ${pick.plan.budgetMs} мс)`);
      setSession({ pick, ctx: { lang, weekKey, tier, floor, stepInFloor, stepNumber }, attempt, runId });
      setPending(null);
    } catch (error) {
      if (!stillMine('error')) return;
      failStart('pack_missing', `старт упал: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Отменённая подготовка уже сняла замок сама (cancelPendingStep) — новый старт не трогаем.
      if (prepIdRef.current === prepId) {
        prepIdRef.current = null;
        startingRef.current = false;
        setStarting(false);
      }
    }
  }, [gate, lang, config, session, ids, tier, room]);

  /** «Назад» на экране «Готовим ступень…» до пакета: закрыть без энергии и без штрафа; поздний пакет игнорируется. */
  const cancelPendingStep = useCallback(() => {
    const prep = prepIdRef.current;
    if (!prep) {
      DebugLogger.info(LOG, 'game: отмена подготовки — подготовки нет, пропуск');
      return;
    }
    DebugLogger.info(LOG, `game: подготовка ${prep} отменена человеком до пакета — энергия не тронута`);
    prepIdRef.current = null;
    startingRef.current = false;
    setStarting(false);
    setPending(null);
  }, []);

  // ── Итог ступени: сначала экран (optimistic), потом диск; не записалось — откат ──
  const onStepFinish = useCallback((finish: SpireStepFinish) => {
    const s = session; const closeT0 = Date.now(); // [PEAK-CLOSE] отсчёт шагов закрытия
    setSession(null);
    if (!s || !ids || !lang || !config) {
      // зачем (аудит Optimistic UI, 12.10): итог ступени терялся молча — раннему выходу нужна причина (сперва логи)
      DebugLogger.warn(LOG, `game: итог ступени ${finish.report.reportId} потерян — session=${s ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} lang=${lang ?? '—'} config=${config ? 'есть' : 'нет'}`);
      return;
    }
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
    setOutcome(view); spireCloseMark(finish.report.reportId, closeT0, `окно итога ${kind} и маркер поставлены`);
    const coinsNow = spireStepCoinsNow({ owner: ids.stableId, reportId: finish.report.reportId, t0: closeT0, coins: config.coins, passedNew: finish.report.outcome === 'passed' && applied.effect !== 'duplicate_ignored', floorBefore: base.floor, floorCleared: applied.effect === 'floor_cleared', golden: finish.report.goldenHit === true }); // [PEAK-COINS] вариант A
    // зачем (координатор 14.10): звуки Пика V2 — ступень / этаж / вершина в момент итога; провал без звука; флаг sound_v2 выключен — тишина
    // зачем (координатор 14.10): отклик игры — СРАЗУ, без задержки; мост отмечает «событие сыграно». Момент Пика при показе играет своё событие через playUnlessRecentlyPlayed и молчит,
    // если такое же только что прозвучало отсюда (двойного звука нет, а без момента звук как был).
    if (kind !== 'failed') { // save_failed здесь невозможен (kind сужен присваиванием выше) — он появляется позже, при откате записи
      tryPlayV2Event(kind === 'summit' ? 'summit' : kind === 'floor' ? 'floor' : 'step', 'spire_step_finish');
    }
    void spireRecordStepResult(ids.uid, lang, finish.report).then((res) => { // зачем ([PEAK-COINS]): монеты ступени на Главной сразу
      const late = lastReportRef.current !== finish.report.reportId; // зачем (Ревизор 25.10): монеты снимаем ВСЕГДА — поздний сбой иначе висел бы на плашке до 48 ч
      if (coinsNow && (!res.persisted || res.effect === 'duplicate_ignored')) spireStepCoinsUndo(ids.stableId, finish.report.reportId, res.persisted ? 'duplicate_on_disk' : 'save_failed', late);
      if (late) {
        DebugLogger.info(LOG, `game: запись ${finish.report.reportId} пришла поздно — экран уже новее, не трогаем`);
        return;
      }
      if (!res.persisted) {
        DebugLogger.warn(LOG, `game: ступень ${finish.report.reportId} не записалась на диск — откат маркера`);
        setWeek(base);
        setOutcome({ ...view, kind: 'save_failed', local: base });
        return;
      }
      spireCloseMark(finish.report.reportId, closeT0, `записано на диск effect=${res.effect}`);
      // зачем ([PEAK-CLOSE], Сверка 24.10): та же неделя повторным setWeek давала второй полный проход экрана Пика в кадре закрытия
      if (!spireSameWeek(weekRef.current, res.local)) setWeek(res.local); else spireCloseMark(finish.report.reportId, closeT0, 'неделя с диска та же — без второго прохода');
      const passedNew = finish.report.outcome === 'passed' && res.effect !== 'duplicate_ignored';
      spireRunStepCloseTail({ reportId: finish.report.reportId, t0: closeT0, uid: ids.uid, lang: lang as SpireLang, local: res.local, flush, flushTrigger: kind === 'floor' || kind === 'summit' ? 'floor_closed' : spireNearWeekEnd(Date.now()) ? 'week_end' : null, countToday: passedNew, skipWhy: `outcome=${finish.report.outcome} effect=${res.effect}` }); // 💸 облако — только на закрытии этажа и в конце недели, как раньше
    }).catch((error: unknown) => {
      DebugLogger.warn(LOG, `game: запись ступени упала (${String(error)}) — откат маркера`); if (coinsNow) spireStepCoinsUndo(ids.stableId, finish.report.reportId, 'save_threw', lastReportRef.current !== finish.report.reportId);
      if (lastReportRef.current !== finish.report.reportId) return;
      setWeek(base);
      setOutcome({ ...view, kind: 'save_failed', local: base });
    });
  }, [session, ids, lang, config, setWeek, flush]);

  const onStepAbort = useCallback((reason: 'no_energy' | 'cancelled') => {
    DebugLogger.info(LOG, `game: ступень не началась (${reason}) — энергия не тронута`);
    setSession(null);
  }, []);

  const dismissOutcome = useCallback(() => setOutcome((cur) => { DebugLogger.info(LOG, `[SPIRE-AFTER-ROUND] dismissOutcome: итог ${cur ? `${cur.kind} ${cur.report.reportId}` : 'уже пуст'} → null`); return null; }), []); // зачем (Сверка 25.10): трасса закрытия итога
  const dismissWeekResult = useCallback(() => {
    const res = weekResult;
    if (res) animateNextLayoutTransition(); // зачем: крестик убирает карточку из потока — башня поднимается плавно
    setWeekResult(null);
    if (res && ids && lang) void spireDismissWeekResult(ids.uid, lang, res.weekId);
  }, [weekResult, ids, lang]);

  // зачем (смета Firebase 13.10, п. 5): ручное обновление друзей (потянуть экран) вынесено в отдельный хук — файл остаётся ≤ 400 строк (контракт spire_game_source_contract).
  const refreshFriends = useSpireFriendsRefresh({ gate, ids, lang, friendsCount: friends.length, setFriends });

  return {
    live: gate !== null,
    uid: ids?.uid ?? null,
    stableId: ids?.stableId ?? null,
    roomLoad, rows, rankBy, myPlace, tier, friends, refreshFriends, weekResult, dismissWeekResult, rejectNotice,
    session, pending, cancelPendingStep, starting, startBlock, startStep, onStepFinish, onStepAbort, outcome, dismissOutcome,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
