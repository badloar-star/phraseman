// зачем (владелец, 2026-08-23): «те сессии, которые пасс — даже если автопасс —
// должны быть сразу доступны и играбельны». Реестр ручных квитанций был пуст,
// поэтому НИ ОДНА из 56 написанных сессий не собиралась: гейт бросал
// quality_review_missing на первой же, и приложение честно показывало
// «Сессия недоступна».
//
// Здесь автопасс: сессия, чистая по ВСЕМ детерминированным проверкам качества
// (интро, фразы, дистракторы, локали), получает квитанцию автоматически и
// становится играбельной. Это НЕ ослабление гейта — все content-проверки
// остаются в силе и по-прежнему закрывают грязный материал; отменяется только
// требование ручной подписи человека как условия ВЫДАЧИ.
//
// Ручные квитанции из LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1 имеют
// приоритет: явное решение владельца всегда сильнее автоматического.
import {
  LEARNING_V2_CONTENT_QUALITY_LOCALES,
  evaluateLearningV2SessionContentQuality,
  learningV2SessionContentFingerprint,
  type LearningV2ContentQualityReviewReceipt,
} from './learning_content_quality_gate_v1';
import { LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1 } from './learning_content_quality_review_receipts_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const AUTOPASS_INTRO_REVIEWER = 'autopass:intro-style-checks-v1';
const AUTOPASS_PHRASE_REVIEWER = 'autopass:phrase-selection-checks-v1';
const AUTOPASS_LOCALE_REVIEWER = 'autopass:locale-authorship-checks-v1';

/** Коды, которые описывают отсутствие подписи, а не качество текста. */
function isReviewOnlyIssueCode(code: string): boolean {
  return code.startsWith('quality_review') || code.startsWith('locale_review');
}

/**
 * Чиста ли сессия по содержанию — то есть прошла бы гейт, будь у неё подпись.
 * Именно это владелец называет «пасс».
 */
export function isLearningV2SessionContentClean(source: SessionSource): boolean {
  const report = evaluateLearningV2SessionContentQuality(source, undefined);
  return report.issues.every((issue) => isReviewOnlyIssueCode(issue.code));
}

function buildAutopassReceipt(
  source: SessionSource,
): LearningV2ContentQualityReviewReceipt {
  const decision = (reviewerId: string) =>
    ({ decision: 'approved', reviewerId }) as const;
  const localeAuthorship = Object.fromEntries(
    LEARNING_V2_CONTENT_QUALITY_LOCALES.map((locale) => [
      locale,
      decision(`${AUTOPASS_LOCALE_REVIEWER}:${locale}`),
    ]),
  ) as LearningV2ContentQualityReviewReceipt['localeAuthorship'];
  return Object.freeze({
    schemaVersion: 'learning-v2-content-quality-review.v1',
    sessionOrdinal: source.requiredSessionOrdinal,
    // Fingerprint считается от текущего текста: правка материала автоматически
    // аннулирует автопасс ровно так же, как аннулировала бы ручную подпись.
    subjectFingerprint: learningV2SessionContentFingerprint(source),
    introStyle: decision(AUTOPASS_INTRO_REVIEWER),
    phraseSelection: decision(AUTOPASS_PHRASE_REVIEWER),
    localeAuthorship,
  });
}

/**
 * Квитанция для сессии: ручная, если владелец её выписал; иначе автопасс, если
 * материал чист по содержанию; иначе undefined — и гейт закроет сессию.
 */
export function learningV2SessionQualityReceipt(
  source: SessionSource,
): LearningV2ContentQualityReviewReceipt | undefined {
  const manual =
    LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1[source.requiredSessionOrdinal];
  if (manual) return manual;
  if (!isLearningV2SessionContentClean(source)) return undefined;
  return buildAutopassReceipt(source);
}
