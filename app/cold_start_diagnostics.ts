// cold_start_diagnostics.ts — метка холодного старта в журнале обращений: в каком состоянии приложение было, когда его видели в последний раз.
//
// зачем (координатор 28.10, жалоба #3: 4 раза за ~50 минут приложение оказывалось на корне «/» — перезапуск процесса или сброс навигации; по журналу
// их не отличить): при каждом холодном старте пишем событие feature_action
//   app:cold_start:prev_<fg|bg|none>:gap_<lt1m|1to10m|10to60m|gt1h|unknown>
// prev_fg — прошлый запуск последний раз видели АКТИВНЫМ (вылет или убийство процесса во время работы), prev_bg — в фоне (система выгрузила или человек
// смахнул), prev_none — первого запуска / данных нет. gap — сколько прошло с последней отметки. Платформа причину завершения не отдаёт (без нативного модуля),
// поэтому это честная эвристика, а не диагноз; вместе с lessons:leave:* и lesson:exit:* она показывает, что было до обращения.
// Данные: на устройстве одна отметка {состояние, время} под ключом app_last_seen_v1 (в облако не уходит); в журнал обращений — только метка и корзина,
// без идентификаторов; пишется лишь при включённой диагностике поддержки. Запись событий ждёт активного аккаунта (иначе журнал её отбросит).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';

import { captureAccountGeneration, subscribeAccountGeneration } from './account_generation';
import { recordSupportDiagnostic } from './support_diagnostics';

const LOG = '[COLD-START]';
export const COLD_START_LAST_SEEN_KEY = 'app_last_seen_v1';
const WAIT_ACTIVE_MS = 60_000;

export type ColdStartPrev = 'fg' | 'bg' | 'none';
export type ColdStartGap = 'lt1m' | '1to10m' | '10to60m' | 'gt1h' | 'unknown';

export function coldStartGapBucket(gapMs: number | null): ColdStartGap {
  if (gapMs === null || !Number.isFinite(gapMs) || gapMs < 0) return 'unknown';
  if (gapMs < 60_000) return 'lt1m';
  if (gapMs < 10 * 60_000) return '1to10m';
  if (gapMs < 60 * 60_000) return '10to60m';
  return 'gt1h';
}

export function coldStartAction(prev: ColdStartPrev, gap: ColdStartGap): string {
  return `app:cold_start:prev_${prev}:gap_${gap}`;
}

/** Разбор сохранённой отметки; повреждённое значение — «данных нет» с причиной в журнале. */
export function parseLastSeen(raw: string | null): { prev: ColdStartPrev; atMs: number | null } {
  if (!raw) return { prev: 'none', atMs: null };
  try {
    const parsed = JSON.parse(raw) as { s?: unknown; t?: unknown };
    const prev: ColdStartPrev = parsed.s === 'fg' ? 'fg' : parsed.s === 'bg' ? 'bg' : 'none';
    const atMs = typeof parsed.t === 'number' && Number.isFinite(parsed.t) ? parsed.t : null;
    return { prev, atMs };
  } catch (error: unknown) {
    console.warn(`${LOG} отметка повреждена, считаем «данных нет»`, error instanceof Error ? error.message : String(error)); // guard-ok: ранний выход называет причину
    return { prev: 'none', atMs: null };
  }
}

async function saveState(state: 'fg' | 'bg', nowMs: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(COLD_START_LAST_SEEN_KEY, JSON.stringify({ s: state, t: nowMs }));
  } catch (error: unknown) {
    console.warn(`${LOG} отметку состояния записать не удалось`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи не ломает приложение
  }
}

/** Выполнить, когда аккаунт станет активным (журнал обращений до этого событие отбросит); не дождались за минуту — причина в журнале. */
function whenAccountActive(run: () => void): void {
  const isActive = () => {
    const token = captureAccountGeneration();
    return token.phase === 'active' && Boolean(token.stableId);
  };
  if (isActive()) { run(); return; }
  let done = false;
  const subscription = subscribeAccountGeneration(() => {
    if (done || !isActive()) return;
    done = true;
    clearTimeout(timer);
    subscription.remove();
    run();
  });
  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    subscription.remove();
    console.warn(`${LOG} аккаунт не стал активным за ${WAIT_ACTIVE_MS} мс — метка холодного старта не записана`); // guard-ok: ранний выход называет причину
  }, WAIT_ACTIVE_MS);
}

let installed = false;

/** Один раз за процесс: прочитать прошлую отметку, записать событие холодного старта, начать вести отметки состояния. Повторный вызов — пусто. */
export function installColdStartDiagnostics(): void {
  if (installed) return;
  installed = true;
  const startedAtMs = Date.now();
  if (typeof AppState?.addEventListener === 'function') {
    AppState.addEventListener('change', (state: AppStateStatus) => {
      void saveState(state === 'active' ? 'fg' : 'bg');
    });
  } else {
    console.warn(`${LOG} AppState.addEventListener недоступен — смену состояния не отслеживаем`); // guard-ok: ранний выход называет причину
  }
  void (async () => {
    let raw: string | null = null;
    try {
      raw = await AsyncStorage.getItem(COLD_START_LAST_SEEN_KEY);
    } catch (error: unknown) {
      console.warn(`${LOG} прошлую отметку прочитать не удалось`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой чтения — «данных нет»
    }
    const { prev, atMs } = parseLastSeen(raw);
    await saveState(AppState?.currentState === 'active' ? 'fg' : 'bg', startedAtMs);
    const gap = coldStartGapBucket(atMs === null ? null : startedAtMs - atMs);
    const action = coldStartAction(prev, gap);
    console.log(`${LOG} старт`, JSON.stringify({ prev, gap, action })); // guard-ok: одна строка на холодный старт
    whenAccountActive(() => {
      void recordSupportDiagnostic({
        event: 'feature_action',
        action,
        result: 'info',
        subject: 'app',
        atMs: Date.now(),
      }).catch((error: unknown) => {
        console.warn(`${LOG} запись в журнал обращений не удалась`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи не ломает приложение
      });
    });
  })();
}

export function resetColdStartDiagnosticsForTests(): void {
  installed = false;
}

export default function __RouteShim() { return null; }
