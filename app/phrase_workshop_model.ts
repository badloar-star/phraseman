// зачем (владелец 25.10, «Мастерская фраз»; координатор): одна чистая функция решает, что показать у строки урока.
// Её читают и кнопка в списке уроков, и гейт самого экрана — чтобы прямая ссылка не обходила замок.
// Правила владельца: урок пройден = все 56 занятий; у уроков, пройденных до релиза, режим закрыт, пока банк не накопился
// (порог ≥ 20 фраз — решение координатора); Plus — обязателен (без Plus замок и переход на экран Plus).

/** Занятий в уроке V2 (7 глав × 8). Держим рядом с правилом, чтобы «пройден» читалось одинаково везде. */
export const PHRASE_WORKSHOP_LESSON_SESSION_TOTAL = 56;
/** Сколько фраз должно накопиться в банке урока, чтобы режим открылся (один раунд). */
export const PHRASE_WORKSHOP_MIN_BANK_PHRASES = 20;

export type PhraseWorkshopEntryState =
  | 'hidden'       // входа нет: режим выключен флагом или урок не пройден
  | 'accumulating' // пройден, но банк ещё тонкий: кнопка приглушена, тап — тост «Откроется чуть позже»
  | 'locked_plus'  // пройден, банк готов, но нет Plus: замок, тап — экран Plus
  | 'open';        // пройден, банк готов, Plus есть

export type PhraseWorkshopEntryInput = Readonly<{
  enabled: boolean;
  /** Сколько занятий урока пройдено (кольцо урока). */
  completedSessions: number;
  /** Сколько фраз в локальном банке урока. */
  bankPhrases: number;
  /** Есть ли подтверждённый Plus. Не подтверждённый статус = false (fail-closed). */
  hasPlus: boolean;
}>;

/**
 * Порядок проверок важен: «копится» идёт раньше «замка Plus» — иначе Free-ученик купил бы Plus ради режима,
 * который всё равно закрыт (банк пуст). Покупка не должна вести в тупик.
 */
export function phraseWorkshopEntryState(input: PhraseWorkshopEntryInput): PhraseWorkshopEntryState {
  if (!input.enabled) return 'hidden';
  if (!Number.isFinite(input.completedSessions) || input.completedSessions < PHRASE_WORKSHOP_LESSON_SESSION_TOTAL) return 'hidden';
  if (!Number.isFinite(input.bankPhrases) || input.bankPhrases < PHRASE_WORKSHOP_MIN_BANK_PHRASES) return 'accumulating';
  return input.hasPlus ? 'open' : 'locked_plus';
}

/** Причина состояния для журнала [PHRASE-WORKSHOP]: само значение, которое решило ветку. */
export function phraseWorkshopEntryReason(input: PhraseWorkshopEntryInput): string {
  return `enabled=${String(input.enabled)} completed=${input.completedSessions}/${PHRASE_WORKSHOP_LESSON_SESSION_TOTAL} bank=${input.bankPhrases}/${PHRASE_WORKSHOP_MIN_BANK_PHRASES} plus=${String(input.hasPlus)}`;
}
