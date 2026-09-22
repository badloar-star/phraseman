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
  storageProbeState = null;
}

/* ─────────── Замер НАКОПЛЕНИЯ за сессию (владелец 2026-09-22) ───────────
 *
 * зачем: симптом изменился. Раньше было «лагает везде» (постоянно, с первой
 * секунды) — под него и строился замер выше: всплески перерисовок ВНУТРИ
 * экрана. Теперь владелец описывает другое: «после 5 минут и переходов по
 * разделам НАЧАЛО лагать», то есть НАРАСТАНИЕ. Счётчик рендеров такое не
 * видит по построению — он считает внутри одного экрана и обнуляет окно
 * каждую секунду.
 *
 * Рабочая гипотеза (проверяется этим замером, а НЕ принимается на веру):
 * каждое действие пишет 3–5 служебных ключей в хранилище (операция,
 * квитанция, подтверждение — защита от двойного списания), а в 20+ местах
 * код читает индекс ключей ЦЕЛИКОМ (`getAllKeys`) на путях обычной
 * навигации. Чем дольше сессия, тем длиннее индекс, тем дороже каждый скан,
 * и все они стоят в очереди за одним глобальным замком хранилища.
 *
 * Замер обязан РАЗЛИЧИТЬ две версии, иначе он бесполезен:
 *   • индекс растёт за сессию  → виноват рост (чинить чистку/кэш);
 *   • индекс стабилен, а сканы всё равно долгие → виноват РАЗМЕР базы,
 *     накопленный за месяцы (чинить иначе — кэш поверх скана).
 * Поэтому пишем И число ключей, И длительность скана, И дельту с прошлого
 * замера — один снимок не отвечает на вопрос, отвечает только ряд.
 */

/** Реже этого не замеряем: сам замер делает полный скан и не должен греть. */
const STORAGE_PROBE_MIN_INTERVAL_MS = 60_000;
/** Скан дольше этого — уже ощущается человеком как заминка. */
const SLOW_SCAN_MS = 120;

type StorageProbeState = {
  firstKeyCount: number;
  lastKeyCount: number;
  lastProbeAt: number;
  startedAt: number;
  probes: number;
};

let storageProbeState: StorageProbeState | null = null;

/**
 * Снимает размер индекса хранилища и время полного скана — в релизе.
 *
 * Вызывать на СМЕНЕ РАЗДЕЛА (не в рендере и не по таймеру): именно переходы
 * владелец называет моментом, когда начинает лагать, и именно на них висят
 * чужие сканы. Сам по себе замер дорогой ровно настолько же, насколько один
 * такой скан, поэтому чаще раза в минуту не выполняется.
 *
 * Пишет в журнал ТОЛЬКО когда есть что сказать: медленный скан, заметный
 * прирост ключей или каждый пятый замер (опорная точка для ряда). В норме
 * молчит, в Firestore не пишет, о пользователе ничего не хранит — только
 * числа.
 */
export async function probeStorageGrowth(reason: string): Promise<void> {
  const now = Date.now();
  if (storageProbeState && now - storageProbeState.lastProbeAt < STORAGE_PROBE_MIN_INTERVAL_MS) return;

  let keyCount: number;
  let scanMs: number;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const startedAt = Date.now();
    const keys = await AsyncStorage.getAllKeys();
    scanMs = Date.now() - startedAt;
    keyCount = keys.length;
  } catch (error: unknown) {
    // зачем: немой catch запрещён правилом владельца. Замер — не повод
    // ронять навигацию, но причина обязана быть названа, иначе замер может
    // молча умереть и мы будем ждать данных, которых не будет.
    DebugLogger.error(
      'perf:storage-probe',
      new Error(`[PERF-RELEASE] замер хранилища не выполнен (${reason}): `
        + (error instanceof Error ? error.message : String(error))),
      'warning',
    );
    return;
  }

  if (!storageProbeState) {
    storageProbeState = {
      firstKeyCount: keyCount,
      lastKeyCount: keyCount,
      lastProbeAt: now,
      startedAt: now,
      probes: 1,
    };
    // Первый замер пишем ВСЕГДА: это опорная точка. Без неё прирост не с чем
    // сравнить, а размер базы (накопленный за месяцы) не отличить от роста.
    DebugLogger.error(
      'perf:storage-probe',
      new Error(`[PERF-RELEASE] хранилище, старт сессии (${reason}): `
        + `ключей=${keyCount} · полный скан=${scanMs}мс`),
      'warning',
    );
    return;
  }

  const prev = storageProbeState;
  const grownSinceStart = keyCount - prev.firstKeyCount;
  const grownSinceLast = keyCount - prev.lastKeyCount;
  const sessionMinutes = Math.round((now - prev.startedAt) / 60_000);

  prev.lastKeyCount = keyCount;
  prev.lastProbeAt = now;
  prev.probes += 1;

  const scanIsSlow = scanMs >= SLOW_SCAN_MS;
  const grewNoticeably = grownSinceLast >= 25;
  const isLandmark = prev.probes % 5 === 0;
  if (!scanIsSlow && !grewNoticeably && !isLandmark) return;

  DebugLogger.error(
    'perf:storage-probe',
    new Error(`[PERF-RELEASE] хранилище через ${sessionMinutes}мин (${reason}): `
      + `ключей=${keyCount} (+${grownSinceStart} за сессию, +${grownSinceLast} с прошлого замера) · `
      + `полный скан=${scanMs}мс${scanIsSlow ? ' · МЕДЛЕННО' : ''}`),
    'warning',
  );
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
