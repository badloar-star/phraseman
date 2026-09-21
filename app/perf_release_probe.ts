/**
 * Замер лагов, который работает В РЕЛИЗЕ (TestFlight), а не только в дев-сборке.
 *
 * зачем (владелец 2026-09-21): «всё приложение лагает, причём везде» — на
 * TestFlight, на новом iPhone. Существующий `perf-monitor.ts` молчит в релизе
 * (`if (!__DEV__) return`), поэтому фактов с устройства владельца не было НИ
 * ОДНОГО, и статический аудит разошёлся сам с собой: один вывод назвал причиной
 * «13 перерисовок из-за await-границ», но проект на React 19, где автоматическое
 * пакетирование батчит обновления и после await — то есть вывод был построен на
 * логике React 17 и для этого проекта неверен.
 *
 * Правило владельца «СПЕРВА ЛОГИ, ПОТОМ ПОЧИНКА» запрещает чинить по догадке.
 * Этот модуль даёт факты: сколько РЕАЛЬНО было перерисовок экрана, сколько длилась
 * загрузка и какой её шаг съел время — прямо на устройстве владельца.
 *
 * Что он НЕ делает:
 *   • не пишет в Firestore (ноль стоимости, severity строго 'warning');
 *   • не логирует на каждый кадр — только когда счётчик вышел за порог;
 *   • не хранит ничего о пользователе, только числа и имена шагов.
 *
 * Как владельцу снять отчёт: пройти по экранам как обычно, затем открыть журнал
 * отладки (он переживает перезапуск, `app/debug-logger.ts`) и найти строки с
 * префиксом [PERF-RELEASE].
 */
import { DebugLogger } from './debug-logger';

/** Сколько перерисовок за окно считаем нормой. Выше — экран «молотит». */
const RENDER_BURST_LIMIT = 12;
/** Окно, за которое считаем всплеск перерисовок. */
const RENDER_BURST_WINDOW_MS = 1_000;
/** Дольше этого загрузка ощущается как зависание. */
const SLOW_LOAD_MS = 400;
/** Не чаще одного отчёта на экран за этот срок — журнал не должен захлебнуться. */
const REPORT_COOLDOWN_MS = 30_000;

type RenderCounter = {
  windowStartedAt: number;
  countInWindow: number;
  lastReportAt: number;
  totalRenders: number;
};

const counters = new Map<string, RenderCounter>();

/**
 * Считает перерисовку экрана. Вызывать в ТЕЛЕ компонента (не в эффекте) —
 * тогда считаются именно рендеры, а не коммиты.
 *
 * Логирует ТОЛЬКО всплеск: больше RENDER_BURST_LIMIT рендеров за секунду.
 * Один такой всплеск во время скролла и есть «рвётся скролл».
 */
export function countScreenRender(screen: string): void {
  const now = Date.now();
  const prev = counters.get(screen);

  if (!prev) {
    counters.set(screen, {
      windowStartedAt: now,
      countInWindow: 1,
      lastReportAt: 0,
      totalRenders: 1,
    });
    return;
  }

  prev.totalRenders += 1;

  const windowAge = now - prev.windowStartedAt;
  if (windowAge > RENDER_BURST_WINDOW_MS) {
    // Окно закрылось — начинаем новое. Всплеск не повторился, это нормальная жизнь.
    prev.windowStartedAt = now;
    prev.countInWindow = 1;
    return;
  }

  prev.countInWindow += 1;

  if (prev.countInWindow <= RENDER_BURST_LIMIT) return;
  if (now - prev.lastReportAt < REPORT_COOLDOWN_MS) return;

  prev.lastReportAt = now;
  // Пишем через error(): только он переживает перезапуск приложения.
  // severity 'warning' — это замер, а не поломка, и в Firestore он не уходит.
  DebugLogger.error(
    `perf:${screen}`,
    new Error(
      `[PERF-RELEASE] всплеск перерисовок: ${prev.countInWindow} рендеров за ${windowAge}мс `
      + `(порог ${RENDER_BURST_LIMIT}); всего с открытия экрана: ${prev.totalRenders}`,
    ),
    'warning',
  );
}

/**
 * Замер длительной операции с отсечками по шагам — работает в релизе.
 * Логирует ТОЛЬКО если операция вышла за SLOW_LOAD_MS, чтобы не сорить.
 *
 *   const step = measureRelease('home:loadData');
 *   await a(); step('storage');
 *   await b(); step('league');
 *   step.end();
 */
export function measureRelease(
  label: string,
): ((name: string) => void) & { end: () => void } {
  const start = Date.now();
  let last = start;
  const parts: string[] = [];

  const step = (name: string): void => {
    const now = Date.now();
    parts.push(`${name}=${now - last}мс`);
    last = now;
  };

  return Object.assign(step, {
    end: (): void => {
      const total = Date.now() - start;
      if (total <= SLOW_LOAD_MS) return;
      DebugLogger.error(
        `perf:${label}`,
        new Error(`[PERF-RELEASE] ${label}: всего=${total}мс · ${parts.join(' · ')}`),
        'warning',
      );
    },
  });
}

/** Сброс счётчиков — при смене аккаунта, чтобы цифры не смешивались. */
export function resetReleasePerfCounters(): void {
  counters.clear();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
