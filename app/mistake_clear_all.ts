/**
 * «Очистить все ошибки» — данные: все активные ошибки курса уходят в скрытые ОДНОЙ записью журнала; откат — событиями 'restored'.
 *
 * зачем (владелец 22.10 через координатора: «дать возможность удалить все накопившиеся ошибки, так чтобы они не возвращались»):
 * механизм скрытия уже есть (hideMistake пишет событие 'hidden'; журнал синхронизируется, проекция убирает скрытые из «ждут» и
 * из отработки). Здесь тот же тип события, но пачкой: mergeMistakeEvents принимает массив и пишет журнал один раз под замком,
 * в облако пачка уходит обычной синхронизацией. Новый тип события и серверные правки не нужны.
 *
 * Почему не вернутся: слияние журналов (телефон, облако, второй телефон, переустановка) — это объединение событий, события
 * только добавляются, а проекция берёт последний по времени статус. 'hidden' каждой ошибки ставится на момент не раньше её
 * последнего события (+1 мс) — часы второго телефона, убежавшие вперёд, не воскресят её. Новая ошибка после очистки — событие
 * 'captured' позже по времени, и проекция возвращает её в активные как обычно.
 */
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import type { MistakeEvent, MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { loadMistakeEventJournal, mergeMistakeEvents, type MistakePracticeStorage } from './mistake_practice_store';

const LOG = '[MISTAKE-CLEAR-ALL]';

export type ClearedMistake = Readonly<{ mistakeId: string; cycleId: string; hiddenAtMs: number }>;

export type HideAllMistakesResult = Readonly<
  | { ok: true; mistakes: readonly ClearedMistake[]; appendedCount: number }
  | { ok: false; reason: 'nothing_to_clear' | 'write_failed' }
>;

export type RestoreMistakesResult = Readonly<{ ok: true; appendedCount: number } | { ok: false; reason: 'write_failed' }>;

const stableId = (prefix: string, body: unknown): string => `${prefix}:v1:${sha256Utf8(canonicalJsonV1(body))}`;

export async function hideAllMistakes(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  nowMs?: number;
  /** Только для тестов. */
  storage?: MistakePracticeStorage;
}>): Promise<HideAllMistakesResult> {
  const startedAt = Date.now();
  console.log(`${LOG} hideAll:enter`, JSON.stringify({ studyTarget: input.studyTarget }));
  try {
    const journal = await loadMistakeEventJournal({ accountScope: input.accountScope, studyTarget: input.studyTarget, storage: input.storage });
    const active = [...projectMistakes(journal.events).items.values()].filter((item) => item.status === 'active');
    console.log(`${LOG} hideAll:read`, JSON.stringify({ journalEvents: journal.events.length, active: active.length, ms: Date.now() - startedAt }));
    if (active.length === 0) {
      console.warn(`${LOG} hideAll:nothing_to_clear`, JSON.stringify({ studyTarget: input.studyTarget }));
      return { ok: false, reason: 'nothing_to_clear' };
    }
    const now = input.nowMs ?? Date.now();
    const mistakes: ClearedMistake[] = [];
    const events: MistakeEvent[] = [];
    for (const item of active) {
      // зачем: не раньше последнего известного события этой ошибки (часы второго телефона могли уйти вперёд) — 'hidden' остаётся последним.
      const occurredAtMs = Math.max(now, item.lastEventAtMs + 1);
      mistakes.push({ mistakeId: item.mistakeId, cycleId: item.cycleId, hiddenAtMs: occurredAtMs });
      events.push({
        eventId: stableId('mistake-event', { mistakeId: item.mistakeId, cycleId: item.cycleId, type: 'hidden', occurredAtMs }),
        mistakeId: item.mistakeId,
        cycleId: item.cycleId,
        type: 'hidden',
        occurredAtMs,
        studyTarget: input.studyTarget,
        payload: { reason: 'removed' },
      });
    }
    const write = await mergeMistakeEvents({ accountScope: input.accountScope, studyTarget: input.studyTarget, storage: input.storage, events });
    console.log(`${LOG} hideAll:written`, JSON.stringify({ requested: events.length, appended: write.appendedCount, journalEvents: write.journal.events.length, ms: Date.now() - startedAt }));
    return { ok: true, mistakes, appendedCount: write.appendedCount };
  } catch (error: unknown) {
    console.warn(`${LOG} hideAll:catch`, error instanceof Error ? error.message : String(error));
    return { ok: false, reason: 'write_failed' };
  }
}

/** Откат очистки («Вернуть» в тосте): событие 'restored' каждой скрытой ошибке, одной записью журнала. */
export async function restoreMistakes(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  mistakes: readonly ClearedMistake[];
  nowMs?: number;
  /** Только для тестов. */
  storage?: MistakePracticeStorage;
}>): Promise<RestoreMistakesResult> {
  const startedAt = Date.now();
  console.log(`${LOG} restore:enter`, JSON.stringify({ studyTarget: input.studyTarget, count: input.mistakes.length }));
  try {
    const now = input.nowMs ?? Date.now();
    const events: MistakeEvent[] = input.mistakes.map((cleared) => {
      // зачем: строго позже своего 'hidden' — иначе при равных часах проекция оставила бы ошибку скрытой.
      const occurredAtMs = Math.max(now, cleared.hiddenAtMs + 1);
      return {
        eventId: stableId('mistake-event', { mistakeId: cleared.mistakeId, cycleId: cleared.cycleId, type: 'restored', occurredAtMs }),
        mistakeId: cleared.mistakeId,
        cycleId: cleared.cycleId,
        type: 'restored',
        occurredAtMs,
        studyTarget: input.studyTarget,
        payload: { reason: 'clear_all_undo' },
      };
    });
    if (events.length === 0) {
      console.warn(`${LOG} restore:nothing_to_restore`);
      return { ok: true, appendedCount: 0 };
    }
    const write = await mergeMistakeEvents({ accountScope: input.accountScope, studyTarget: input.studyTarget, storage: input.storage, events });
    console.log(`${LOG} restore:written`, JSON.stringify({ requested: events.length, appended: write.appendedCount, ms: Date.now() - startedAt }));
    return { ok: true, appendedCount: write.appendedCount };
  } catch (error: unknown) {
    console.warn(`${LOG} restore:catch`, error instanceof Error ? error.message : String(error));
    return { ok: false, reason: 'write_failed' };
  }
}

/* expo-router: утилита, не экран */
export default function __MistakeClearAllRouteShim() {
  return null;
}
