// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_task_swap_trace.ts — [V2-STACK]: журнал смены заданий в занятии Learning V2.
//
// зачем (жалоба 29.10: Android 2.0.3, урок 8 — «экран наслаивается», на снимке два задания поверх друг друга; координатор и Ревизор —
// сперва логи, чинить только по фактам): смена задания — это смена ключа Animated.View (`practice-<индекс>-<active|blocked>`) с выходом
// SlideOutLeft 110 мс и входом SlideInRight 110 мс (Reanimated). Если выход старого слоя не завершится, слой останется на экране под новым —
// ровно то, что на снимке. Ключ меняется и когда то же задание открывается (blocked → active), — тогда «двойник» был бы того же задания.
// Слой видим по ref Animated.View: Reanimated зовёт его с узлом, когда слой появился, и с null, когда ушёл, — это настоящие вход и выход.
// Конца ждём только у них: пока идёт вступление, загрузка или итог, слоя задания нет и ждать нечего (иначе — ложная тревога каждое занятие).
// Обычные строки — console.log (logcat): появление и уход слоя, конец входа/выхода (сколько шёл до конца на UI-потоке, сколько колбэк ждал JS).
// Сбои смены задания — выход не закончился за 1,5 с, выход или вход прерван, новая смена при висящем выходе: первый сбой каждого кода за запуск —
// в app_errors (как learning_v2:prepare_slow), чтобы факты пришли с телефона без просьб к ученику; остальные — в журнал диагностики на телефоне.
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect } from 'react';
import { PixelRatio, Platform } from 'react-native';
import { runOnJS, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { DebugLogger, reportDiagnosticError } from './debug-logger';

const LOG = '[V2-STACK]';
/** Длительность входа и выхода (каталог активностей 04, переход B5). */
export const V2_TASK_SWAP_MS = 110;
/** Выход дольше этого — слой, скорее всего, завис на экране. */
export const V2_STUCK_LAYER_MS = 1500;
/** Новая смена, когда прошлый выход идёт дольше этого, — два задания видны одновременно дольше задуманного. */
const OVERLAP_MS = V2_TASK_SWAP_MS * 4;

type LayerKind = 'exit' | 'enter';
/** Сведения рендера, в котором слой появился или ушёл. */
export type V2LayerInfo = Readonly<{ task: string | null; reducedMotion: boolean; lesson: number | null; session: number | null }>;
type Peer = Readonly<{ key: string; task: string | null }>;
type Pending = {
  kind: LayerKind; key: string; task: string | null; where: string; startedAtMs: number; timer: ReturnType<typeof setTimeout> | null;
  /** Выход — слой следующего задания, появившийся, пока выход ещё шёл (null — слой ушёл вместе с частью экрана: итог, загрузка).
   *  Вход — слой, ушедший в той же смене. */
  peer: Peer | null;
};
/** Поля записи о сбое — только простые значения: журнал диагностики превращает вложенное в «[object]» и держит до 12 полей. */
type Fields = Readonly<Record<string, string | number | boolean | null>>;

const pending = new Map<string, Pending>();
/** Слои заданий на экране по данным React (ref Animated.View). */
const onScreen = new Set<string>();
/** Коды, уже отправленные в app_errors в этом запуске: по одной записи на код — без лишних записей Firestore. */
const sentToServer = new Set<string>();
let lastLeft: Readonly<{ key: string; task: string | null; atMs: number }> | null = null;
const pendingId = (kind: LayerKind, key: string): string => `${kind}:${key}`;
const kindWord = (kind: LayerKind): string => (kind === 'exit' ? 'выход' : 'вход');
const reasonOf = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));
const whereOf = (info: V2LayerInfo): string => `L${info.lesson ?? '?'}/S${info.session ?? '?'}`;
const screenList = (): string => [...onScreen].join(',') || '—';
/** Соседний слой в записи о сбое: у выхода — следующее задание, у входа — предыдущее. */
const peerFields = (p: Pending): Fields => (p.kind === 'exit'
  ? { next: p.peer?.key ?? null, nextTask: p.peer?.task ?? null }
  : { prev: p.peer?.key ?? null, prevTask: p.peer?.task ?? null });

function environment(): Fields {
  return { fontScale: PixelRatio.getFontScale(), os: `${Platform.OS} ${String(Platform.Version)}` };
}

/** Сбой смены задания: первый сбой кода за запуск — в app_errors, остальные — в журнал диагностики на телефоне. Никогда не бросает. */
function report(code: string, operation: string, fields: Fields): void {
  const payload: Fields = { ...fields, ...environment() };
  try {
    if (!sentToServer.has(code)) {
      // зачем: журнал на телефоне с телефона ученика не уходит — без этой записи факты жалобы до нас не дойдут (тот же путь, что prepare_slow)
      sentToServer.add(code); // guard-ok: Set в памяти — коды за запуск, не запись данных
      DebugLogger.error(`learning_v2:${code}`, new Error(`${LOG} op=${operation} ${JSON.stringify(payload)}`), 'critical');
      return;
    }
    reportDiagnosticError({ code, screen: 'learning_v2_player', operation, severity: 'warning', context: payload });
  } catch (error) {
    // зачем: сбой журнала не должен оборвать учёт слоя (таймер входа, связь выхода со следующим заданием) и задеть занятие
    console.warn(`${LOG} журнал не принял ${code}: ${reasonOf(error)}`); // guard-ok: сбой журнала не должен задеть занятие
  }
}

/** Сбой касается двух заданий на экране: выход, пока появилось следующее задание, или вход слоя, который ещё на экране. */
function concernsTwoTasks(p: Pending): boolean {
  return p.kind === 'exit' ? p.peer !== null : onScreen.has(p.key);
}

/** 1,5 с без колбэка Reanimated. Тревога — только там, где два задания могли оказаться друг на друге. */
function onStuck(id: string): void {
  try {
    const p = pending.get(id);
    if (!p) {
      console.log(LOG, `таймер ${id}: записи уже нет — проверять нечего`); // guard-ok: ранний выход с причиной
      return;
    }
    p.timer = null;
    const label = `${kindWord(p.kind)} ${p.key} не закончился за ${V2_STUCK_LAYER_MS} мс`;
    if (!concernsTwoTasks(p)) {
      // зачем: слой ушёл вместе с частью экрана и следующее задание не появилось (итог, загрузка) или вход у слоя, которого уже нет, —
      // двух заданий друг на друге здесь нет; запись снимаем, чтобы и следующая смена не приняла её за висящий выход
      pending.delete(id);
      console.log(LOG, `${label}, но ${p.kind === 'exit' ? 'следующего задания не было' : 'слоя уже нет на экране'} — не наслоение, в журнал не пишем`); // guard-ok: ветка без тревоги
      return;
    }
    console.log(LOG, `⚠ ${label} — слой может висеть на экране · на экране ${screenList()}`); // guard-ok: сигнал наслоения
    report('v2_stack_layer_stuck', `${p.kind}_stuck`, {
      key: p.key, task: p.task, ...peerFields(p), afterMs: Date.now() - p.startedAtMs, inFlight: pending.size, onScreen: screenList(), where: p.where,
    });
  } catch (error) {
    console.warn(`${LOG} проверка висящего слоя не записалась: ${reasonOf(error)}`); // guard-ok: сбой журнала не должен задеть занятие
  }
}

function startPending(kind: LayerKind, key: string, info: V2LayerInfo, nowMs: number, peer: Peer | null): void {
  const id = pendingId(kind, key);
  const prev = pending.get(id);
  if (prev?.timer) clearTimeout(prev.timer);
  // зачем: досмотренный слой снимает таймер в noteV2LayerDone; если колбэк Reanimated не пришёл за 1,5 с — слой, возможно, висит
  const timer = setTimeout(() => onStuck(id), V2_STUCK_LAYER_MS);
  pending.set(id, { kind, key, task: info.task, where: whereOf(info), startedAtMs: nowMs, timer, peer }); // guard-ok: Map в памяти — слои в полёте
}

function noteLayerLeft(key: string, info: V2LayerInfo, nowMs: number): void {
  onScreen.delete(key);
  lastLeft = { key, task: info.task, atMs: nowMs };
  console.log(LOG, `слой ${key} ушёл · задание ${info.task ?? '—'} · на экране ${screenList()} · в полёте ${pending.size}`); // guard-ok: уход слоя
  if (info.reducedMotion) {
    console.log(LOG, 'выхода нет: системный Reduce Motion — слой убран сразу'); // guard-ok: ветка без анимаций
    return;
  }
  startPending('exit', key, info, nowMs, null);
}

function noteLayerAppeared(key: string, info: V2LayerInfo, nowMs: number): void {
  onScreen.add(key); // guard-ok: Set в памяти — слои на экране
  const sameExitId = pendingId('exit', key);
  const sameExit = pending.get(sameExitId);
  if (sameExit && nowMs - sameExit.startedAtMs <= V2_TASK_SWAP_MS) {
    // зачем (Ревизор 29.10): тот же ключ снят и поставлен в одном коммите — это не смена задания (ref вызван заново при смене функции
    // или вид задания сменился при том же ключе). Колбэка выхода может не быть вовсе — ждать его значит дать ложную тревогу владельцу
    if (sameExit.timer) clearTimeout(sameExit.timer);
    pending.delete(sameExitId);
    lastLeft = null;
    console.log(LOG, `слой ${key} переподключён в том же коммите — не смена задания, выход и новый вход не ждём · задание ${info.task ?? '—'}`); // guard-ok: ветка без тревоги
    return;
  }
  // зачем: React снимает старый слой и ставит новый в одном коммите — ушедший только что слой и есть «откуда» смены
  const from: Peer | null = lastLeft !== null && nowMs - lastLeft.atMs <= V2_TASK_SWAP_MS ? { key: lastLeft.key, task: lastLeft.task } : null;
  const exits = [...pending.values()].filter((p) => p.kind === 'exit');
  // зачем: выход, который ещё идёт, теперь делит экран с новым заданием — с этого момента его зависание и есть наслоение
  for (const p of exits) if (p.peer === null) p.peer = { key, task: info.task };
  console.log(LOG, from ? 'смена задания' : 'слой появился', JSON.stringify({
    fromKey: from?.key ?? null, toKey: key, fromTask: from?.task ?? null, toTask: info.task, reducedMotion: info.reducedMotion,
    where: whereOf(info), onScreen: screenList(), inFlight: pending.size, ...environment(),
  })); // guard-ok: одна строка на появление слоя
  const staleExit = exits.find((p) => nowMs - p.startedAtMs > OVERLAP_MS);
  if (staleExit) {
    report('v2_stack_overlap', 'task_swap', {
      toKey: key, toTask: info.task, fromKey: from?.key ?? null, fromTask: from?.task ?? null, staleExitKey: staleExit.key, staleExitTask: staleExit.task,
      staleExitMs: nowMs - staleExit.startedAtMs, inFlight: pending.size + 1, onScreen: screenList(), where: whereOf(info),
    });
  }
  if (info.reducedMotion) {
    console.log(LOG, 'входа нет: системный Reduce Motion — слой показан сразу'); // guard-ok: ветка без анимаций
    return;
  }
  startPending('enter', key, info, nowMs, from);
}

/** Ref слоя задания: Reanimated зовёт его с узлом, когда слой появился, и с null, когда ушёл. Никогда не бросает в занятие. */
export function noteV2LayerRef(key: string, info: V2LayerInfo, node: unknown): void {
  try {
    if (node === null || node === undefined) noteLayerLeft(key, info, Date.now());
    else noteLayerAppeared(key, info, Date.now());
  } catch (error) {
    console.warn(`${LOG} журнал слоя не записался: ${reasonOf(error)}`); // guard-ok: сбой журнала не должен задеть занятие
  }
}

/** Конец входа или выхода слоя (колбэк Reanimated через runOnJS). uiDoneAtMs — когда анимация кончилась на UI-потоке. */
export function noteV2LayerDone(kind: LayerKind, key: string, finished: boolean, uiDoneAtMs?: number): void {
  try {
    const id = pendingId(kind, key);
    const p = pending.get(id);
    const label = `${kindWord(kind)} ${key}: ${finished ? 'досмотрен' : 'прерван'}`;
    if (!p) {
      // зачем (Ревизор 29.10): записи нет — экран занятия закрыт (cleanup снял её) или выход уже признан «не наслоением»; поздний колбэк
      // с finished = false здесь — выход прерван размонтированием, а не сбой смены задания: только строка в logcat, без журнала диагностики
      console.log(LOG, `${label} — записи нет (экран занятия закрыт или слой не отслеживался), в журнал не пишем`); // guard-ok: поздний колбэк
      return;
    }
    if (p.timer) clearTimeout(p.timer);
    pending.delete(id);
    const nowMs = Date.now();
    const ms = nowMs - p.startedAtMs;
    const uiMs = typeof uiDoneAtMs === 'number' ? uiDoneAtMs - p.startedAtMs : null;
    const jsLagMs = typeof uiDoneAtMs === 'number' ? nowMs - uiDoneAtMs : null;
    console.log(LOG, `${label} за ${ms} мс (до конца на UI-потоке ${uiMs ?? '?'} мс, колбэк ждал JS ${jsLagMs ?? '?'} мс) · в полёте ${pending.size} · на экране ${screenList()}`); // guard-ok: конец слоя
    if (finished && ms <= V2_STUCK_LAYER_MS) return;
    if (!concernsTwoTasks(p)) {
      console.log(LOG, `${label} — следующего задания не было (ушёл вместе с частью экрана), в журнал не пишем`); // guard-ok: ветка без тревоги
      return;
    }
    report(finished ? 'v2_stack_layer_slow' : 'v2_stack_layer_interrupted', `${kind}_done`, {
      key, task: p.task, finished, ms, uiMs, jsLagMs, ...peerFields(p), onScreen: screenList(), where: p.where,
    });
  } catch (error) {
    console.warn(`${LOG} конец слоя не записался: ${reasonOf(error)}`); // guard-ok: сбой журнала не должен задеть занятие
  }
}

/** Вход задания — тот же SlideInRight 110 мс, плюс сообщение о конце (finished — досмотрен или прерван). */
export function v2StackEntering(key: string) {
  const base = SlideInRight.duration(V2_TASK_SWAP_MS);
  // зачем: строитель без withCallback (заглушки тестов, старый Reanimated) — переход тот же, только без строки журнала
  if (typeof base.withCallback !== 'function') return base;
  return base.withCallback((finished: boolean) => {
    'worklet';
    // зачем: время конца на UI-потоке — отличить «анимация шла долго» от «JS был занят и колбэк пришёл поздно»
    runOnJS(noteV2LayerDone)('enter', key, finished, Date.now());
  });
}

/** Выход задания — тот же SlideOutLeft 110 мс, плюс сообщение о конце. Не пришло за 1,5 с — слой висит. */
export function v2StackExiting(key: string) {
  const base = SlideOutLeft.duration(V2_TASK_SWAP_MS);
  if (typeof base.withCallback !== 'function') return base;
  return base.withCallback((finished: boolean) => {
    'worklet';
    runOnJS(noteV2LayerDone)('exit', key, finished, Date.now());
  });
}

/** Уход с экрана занятия: снять таймеры и записи — слои уходят вместе с экраном. Поздние колбэки после этого пишут только строку в logcat. */
export function clearV2TaskSwapTrace(reason: string): void {
  try {
    if (pending.size > 0 || onScreen.size > 0) {
      console.log(LOG, `${reason}: в полёте ${pending.size}, на экране ${onScreen.size} — таймеры сняты`); // guard-ok: уход с экрана
    }
    for (const p of pending.values()) if (p.timer) clearTimeout(p.timer);
    pending.clear();
    onScreen.clear();
    lastLeft = null;
  } catch (error) {
    console.warn(`${LOG} снять таймеры не вышло: ${reasonOf(error)}`); // guard-ok: сбой журнала не должен задеть занятие
  }
}

/** Ref для Animated.View задания (у трёх видов задания один ref) и cleanup при уходе с экрана занятия. */
export function useV2TaskSwapTrace(input: Readonly<{ key: string } & V2LayerInfo>): (node: unknown) => void {
  const { key, task, reducedMotion, lesson, session } = input;
  // зачем: занятие закрыто — слои уходят вместе с экраном; таймеры «висит» здесь были бы ложной тревогой
  useEffect(() => () => clearV2TaskSwapTrace('уход с экрана занятия'), []);
  // зачем: Reanimated 4.1 зовёт этот ref сам (с узлом при появлении слоя, с null при уходе), читая его из последних props, — новая функция
  // при смене задания или Reduce Motion лишних вызовов не даёт, а замыкание несёт сведения рендера, в котором слой появился или ушёл
  return useCallback((node: unknown): void => {
    noteV2LayerRef(key, { task, reducedMotion, lesson, session }, node);
  }, [key, task, reducedMotion, lesson, session]);
}

export function __resetV2TaskSwapTraceForTests(): void {
  for (const p of pending.values()) if (p.timer) clearTimeout(p.timer);
  pending.clear();
  onScreen.clear();
  sentToServer.clear();
  lastLeft = null;
}
