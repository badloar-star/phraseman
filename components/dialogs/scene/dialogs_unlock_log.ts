// ═══════════════════════════════════════════════════════════════════════════
// dialogs_unlock_log.ts — журнал [DIALOG-UNLOCK]: почему сцена «Диалогов» стоит без следующего диалога.
//
// зачем (обход экранов 12.11, координатор, «сперва логи»): сцена писала «Пока всё открытое пройдено» при «0 из 76». Строка показывает
// ранг, Plus, сдвиг рангов для новых, сколько диалогов открыто/пройдено/закрыто, ближайший ранг открытия и причину, по которой
// следующего диалога нет: всё открытое пройдено, ранг ещё не известен или на этом ранге ничего не открыто. Без uid.
// ═══════════════════════════════════════════════════════════════════════════

export type DialogsUnlockItem = Readonly<{ id: string; status: 'available' | 'done' | 'locked'; rankRequired: number }>;

export type DialogsUnlockReason = 'has_next' | 'all_open_done' | 'rank_unknown' | 'nothing_unlocked_at_rank';

export type DialogsUnlockSummary = Readonly<{
  open: number;
  done: number;
  locked: number;
  /** Самый низкий ранг открытия среди закрытых; null — закрытых нет. */
  nearestLockedRank: number | null;
  reason: DialogsUnlockReason;
}>;

/** Чистая сводка: почему у сцены нет следующего диалога (проверяется тестом). */
export function summarizeDialogsUnlock(items: readonly DialogsUnlockItem[], rank: number | null): DialogsUnlockSummary {
  const open = items.filter((item) => item.status === 'available').length;
  const done = items.filter((item) => item.status === 'done').length;
  const lockedItems = items.filter((item) => item.status === 'locked');
  const nearestLockedRank = lockedItems.length > 0 ? Math.min(...lockedItems.map((item) => item.rankRequired)) : null;
  const reason: DialogsUnlockReason = open > 0 ? 'has_next'
    : done > 0 ? 'all_open_done'
      : rank === null ? 'rank_unknown'
        : 'nothing_unlocked_at_rank';
  return { open, done, locked: lockedItems.length, nearestLockedRank, reason };
}

let lastKey = '';

/** Одна строка на смену входа: каталог перерисовывается часто, повтор с теми же данными не пишется. */
export function logDialogsUnlock(input: Readonly<{
  studyTarget: string;
  rank: number | null;
  plus: boolean;
  rankShiftForNew: boolean;
  knownDoneIds: number;
  items: readonly DialogsUnlockItem[];
}>): DialogsUnlockSummary {
  const summary = summarizeDialogsUnlock(input.items, input.rank);
  const line = JSON.stringify({
    studyTarget: input.studyTarget, rank: input.rank, plus: input.plus, rankShiftForNew: input.rankShiftForNew,
    knownDoneIds: input.knownDoneIds, total: input.items.length, ...summary,
    openIds: input.items.filter((item) => item.status === 'available').slice(0, 6).map((item) => item.id),
  });
  if (line !== lastKey) {
    lastKey = line;
    console.log(`[DIALOG-UNLOCK] hub ${line}`); // guard-ok: одна строка на смену входа, причина пустой сцены
  }
  return summary;
}
