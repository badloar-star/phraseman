// cards_prep_diagnostics.ts — событие журнала обращений «подготовка тренировки карточек» (свайп / «Верно-Неверно»).
//
// зачем (координатор 28.10, жалоба Android: «Сохранённые карточки · Личный список · 187» → «Не удалось подготовить
// тренировку»): строки [FLASHCARDS-SESSION] идут через console.log, а прод-сборка его вырезает — у человека с жалобой
// причина отказа не видна нигде. Пишем итог старта СОБЫТИЕМ журнала (recordSupportDiagnostic → «Поддержка» → админка):
//   cards:prep:<mode>:<sources>:n<size>:<outcome>
// Только закрытые значения: режим, виды источников, размер 0–999, итог-перечисление. Ни id, ни текста карточек.
// Формат держит белый список сервера (^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$, без «слова» из 20+ знаков).
import { recordSupportDiagnostic } from '../support_diagnostics';

export type CardsPrepMode = 'swipe' | 'truefalse';

/** Итог старта. `error_*` — человек увидел красную строку; `fail_open` — раунд пошёл локально без гранта. */
export type CardsPrepOutcome =
  | 'ok'
  | 'fail_open'
  | 'no_cards'
  | 'quota_refused'
  | 'energy_insufficient'
  | 'error_invalid_input'
  | 'error_storage'
  | 'error_capacity'
  | 'error_account'
  | 'error_manifest'
  | 'error_settlement'
  | 'error_other';

const count = (value: number): number => Math.max(0, Math.min(999, Math.round(Number.isFinite(value) ? value : 0)));
const tag = (value: string): string => value.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 10) || 'x';

/** Сообщение ошибки старта → закрытое перечисление (сам текст ошибки в журнал не уходит). */
export function cardsPrepErrorOutcome(message: string): CardsPrepOutcome {
  if (/invalid_input/.test(message)) return 'error_invalid_input';
  if (/storage_limit|storage_error|corrupt/.test(message)) return 'error_storage';
  if (/capacity_committed/.test(message)) return 'error_capacity';
  if (/account_unavailable|stale_account/.test(message)) return 'error_account';
  if (/manifest/.test(message)) return 'error_manifest';
  if (/^pending_grant_(?:claim|energy|quota|playable|ack)_/.test(message)) return 'error_settlement';
  return 'error_other';
}

/** Виды источников без id: «saved», «saved+community», не больше трёх. */
export function cardsPrepSourcesTag(kinds: readonly string[]): string {
  const unique = [...new Set(kinds.map(tag))].sort().slice(0, 3);
  return unique.length > 0 ? unique.join('_') : 'none';
}

export function cardsPrepAction(mode: CardsPrepMode, sources: string, size: number, outcome: CardsPrepOutcome): string {
  return `cards:prep:${mode}:${sources}:n${count(size)}:${outcome}`;
}

export function noteCardsPrep(input: Readonly<{
  mode: CardsPrepMode;
  sourceKinds: readonly string[];
  size: number;
  outcome: CardsPrepOutcome;
  durationMs: number;
}>, nowMs: number = Date.now()): void {
  const action = cardsPrepAction(input.mode, cardsPrepSourcesTag(input.sourceKinds), input.size, input.outcome);
  const blocked = input.outcome.startsWith('error_') || input.outcome === 'no_cards';
  console.warn('[CARDS-PREP] result', action, JSON.stringify({ ms: Math.max(0, Math.round(input.durationMs)) })); // guard-ok: итог старта; warn — переживает прод-сборку
  void recordSupportDiagnostic({
    event: 'feature_action',
    action,
    screen: '/flashcards_swipe',
    result: blocked ? 'blocked' : 'info',
    subject: 'app',
    durationMs: Math.max(0, Math.round(input.durationMs)),
    atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn('[CARDS-PREP] record_failed', error instanceof Error ? error.message : String(error));
  });
}
