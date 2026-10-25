/**
 * ЗАМОК ВЛАДЕЛЬЦА 25.10: «удалить звук, который появляется при правильных ответах в любых режимах!!!»
 *
 * зачем: звук верного ответа глушится в ОДНОМ месте — на входе банка звуков V2 (modules/sound_v2/sound_bank.ts playEvent) и
 * директора (modules/audio/sound_director.ts request), чтобы ни один режим (уроки, Learning V2, «Проверь себя», экзамены,
 * Пик, карточки, «Мои ошибки», диалоги, тренажёры, старый курс, Арена) и ни один будущий вызов не прозвучал на верный ответ.
 * Вибрация и анимация верного ответа остаются. Звук ошибки не трогаем. Сторож — tests/owner_locks_correct_sound_2026_10_25.test.ts.
 */
/** События банка V2, которые звучат на верный ответ: сам «верно» и «молния» серии верных ответов (кольцо комбо). */
export const CORRECT_ANSWER_V2_EVENTS: ReadonlySet<string> = new Set(['correct', 'lightning']);

/** События директора, которые звучат на верный ответ (Арена: верно, первым, комбо, пара сошлась / поле очищено). */
export const CORRECT_ANSWER_DIRECTOR_EVENTS: ReadonlySet<string> = new Set([
  'pm.arena.answer_correct',
  'pm.arena.answer_first',
  'pm.arena.combo_start',
  'pm.arena.combo_up',
  'pm.arena.pair_match',
  'pm.arena.pair_clear',
]);

export const CORRECT_ANSWER_SILENCED_REASON = 'correct_answer_silenced';

const announced = new Set<string>();

/**
 * Звук верного ответа заглушён: одна строка журнала на источник (режим) за запуск приложения, дальше — молча.
 * Возвращает true, если событие — звук верного ответа (вызывающий НЕ играет его).
 */
export function isCorrectAnswerSoundSilenced(event: string, source: string): boolean {
  const silenced = CORRECT_ANSWER_V2_EVENTS.has(event) || CORRECT_ANSWER_DIRECTOR_EVENTS.has(event);
  if (!silenced) return false;
  const key = `${source}|${event}`;
  if (!announced.has(key)) {
    announced.add(key);
    console.log(`[CORRECT-SOUND] звук верного ответа выключен (замок владельца 25.10): источник=${source} событие=${event} — вибрация и анимация остаются`); // guard-ok: одна строка на источник
  }
  return true;
}

export function __resetCorrectAnswerSilenceForTests(): void {
  announced.clear();
}
