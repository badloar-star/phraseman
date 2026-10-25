/**
 * [SPIRE-ROOM] Комната недели Пика: кэш сразу, сеть фоном, при сбое — автоповтор и повтор при возврате в Пик.
 *
 * зачем (владелец 25.10, iPhone 2.0.2: «зашёл в Пик, а там комната недели ещё не загрузилась, пришлось перезаходить в
 * раздел!!! Такой ошибки не должно быть»; координатор 25.10): раньше комнату просили ОДИН раз при входе на экран — сбой,
 * «нет сети» или зависший запрос оставляли пустую комнату до перезахода. Теперь (закон «телефон решает, сервер хранит»):
 *   - кэш комнаты показан сразу (spireFirstFrameRoom в use_spire_game), сеть обновляет фоном;
 *   - запрос ограничен тайм-аутом (spireSyncRoom, SPIRE_ROOM_SYNC_TIMEOUT_MS); пустой ответ не стирает показанную комнату;
 *   - нет комнаты после ответа (сбой, offline, тайм-аут) — повтор через 2 / 5 / 15 / 30 с, дальше — только при возврате;
 *   - возврат в приложение или во вкладку Пика без комнаты — сразу повтор;
 *   - комната есть — повторов нет: обычный кэш на 6 ч (💸 без лишних чтений Firestore).
 * Журнал [SPIRE-ROOM]: вход, попытка №, ответ (статус, причина, люди, мс), тайм-аут, план повтора, повтор по фокусу.
 */
import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { AppState, InteractionManager } from 'react-native';
import { DebugLogger } from '../debug-logger';
import { animateNextLayoutTransition } from '../smooth_layout';
import { useTabNav } from '../TabContext';
import type { SpireLang } from '../../modules/spire/report_queue';
import type { SpireLiveGate } from './spire_live_gate';
import { spireEnsureWeekPack } from './spire_pack_client';
import { spireSyncRoom, type SpireRoomLoad } from './spire_room_client';
import { spireLoadMark } from './spire_load_trace';

// зачем (сторож spire_game_source_contract: префикс [SPIRE] во всех файлах app/spire): контекст [SPIRE], метка задачи в строке
const SPIRE = '[SPIRE]';
const TAG = '[SPIRE-ROOM]';
/** Паузы автоповтора, когда комнаты нет. Дальше — только при возврате в Пик или в приложение. */
export const SPIRE_ROOM_RETRY_MS: readonly number[] = [2_000, 5_000, 15_000, 30_000];
type Ids = Readonly<{ uid: string; stableId: string }>;

/** Новый ответ поверх показанного: пустой ответ не стирает уже показанную комнату (кэш или прошлый ответ). */
export function spireMergeRoomLoad(cur: SpireRoomLoad | null, next: SpireRoomLoad): SpireRoomLoad {
  if (!next.room && cur?.room) return { ...next, room: cur.room };
  return next;
}

export function useSpireRoomSync(input: Readonly<{
  gate: SpireLiveGate | null;
  ids: Ids | null;
  lang: SpireLang | null;
  setRoomLoad: Dispatch<SetStateAction<SpireRoomLoad | null>>;
}>): void {
  const { gate, ids, lang, setRoomLoad } = input;
  // зачем: вкладку берём из лёгкого TabContext (без навигации — экран и тесты не тянут @react-navigation)
  const { runtimeOwnerId } = useTabNav();
  const onPeak = runtimeOwnerId === 'spire';
  const prevOnPeakRef = useRef(onPeak);
  const hasRoomRef = useRef(false);
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef<(why: string) => void>(() => undefined);
  const aliveRef = useRef(true);

  const clearRetry = (): void => { if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; } };

  const run = useCallback((why: string) => {
    if (!gate || !ids || !lang) {
      DebugLogger.info(SPIRE, `${TAG} попытка «${why}» пропущена: ворота=${gate ? 'есть' : 'нет'} ids=${ids ? 'есть' : 'нет'} язык=${lang ?? '—'}`);
      return;
    }
    clearRetry();
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    const startedAt = Date.now();
    DebugLogger.info(SPIRE, `${TAG} попытка ${attempt} (${why}) lang=${lang} комната на экране=${hasRoomRef.current ? 'есть' : 'нет'}`);
    void spireSyncRoom(gate, { uid: ids.uid, stableId: ids.stableId, lang }).then((load) => { // тайм-аут — внутри spireSyncRoom (SPIRE_ROOM_SYNC_TIMEOUT_MS)
      const ms = Date.now() - startedAt;
      spireLoadMark('room:sync', { status: load.status, reason: load.reason, members: load.room?.members.length ?? null, ms, alive: aliveRef.current, attempt });
      if (!aliveRef.current) { DebugLogger.info(SPIRE, `${TAG} ответ попытки ${attempt} после ухода с экрана — не трогаем`); return; }
      DebugLogger.info(SPIRE, `${TAG} ответ попытки ${attempt}: status=${load.status} reason=${load.reason} group=${load.room?.groupId ?? '—'} людей=${load.room?.members.length ?? '—'} за ${ms}мс`);
      // зачем (аудит Optimistic UI Шпиля, 13.10): плашка «нет сети» вставляется над башней — без перехода башня прыгала бы
      if (load.status === 'offline') animateNextLayoutTransition();
      setRoomLoad((cur) => spireMergeRoomLoad(cur, load));
      if (load.room) {
        hasRoomRef.current = true;
        attemptRef.current = 0;
        // Прогрев пакета недели: «Подняться» стартует без ожидания сети. После анимаций входа — разбор файла (~1 МБ JSON).
        const room = load.room;
        InteractionManager.runAfterInteractions(() => {
          if (!aliveRef.current) return;
          void spireEnsureWeekPack(gate, { lang, tier: room.tier, weekId: room.weekId })
            .then((p) => DebugLogger.info(SPIRE, `game: прогрев пакета status=${p.status} source=${p.source}`));
        });
        return;
      }
      if (load.status === 'paused') { DebugLogger.info(SPIRE, `${TAG} Пик на паузе — повтор не планируем`); return; }
      const delay = SPIRE_ROOM_RETRY_MS[attempt - 1];
      if (delay === undefined) { DebugLogger.warn(SPIRE, `${TAG} комнаты нет после ${attempt} попыток — дальше повтор только при возврате в Пик/приложение`); return; }
      DebugLogger.warn(SPIRE, `${TAG} комнаты нет (${load.reason}) — повтор №${attempt + 1} через ${delay}мс`);
      retryTimerRef.current = setTimeout(() => runRef.current(`автоповтор ${attempt + 1}`), delay);
    }).catch((error: unknown) => {
      const code = String((error as { code?: unknown } | null)?.code ?? (error instanceof Error ? error.name : 'unknown')).slice(0, 60);
      spireLoadMark('room:sync_failed', { code, ms: Date.now() - startedAt, alive: aliveRef.current, attempt });
      DebugLogger.warn(SPIRE, `${TAG} [PIK-LOAD] sync_failed попытка ${attempt} code=${code} ms=${Date.now() - startedAt}`);
      if (!aliveRef.current || hasRoomRef.current) return;
      const delay = SPIRE_ROOM_RETRY_MS[attempt - 1];
      if (delay !== undefined) retryTimerRef.current = setTimeout(() => runRef.current(`автоповтор ${attempt + 1} после сбоя`), delay);
    });
  }, [gate, ids, lang, setRoomLoad]);
  runRef.current = run;

  // Вход на экран (и смена языка / аккаунта): первая попытка; кэш к этому моменту уже показан первым кадром.
  useEffect(() => {
    aliveRef.current = true;
    hasRoomRef.current = false;
    attemptRef.current = 0;
    run('вход в Пик');
    return () => { aliveRef.current = false; clearRetry(); };
  }, [run]);

  // Возврат во вкладку Пика без комнаты — сразу повтор (не ждём таймер).
  useEffect(() => {
    const cameBack = onPeak && !prevOnPeakRef.current;
    prevOnPeakRef.current = onPeak;
    if (!cameBack || hasRoomRef.current || attemptRef.current === 0) return;
    DebugLogger.info(SPIRE, `${TAG} возврат во вкладку Пика без комнаты — повтор сразу`);
    attemptRef.current = 0;
    runRef.current('возврат во вкладку');
  }, [onPeak]);

  // Возврат в приложение без комнаты — сразу повтор.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || hasRoomRef.current || !aliveRef.current) return;
      DebugLogger.info(SPIRE, `${TAG} приложение снова активно, комнаты нет — повтор сразу`);
      attemptRef.current = 0;
      runRef.current('возврат в приложение');
    });
    return () => sub.remove();
  }, []);
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
