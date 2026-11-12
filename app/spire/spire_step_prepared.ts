// spire_step_prepared.ts — что происходит, когда ступень Пика подготовлена (план заданий собран, экран ещё не открыт).
//
// зачем отдельный модуль (11.11.2026): подготовка ступени живёт в use_spire_game.ts, а у него сторож длины
// (tests/account_switch_sends_and_screens_f17.test.ts). Подкачка записей добавила туда три строки сверх лимита —
// лимит не поднимаем, побочные действия «ступень готова» собраны здесь, в файле подготовки — одна строка вызова.
import type { SpirePackTask } from '../../modules/spire/pack_plan';
import { warmCourseVoice } from '../../hooks/course_voice_warm';
import { spireRememberStepBudget } from './spire_step_budget';

// зачем: оценка бюджета до пакета нужна той же подготовке ступени — одна строка импорта в use_spire_game.ts (сторож длины)
export { spireEstimateStepBudgetMs } from './spire_step_budget';

export type SpireStepPreparedDetail = Readonly<{ tier: number | null; tasks: readonly SpirePackTask[]; lang: string }>;

/** Ступень подготовлена: запомнить её настоящий бюджет времени ([SPIRE-TIME]) и подкачать записи заданий «на слух». */
export function spireOnStepPrepared(floor: number, budgetMs: number, detail: SpireStepPreparedDetail): void {
  spireRememberStepBudget(floor, budgetMs, { tier: detail.tier, tasks: detail.tasks });
  // зачем (владелец 11.11.2026: задания Пика «на слух» звучат записью): записи фраз этой ступени качаются на диск до
  // первого задания; сбой подкачки ступень не останавливает (warmCourseVoice сам ловит ошибку и пишет причину в журнал)
  const listen = detail.tasks.filter((task) => task.kind === 'listen' || task.kind === 'dictate');
  if (listen.length === 0) return;
  const planned = warmCourseVoice('spire_step', listen.map((task) => task.payload.phrase), detail.lang);
  // видно, дошла ли ступень до записей: заданий «на слух» N, поставлено на подкачку M (0 — записей нет или нет сети)
  console.log('[SPIRE]', 'step audio warm', JSON.stringify({ floor, lang: detail.lang, listenTasks: listen.length, planned })); // guard-ok: строка на старт ступени с заданиями на слух
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
