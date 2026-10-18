// back_tap_probe.ts — журнал [BACK-BTN]: экран, обработчик, время тапа «назад» и время до смены экрана.
//
// зачем (координатор 17.10: Сверка по 98f738846 — «назад» на карте V2 в 2 из 3 заходов срабатывал не с первого тапа, с задержкой 3–6 с; правило «сперва логи»):
// чтобы по фактам видеть, КТО держит тап — не дошёл ли он до обработчика (тап съеден), решил ли обработчик не то (маршрут), или JS-поток занят тяжёлым рендером.
// Журнал без сети и Firestore: одна строка на тап, пробы кадра / InteractionManager / дрейфа таймера, итог «пришли» или «не пришли за 8 с».
// Используют экраны, где есть кнопка «назад»: noteBackTap при тапе → noteBackDecision (что решил) → noteBackArrived (когда экран сменился).
import { InteractionManager } from 'react-native';

import { DIAG_ENABLED } from './dev_diag_gate';

// зачем (Ревизор 3.44, cf8144a87; координатор 18.10, важно для стора): проба работала без гейта — в сторовой сборке на каждом «назад» шли тики 8 с и console.warn no-arrival.
// Теперь только dev и не стор-релиз: в релизе ни таймеров, ни рамок кадра, ни журнала, ни warn — все функции возвращаются сразу. Сторож: tests/back_steps_probe.test.cjs.
const ENABLED = DIAG_ENABLED; // __DEV__ && не стор-релиз (app/dev_diag_gate.ts — без импортов, чтобы не тянуть app/config в каждый тест)

const LOG = '[BACK-BTN]';
const WATCH_MS = 8000;
const TICK_MS = 250;
const BLOCKED_DRIFT_MS = 150;

// зачем (координатор 18.10 03:00, цель «кадры ≤ 32 мс»): после тапа 400 мс считаем кадры по requestAnimationFrame; кадр длиннее 32 мс — строка long-frame, в конце итог.
const FRAME_WINDOW_MS = 400;
const LONG_FRAME_MS = 32;
const MAX_FRAMES = 120; // 400 мс при 120 Гц — 48 кадров; запас ×2.5

type Pending = Readonly<{ screen: string; handler: string; at: number; seq: number }>;

let seq = 0;
let pending: Pending | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

function clearProbes(): void {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
}

let frameChainSeq = 0;

/** Цепочка кадров 400 мс после тапа: длинные кадры (>32 мс) поштучно и итог. Новый тап заменяет прежнюю цепочку; «прибыли» её не обрывает — кадры после прибытия тоже мерим. */
function watchFrames(tapSeq: number, tapAt: number): void {
  frameChainSeq = tapSeq;
  let prev = tapAt;
  let frames = 0;
  let long = 0;
  let maxMs = 0;
  const onFrame = (): void => {
    if (frameChainSeq !== tapSeq) {
      console.log(`${LOG} frames-cancelled ${JSON.stringify({ seq: tapSeq, frames, long, maxMs, reason: 'новый тап заменил цепочку' })}`);
      return;
    }
    const now = Date.now();
    const ms = now - prev;
    prev = now;
    frames += 1;
    if (ms > maxMs) maxMs = ms;
    if (ms > LONG_FRAME_MS) {
      long += 1;
      console.log(`${LOG} long-frame ${JSON.stringify({ seq: tapSeq, ms, atMs: now - tapAt })}`);
    }
    // зачем: потолок кадров — страховка от синхронного requestAnimationFrame (тестовые подмены), иначе цепочка рекурсивно не кончилась бы при замороженных часах
    if (now - tapAt < FRAME_WINDOW_MS && frames < MAX_FRAMES) {
      requestAnimationFrame(onFrame);
      return;
    }
    console.log(`${LOG} frames ${JSON.stringify({ seq: tapSeq, frames, long, maxMs, windowMs: now - tapAt })}`);
  };
  requestAnimationFrame(onFrame);
}

/** Тап по «назад»: запоминаем момент, запускаем пробы (кадр, InteractionManager, блокировка JS-потока). Новый тап заменяет прежний. */
export function noteBackTap(screen: string, handler: string, detail: Readonly<Record<string, unknown>> = {}): void {
  if (!ENABLED) return;
  clearProbes();
  const p: Pending = { screen, handler, at: Date.now(), seq: ++seq };
  pending = p;
  stepsForTap = 0;
  console.log(`${LOG} tap ${JSON.stringify({ seq: p.seq, screen, handler, ...detail })}`);
  requestAnimationFrame(() => {
    if (pending?.seq === p.seq) console.log(`${LOG} frame ${JSON.stringify({ seq: p.seq, screen, ms: Date.now() - p.at })}`);
  });
  watchFrames(p.seq, p.at);
  InteractionManager.runAfterInteractions(() => {
    if (pending?.seq === p.seq) console.log(`${LOG} interactions-free ${JSON.stringify({ seq: p.seq, screen, ms: Date.now() - p.at })}`);
  });
  let last = Date.now();
  const tick = (): void => {
    if (pending?.seq !== p.seq) return;
    const now = Date.now();
    const drift = now - last - TICK_MS;
    if (drift > BLOCKED_DRIFT_MS) console.log(`${LOG} js-blocked ${JSON.stringify({ seq: p.seq, screen, driftMs: drift, sinceTapMs: now - p.at })}`);
    last = now;
    if (now - p.at < WATCH_MS) {
      timers.push(setTimeout(tick, TICK_MS));
      return;
    }
    console.warn(`${LOG} no-arrival ${JSON.stringify({ seq: p.seq, screen, handler: p.handler, ms: now - p.at })}`);
    pending = null;
  };
  timers.push(setTimeout(tick, TICK_MS));
}

/** Что решил обработчик (ветка и значение, которое её выбрало). */
export function noteBackDecision(decision: string, detail: Readonly<Record<string, unknown>> = {}): void {
  if (!ENABLED) return;
  if (!pending) {
    console.log(`${LOG} decision без тапа ${JSON.stringify({ decision, ...detail })}`);
    return;
  }
  console.log(`${LOG} decision ${JSON.stringify({ seq: pending.seq, screen: pending.screen, decision, ms: Date.now() - pending.at, ...detail })}`);
}

/** Экран сменился (страница, вкладка скрыта, экран закрыт): итог тапа. Без тапа — ничего не пишет. */
export function noteBackArrived(screen: string, via: string): void {
  if (!ENABLED) return;
  const p = pending;
  if (!p) return;
  console.log(`${LOG} arrived ${JSON.stringify({ seq: p.seq, tapScreen: p.screen, handler: p.handler, arrivedAt: screen, via, ms: Date.now() - p.at })}`);
  pending = null;
  clearProbes();
}

export const BACK_STEPS_PER_TAP = 12;
let stepsForTap = 0;

/**
 * Шаг возврата: что и когда произошло после тапа (размонтирование экрана, рендеры и эффекты Главной). Пишет только пока есть тап «назад», не больше BACK_STEPS_PER_TAP на тап.
 * зачем (координатор 18.10, Сверка today_back_x4: decision 0–2 мс, а «прибыли» на Главной через 318–372 мс; правило «сперва логи»): временная линия показывает, где эти 300+ мс — до рендера Главной,
 * в рендере, в эффектах или в самом переходе стека.
 */
export function noteBackStep(step: string, detail: Readonly<Record<string, unknown>> = {}): void {
  if (!ENABLED || !pending) return;
  if (stepsForTap >= BACK_STEPS_PER_TAP) return;
  stepsForTap += 1;
  console.log(`${LOG} step ${JSON.stringify({ seq: pending.seq, step, ms: Date.now() - pending.at, ...detail })}`); // guard-ok: шаг возврата, не больше 12 на тап
}

export function resetBackTapProbeForTests(): void {
  pending = null;
  seq = 0;
  stepsForTap = 0;
  clearProbes();
}
