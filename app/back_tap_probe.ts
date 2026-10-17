// back_tap_probe.ts — журнал [BACK-BTN]: экран, обработчик, время тапа «назад» и время до смены экрана.
//
// зачем (координатор 17.10: Сверка по 98f738846 — «назад» на карте V2 в 2 из 3 заходов срабатывал не с первого тапа, с задержкой 3–6 с; правило «сперва логи»):
// чтобы по фактам видеть, КТО держит тап — не дошёл ли он до обработчика (тап съеден), решил ли обработчик не то (маршрут), или JS-поток занят тяжёлым рендером.
// Журнал без сети и Firestore: одна строка на тап, пробы кадра / InteractionManager / дрейфа таймера, итог «пришли» или «не пришли за 8 с».
// Используют экраны, где есть кнопка «назад»: noteBackTap при тапе → noteBackDecision (что решил) → noteBackArrived (когда экран сменился).
import { InteractionManager } from 'react-native';

const LOG = '[BACK-BTN]';
const WATCH_MS = 8000;
const TICK_MS = 250;
const BLOCKED_DRIFT_MS = 150;

type Pending = Readonly<{ screen: string; handler: string; at: number; seq: number }>;

let seq = 0;
let pending: Pending | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

function clearProbes(): void {
  timers.forEach((timer) => clearTimeout(timer));
  timers = [];
}

/** Тап по «назад»: запоминаем момент, запускаем пробы (кадр, InteractionManager, блокировка JS-потока). Новый тап заменяет прежний. */
export function noteBackTap(screen: string, handler: string, detail: Readonly<Record<string, unknown>> = {}): void {
  clearProbes();
  const p: Pending = { screen, handler, at: Date.now(), seq: ++seq };
  pending = p;
  console.log(`${LOG} tap ${JSON.stringify({ seq: p.seq, screen, handler, ...detail })}`);
  requestAnimationFrame(() => {
    if (pending?.seq === p.seq) console.log(`${LOG} frame ${JSON.stringify({ seq: p.seq, screen, ms: Date.now() - p.at })}`);
  });
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
  if (!pending) {
    console.log(`${LOG} decision без тапа ${JSON.stringify({ decision, ...detail })}`);
    return;
  }
  console.log(`${LOG} decision ${JSON.stringify({ seq: pending.seq, screen: pending.screen, decision, ms: Date.now() - pending.at, ...detail })}`);
}

/** Экран сменился (страница, вкладка скрыта, экран закрыт): итог тапа. Без тапа — ничего не пишет. */
export function noteBackArrived(screen: string, via: string): void {
  const p = pending;
  if (!p) return;
  console.log(`${LOG} arrived ${JSON.stringify({ seq: p.seq, tapScreen: p.screen, handler: p.handler, arrivedAt: screen, via, ms: Date.now() - p.at })}`);
  pending = null;
  clearProbes();
}

export function resetBackTapProbeForTests(): void {
  pending = null;
  seq = 0;
  clearProbes();
}
