import { DIALOGUE_V2_FREEFORM_OPENINGS } from '../shared/dialogue_v2_freeform_openings.generated';

/**
 * Открывающая фраза свободного разговора на изучаемом языке (контракт с «Дизайном»).
 *
 * зачем (владелец 01.10: «первая реплика всегда уже должна быть на экране»): экран
 * свободного разговора кладёт её первым сообщением собеседника в первом кадре, без
 * сети. Сервер (functions/src/dialogue_v2_freeform_text_provider.ts) берёт ТУ ЖЕ фразу
 * первым ходом собеседника в истории — модель не здоровается второй раз.
 */
export function dialogueV2FreeformOpening(studyTarget: unknown): string | null {
  if (typeof studyTarget === 'string' && Object.prototype.hasOwnProperty.call(DIALOGUE_V2_FREEFORM_OPENINGS, studyTarget)) {
    return DIALOGUE_V2_FREEFORM_OPENINGS[studyTarget as keyof typeof DIALOGUE_V2_FREEFORM_OPENINGS];
  }
  console.warn('[DIALOGUE-V2] freeform:opening → no opening for study target', JSON.stringify({ studyTarget: String(studyTarget).slice(0, 8) }));
  return null;
}
