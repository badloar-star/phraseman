import { recordMistake as recordRecallMistake } from './active_recall';
import { logMistake, type MistakeTokenMeta } from './mistake_log';
import { isWordCategory } from './pos_taxonomy';
import {
  createPlanRecoveryLegacyHandlers,
  type PlanRecoveryLegacyPayload,
} from './personal_plan_recovery_legacy_handlers';
import { recordPhraseMistake } from './trainer_store';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type PlanRecoveryDefaultHandlersOptions = {
  studyTarget?: RuntimeStudyTarget;
};

function lessonIdForPlanPayload(payload: PlanRecoveryLegacyPayload): number {
  return Number.isFinite(payload.dayIndex) && payload.dayIndex > 0
    ? Math.floor(payload.dayIndex)
    : 1;
}

/**
 * зачем: PlanRecoveryLegacyPayload НЕ содержит поля перевода вообще — ни translationRu,
 * ни аналога. Раньше в слот перевода подставляли `expectedAnswer || phrase`, но это
 * ожидаемый ответ на ЦЕЛЕВОМ языке (см. phraseForAction в legacy_handlers:38), а не
 * перевод. В приложении есть испаноязычный контент, поэтому в разделе ошибок вылезал
 * испанский текст там, где ждали русский («Составь фразу: Tengo una bolsa» при
 * английских плитках — репорты «Нет русского текста», «Что переводить?»).
 *
 * Честного перевода тут взять негде, поэтому слот остаётся ПУСТЫМ: потребители уже
 * умеют показать нейтральную подсказку на языке интерфейса при пустом переводе
 * (trainer_phrases_session.tsx promptText). Пустое поле лучше чужого языка.
 *
 * TODO: прокинуть настоящий перевод в PlanRecoveryLegacyPayload от источника плана —
 * тогда здесь появится реальный текст вместо заглушки.
 */
const PLAN_RECOVERY_TRANSLATION_UNKNOWN = '';

/**
 * payload.category is a grammar tag (e.g. "present_perfect", "word_order"), NOT a
 * part of speech. Feeding it as rawCategory makes normalizeWordCategory regex-coerce
 * it into a fabricated POS (perfect/present -> "verb") and discard the real word.
 * Only pass it through the rawCategory (POS) slot when it is genuinely a WordCategory
 * (e.g. "to-be", "modal"); otherwise leave rawCategory undefined so POS resolves from
 * the actual error word. The grammar dimension is always preserved via grammarTag.
 */
function posCategoryFromGrammarTag(category: string | undefined): string | undefined {
  return isWordCategory(category) ? category : undefined;
}

function mistakeMetaForPayload(payload: PlanRecoveryLegacyPayload): MistakeTokenMeta {
  return {
    tokenText: payload.expectedAnswer,
    expected: payload.expectedAnswer,
    picked: payload.selectedAnswerKnown ? payload.selectedAnswer : undefined,
    rawCategory: posCategoryFromGrammarTag(payload.category),
    grammarTag: payload.category,
    ...payload.planContext,
  };
}

export function createPlanRecoveryDefaultHandlers(
  options: PlanRecoveryDefaultHandlersOptions = {},
) {
  const { studyTarget } = options;

  return createPlanRecoveryLegacyHandlers({
    recall: async (payload) => {
      // зачем: uk больше НЕ дублирует ru — раньше ОДНО значение писалось в оба поля,
      // и интерфейс показывал один и тот же перевод дважды («2ды дан перевод одного
      // и того же предложения»). Пустой uk честно падает на ru по ||-цепочке в
      // trainerTranslationForLang, дубля больше нет.
      await recordRecallMistake(
        payload.phrase,
        PLAN_RECOVERY_TRANSLATION_UNKNOWN,
        lessonIdForPlanPayload(payload),
        undefined,
        'lesson',
        undefined,
        mistakeMetaForPayload(payload),
        studyTarget,
      );
    },
    trainer: async (payload) => {
      await recordPhraseMistake(
        payload.phrase,
        PLAN_RECOVERY_TRANSLATION_UNKNOWN,
        PLAN_RECOVERY_TRANSLATION_UNKNOWN,
        lessonIdForPlanPayload(payload),
        payload.expectedAnswer,
        // rawCategory must be a part of speech, not a grammar tag. Only forward the tag
        // when it is genuinely a WordCategory; otherwise POS is inferred from the word.
        posCategoryFromGrammarTag(payload.category),
        undefined,
        studyTarget,
        payload.planContext,
      );
    },
    mistakeAnalytics: (payload) => {
      logMistake(
        payload.phrase,
        lessonIdForPlanPayload(payload),
        'lesson',
        payload.reason === 'skipped_attempt' ? 'forgot' : 'wrong_pick',
        mistakeMetaForPayload(payload),
        studyTarget,
      );
    },
  });
}
