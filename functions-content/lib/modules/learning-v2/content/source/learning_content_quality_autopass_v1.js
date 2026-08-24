"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLearningV2SessionContentClean = isLearningV2SessionContentClean;
exports.learningV2SessionQualityReceipt = learningV2SessionQualityReceipt;
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
const learning_content_quality_gate_v1_1 = require("./learning_content_quality_gate_v1");
const learning_content_quality_review_receipts_v1_1 = require("./learning_content_quality_review_receipts_v1");
// Честно про независимость (аудит 2026-08-23): гейт требует, чтобы интро и
// подбор фраз проверяли РАЗНЫЕ рецензенты. Автопасс формально удовлетворяет
// это разными идентификаторами, но настоящей независимости здесь нет — за
// обеими подписями стоит один и тот же набор автоматических проверок. Это
// осознанный компромисс владельца («пасс, даже если автопасс — сразу
// играбельно»), а не работающая проверка независимости.
const AUTOPASS_INTRO_REVIEWER = 'autopass:intro-style-checks-v1';
const AUTOPASS_PHRASE_REVIEWER = 'autopass:phrase-selection-checks-v1';
const AUTOPASS_LOCALE_REVIEWER = 'autopass:locale-authorship-checks-v1';
// зачем явный список, а не префикс (аудит 2026-08-23): startsWith('quality_
// review') молча пропустил бы любой БУДУЩИЙ код с этим префиксом — например
// проверку конфликта интересов рецензентов. Перечисление ломается на новом
// коде явно (TypeScript потребует решения), а не пропускает его тихо.
const REVIEW_ONLY_ISSUE_CODES = new Set([
    'quality_review_missing',
    'quality_review_stale',
    'quality_review_rejected',
    'quality_review_not_independent',
    'locale_review_missing',
]);
/** Коды, которые описывают отсутствие подписи, а не качество текста. */
function isReviewOnlyIssueCode(code) {
    return REVIEW_ONLY_ISSUE_CODES.has(code);
}
/**
 * Чиста ли сессия по содержанию — то есть прошла бы гейт, будь у неё подпись.
 * Именно это владелец называет «пасс».
 */
function isLearningV2SessionContentClean(source) {
    const report = (0, learning_content_quality_gate_v1_1.evaluateLearningV2SessionContentQuality)(source, undefined);
    return report.issues.every((issue) => isReviewOnlyIssueCode(issue.code));
}
function buildAutopassReceipt(source) {
    const decision = (reviewerId) => ({ decision: 'approved', reviewerId });
    const localeAuthorship = Object.fromEntries(learning_content_quality_gate_v1_1.LEARNING_V2_CONTENT_QUALITY_LOCALES.map((locale) => [
        locale,
        decision(`${AUTOPASS_LOCALE_REVIEWER}:${locale}`),
    ]));
    return Object.freeze({
        schemaVersion: 'learning-v2-content-quality-review.v1',
        sessionOrdinal: source.requiredSessionOrdinal,
        // Fingerprint считается от текущего текста: правка материала автоматически
        // аннулирует автопасс ровно так же, как аннулировала бы ручную подпись.
        subjectFingerprint: (0, learning_content_quality_gate_v1_1.learningV2SessionContentFingerprint)(source),
        introStyle: decision(AUTOPASS_INTRO_REVIEWER),
        phraseSelection: decision(AUTOPASS_PHRASE_REVIEWER),
        localeAuthorship,
    });
}
/**
 * Квитанция для сессии: ручная, если владелец её выписал; иначе автопасс, если
 * материал чист по содержанию; иначе undefined — и гейт закроет сессию.
 */
function learningV2SessionQualityReceipt(source) {
    const manual = learning_content_quality_review_receipts_v1_1.LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1[source.requiredSessionOrdinal];
    if (manual)
        return manual;
    if (!isLearningV2SessionContentClean(source))
        return undefined;
    return buildAutopassReceipt(source);
}
//# sourceMappingURL=learning_content_quality_autopass_v1.js.map