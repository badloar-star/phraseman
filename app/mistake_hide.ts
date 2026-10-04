/**
 * Скрыть ошибку из списка («Я это знаю», «Удалить из ошибок» в меню карточки ошибки, макет «Панель»).
 *
 * зачем: события 'hidden' и 'restored' уже есть в журнале, проекции и серверной синхронизации, но записи не было ни у одного экрана.
 * Скрытая ошибка выходит из «ждут» и из отработки, но остаётся в журнале (можно вернуть событием 'restored'): ничего не стирается.
 * Журнал локальный, запись — одно событие; в облако оно уходит обычной синхронизацией журнала.
 */
import { canonicalJsonV1, sha256Utf8 } from '../modules/learning-v2/policies/decision_registry';
import type { MistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import { appendMistakeEvent, loadMistakeEventJournal, type MistakePracticeStorage } from './mistake_practice_store';

export type MistakeHideReason = 'known' | 'removed';

export type MistakeHideResult = Readonly<{ ok: true; appended: boolean } | { ok: false; reason: 'not_found' | 'already_hidden_or_corrected' | 'write_failed' }>;

const stableId = (prefix: string, body: unknown): string => `${prefix}:v1:${sha256Utf8(canonicalJsonV1(body))}`;

export async function hideMistake(input: Readonly<{
  accountScope: string;
  studyTarget: MistakeStudyTarget;
  mistakeId: string;
  reason: MistakeHideReason;
  nowMs?: number;
  /** Только для тестов. */
  storage?: MistakePracticeStorage;
}>): Promise<MistakeHideResult> {
  const startedAt = Date.now();
  try {
    const journal = await loadMistakeEventJournal({ accountScope: input.accountScope, studyTarget: input.studyTarget, storage: input.storage });
    const item = projectMistakes(journal.events).items.get(input.mistakeId);
    if (!item) {
      console.warn('[MISTAKE-HIDE] not_found', JSON.stringify({ mistakeId: input.mistakeId, reason: input.reason }));
      return { ok: false, reason: 'not_found' };
    }
    if (item.status !== 'active') {
      // guard-ok: ранний выход объясняет причину навсегда.
      console.warn('[MISTAKE-HIDE] skipped_status', JSON.stringify({ mistakeId: input.mistakeId, status: item.status }));
      return { ok: false, reason: 'already_hidden_or_corrected' };
    }
    const occurredAtMs = input.nowMs ?? Date.now();
    const write = await appendMistakeEvent({
      accountScope: input.accountScope,
      studyTarget: input.studyTarget,
      storage: input.storage,
      event: {
        eventId: stableId('mistake-event', { mistakeId: input.mistakeId, cycleId: item.cycleId, type: 'hidden', occurredAtMs }),
        mistakeId: input.mistakeId,
        cycleId: item.cycleId,
        type: 'hidden',
        occurredAtMs,
        studyTarget: input.studyTarget,
        payload: { reason: input.reason },
      },
    });
    console.log('[MISTAKE-HIDE] done', JSON.stringify({ mistakeId: input.mistakeId, reason: input.reason, appended: write.appended, ms: Date.now() - startedAt }));
    return { ok: true, appended: write.appended };
  } catch (error: unknown) {
    console.warn('[MISTAKE-HIDE] catch', error instanceof Error ? error.message : String(error));
    return { ok: false, reason: 'write_failed' };
  }
}
