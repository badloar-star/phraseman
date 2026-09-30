// зачем (макет dialogs.html D1–D5): итог диалога показывает «верно / ошибок / точность» и
// список «было → стало». Честный источник — разбор КАЖДОГО хода (D112: «Лучше так» под
// репликой ученика), а не одна заметка итогового ревью. Реплики ученика не кладём в
// параметры навигации (они видны в логах маршрутов) — передаём через память процесса.
// Не durable намеренно: итог без этих цифр просто покажет данные ревью (закон «празднование
// не в очереди»). Держим только последние сессии, чтобы память не росла.

export type DialogueV2SessionOutcome = Readonly<{
  learnerTurns: number;
  corrections: readonly Readonly<{ original: string; corrected: string }>[];
}>;

const MAX_SESSIONS = 4;
const outcomes = new Map<string, DialogueV2SessionOutcome>();

export function rememberDialogueV2SessionOutcome(sessionId: string, outcome: DialogueV2SessionOutcome): void {
  outcomes.delete(sessionId);
  outcomes.set(sessionId, Object.freeze({
    learnerTurns: outcome.learnerTurns,
    corrections: Object.freeze(outcome.corrections.map((item) => Object.freeze({ ...item }))),
  }));
  while (outcomes.size > MAX_SESSIONS) {
    const oldest = outcomes.keys().next().value;
    if (oldest === undefined) break;
    outcomes.delete(oldest);
  }
}

export function readDialogueV2SessionOutcome(sessionId: string): DialogueV2SessionOutcome | null {
  return outcomes.get(sessionId) ?? null;
}
