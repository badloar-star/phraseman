/**
 * DEV-подмена «мои ошибки с данными»: `dev_state?mistakes=demo|off` (координатор 12.10, mistakes-panel-002; R1_ROBOT_LINKS_GAPS.md).
 *
 * зачем: хаб «Мои ошибки» читает локальный журнал (app/mistake_practice_insights.ts → loadMistakePracticeHubSnapshot), у свежего гостя он пуст — кадр «хаб с ошибками» не снять.
 * Подмена подсовывает в хаб ГОТОВЫЙ снимок (шесть ошибок: четыре ждут, две исправлены) — только в памяти: журнал ошибок, диск и облако НЕ трогаются, перезапуск стирает.
 * Только `__DEV__ && !IS_STORE_RELEASE`; включение — только на одноразовом госте (assertDisposableGuest, на настоящем аккаунте отказ). Лог: [DEV-STATE] mistakes.
 */
import { IS_STORE_RELEASE } from './config';
import type { MistakePracticeHubSnapshot, MistakePracticeListItem } from './mistake_practice_insights';

let demoOn = false;

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Включить/выключить демо-ошибки. Включение — только на одноразовом госте. В стор-сборке — отказ с логом. */
export async function setDevMistakesDemo(on: boolean): Promise<boolean> {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] mistakes: отклонено — не dev-сборка', { on }); // guard-ok: ранний выход логируется
    return false;
  }
  if (on) {
    const { assertDisposableGuest } = await import('./dev_state_account_guard');
    assertDisposableGuest('mistakes=demo');
  }
  demoOn = on;
  if (on) {
    // зачем (координатор 13.10, mistakes-panel-021): практика читает НАСТОЯЩИЙ журнал и требует ≥5 готовых ошибок (minFive), а демо-снимок хаба даёт две — засеваем журнал одноразового гостя той же записью, что пишет урок.
    // Засев — в отдельном модуле app/dev_mistakes_seed.ts: в стор-сборке этот файл заменяется заглушкой и засев в бандл не попадает.
    try {
      const { seedDevMistakesReadyForCurrentGuest } = await import('./dev_mistakes_seed');
      await seedDevMistakesReadyForCurrentGuest();
    } catch (error: unknown) {
      console.warn('[DEV-STATE] mistakes: засев журнала не удался —', error instanceof Error ? error.message : String(error)); // guard-ok: причина отказа засева, не немой catch
    }
  }
  console.log(`[DEV-STATE] mistakes: ${on ? 'демо-ошибки включены (6 штук, только память)' : 'демо-ошибки выключены'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** true — хаб рисует демо-снимок. В стор-сборке всегда false. */
export function isDevMistakesDemoOn(): boolean {
  return devAvailable() && demoOn;
}

const DAY_MS = 86_400_000;

/** Снимок для хаба: четыре ждут (две готовы к практике сейчас), две исправлены. Числа согласованы между собой. */
export function buildDevMistakesDemoSnapshot(nowMs: number = Date.now()): MistakePracticeHubSnapshot {
  const item = (
    mistakeId: string,
    phrase: string,
    meaning: string,
    facet: MistakePracticeListItem['facet'],
    status: MistakePracticeListItem['status'],
    captureCount: number,
    qualifyingDays: number,
    dueInDays: number,
    daysAgoCaptured: number,
    correctedDaysAgo: number | null,
  ): MistakePracticeListItem => Object.freeze({
    mistakeId,
    phrase,
    meaning,
    facet,
    lessonId: 'l01',
    status,
    captureCount,
    qualifyingDays,
    ready: status === 'active' && dueInDays <= 0,
    dueAtMs: nowMs + dueInDays * DAY_MS,
    correctedAtMs: correctedDaysAgo === null ? null : nowMs - correctedDaysAgo * DAY_MS,
    firstCapturedAtMs: nowMs - daysAgoCaptured * DAY_MS,
  });
  const items: readonly MistakePracticeListItem[] = Object.freeze([
    item('dev-mistake-1', 'Grandchildren', 'Внуки', 'form', 'active', 4, 1, -1, 6, null),
    item('dev-mistake-2', 'I have been', 'Я был', 'meaning', 'active', 3, 0, 0, 4, null),
    item('dev-mistake-3', 'Ready', 'Готов', 'word_order', 'active', 2, 2, 2, 3, null),
    item('dev-mistake-4', 'Although', 'Хотя', 'missing_token', 'active', 2, 0, 3, 2, null),
    item('dev-mistake-5', 'Make a decision', 'Принять решение', 'meaning', 'corrected', 3, 3, 0, 9, 1),
    item('dev-mistake-6', 'Through', 'Через', 'form', 'corrected', 2, 3, 0, 12, 3),
  ]);
  const active = items.filter((entry) => entry.status === 'active');
  const insights = Object.freeze({
    active: active.length,
    corrected: 2,
    correctedPhrases: 2,
    hidden: 0,
    overdue: 0,
    totalTracked: items.length,
    dueWords: 1,
    duePhrases: 1,
    mistakeCount7d: 9,
    mistakeCount30d: 16,
    mistakeCountPrevious7d: 5,
    uniqueMistakes30d: items.length,
    uniqueMistakes7d: 4,
    frequentFacets: Object.freeze([
      Object.freeze({ facet: 'form' as const, count: 2 }),
      Object.freeze({ facet: 'meaning' as const, count: 2 }),
    ]),
    frequentSources: Object.freeze([
      Object.freeze({ source: 'lessons' as const, count: 4 }),
      Object.freeze({ source: 'cards' as const, count: 2 }),
    ]),
    topMistakes: Object.freeze(active.map((entry) => Object.freeze({
      mistakeId: entry.mistakeId, phrase: entry.phrase, count: entry.captureCount, facet: entry.facet, lessonId: entry.lessonId,
    }))),
  });
  return Object.freeze({ insights, readyCount: items.filter((entry) => entry.ready).length, items });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() { return null; }
