/**
 * Сохранить карточку набора в «Сохранённые» (и убрать оттуда) — кнопка «Сохранить / Сохранено» раскрытой карточки.
 *
 * зачем (cards-section «Своя карточка» / «Карточка из чужого набора»): раньше сохранить слово из набора было нельзя — только из уроков,
 * видео и словаря. Здесь используется тот же общий механизм сохранения (`addFlashcard`: дубль по английскому слову, лимит Free/Plus,
 * запись под блокировкой аккаунта), поэтому карточка ведёт себя как любая сохранённая.
 */
import { addFlashcard, removeFlashcardByEnglish, type AddFlashcardResult } from '../../hooks/use-flashcards';
import { normalizePackLanguage } from './pack_languages';
import type { CardItem } from './types';
import type { RuntimeStudyTarget } from '../target_storage_keys';

export type TogglePackCardSavedResult = AddFlashcardResult | 'removed' | 'failed';

export async function togglePackCardSaved(
  card: CardItem,
  wasSaved: boolean,
  packId: string | null,
  studyTarget?: RuntimeStudyTarget,
): Promise<TogglePackCardSavedResult> {
  const packLanguage = normalizePackLanguage(card.packLanguage ?? studyTarget);
  console.log(`[PACK-CARD-SAVE] старт cardId=${card.id} packId=${packId ?? 'нет'} wasSaved=${wasSaved} язык=${packLanguage}`);
  try {
    if (wasSaved) {
      const removed = await removeFlashcardByEnglish(card.en, packLanguage);
      console.log(`[PACK-CARD-SAVE] убрано из «Сохранённых» removed=${removed}`);
      return removed ? 'removed' : 'failed';
    }
    const result = await addFlashcard({
      en: card.en,
      ru: card.ru,
      uk: card.uk,
      es: card.es,
      sourceLocales: card.sourceLocales,
      transcription: card.transcription,
      transcriptionEngineVersion: card.transcriptionEngineVersion,
      source: 'pack',
      sourceId: packId ? `${packId}:${card.id}` : card.id,
      literalRu: card.literalRu, literalUk: card.literalUk, literalEs: card.literalEs,
      explanationRu: card.explanationRu, explanationUk: card.explanationUk, explanationEs: card.explanationEs,
      exampleEn: card.exampleEn, exampleRu: card.exampleRu, exampleUk: card.exampleUk, exampleEs: card.exampleEs,
      usageNoteRu: card.usageNoteRu, usageNoteUk: card.usageNoteUk, usageNoteEs: card.usageNoteEs,
      register: card.register, level: card.level,
      packLanguage,
    }, packLanguage);
    console.log(`[PACK-CARD-SAVE] итог result=${result}`);
    return result;
  } catch (error) {
    console.warn('[PACK-CARD-SAVE] исключение', error instanceof Error ? error.message : String(error));
    return 'failed';
  }
}
