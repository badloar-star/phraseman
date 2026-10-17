import React from "react";
import { Text, View } from "react-native";
import { MODE_FEEDBACK_ART } from "../../../constants/learningV2ModeFeedbackPalette";
import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import type {
  LearningV2LearnerModeChoiceFeedbackV1,
  LearningV2LearnerModeNativePayloadV1,
  LearningV2ModeTextAnalysisV1,
} from "../contracts/mode_native_payload_v1";

export type LearningV2ModeLearnerFeedbackV1 = Readonly<{
  tone: "correct" | "wrong";
  text: string;
  authored: boolean;
  responseId: string | null;
  analysis: LearningV2ModeTextAnalysisV1 | null;
  diagnostics: Pick<LearningV2LearnerModeChoiceFeedbackV1,
    "errorType" | "whyTemptingByLocale" | "whyWrongHereByLocale" | "minimalContrastByLocale" | "acceptabilityBoundaryByLocale"
  > | null;
}>;

function diagnosticsFromRow(row: LearningV2LearnerModeChoiceFeedbackV1 | undefined) {
  if (!row) return null;
  return Object.freeze({
    errorType: row.errorType,
    whyTemptingByLocale: row.whyTemptingByLocale,
    whyWrongHereByLocale: row.whyWrongHereByLocale,
    minimalContrastByLocale: row.minimalContrastByLocale,
    acceptabilityBoundaryByLocale: row.acceptabilityBoundaryByLocale,
  });
}

const CORRECT_VERDICT_BY_LOCALE: Readonly<Record<LearningV2InterfaceLocale, string>> = Object.freeze({
  ru: "Верно.",
  uk: "Правильно.",
  en: "Correct.",
  es: "Correcto.",
  "pt-BR": "Correto.",
  vi: "Đúng.",
  id: "Benar.",
  tr: "Doğru.",
  pl: "Dobrze.",
});

const WRONG_VERDICT_BY_LOCALE: Readonly<Record<LearningV2InterfaceLocale, string>> = Object.freeze({
  // зачем (координатор 15.10): приложение на «ты» — было «Попробуйте…» / «Спробуйте…» / «Tekrar deneyin.»
  ru: "Попробуй ещё раз.",
  uk: "Спробуй ще раз.",
  en: "Try again.",
  es: "Inténtalo de nuevo.",
  "pt-BR": "Tente novamente.",
  vi: "Hãy thử lại.",
  id: "Coba lagi.",
  tr: "Tekrar dene.",
  pl: "Spróbuj ponownie.",
});

function payloadFeedbackRows(
  payload: LearningV2LearnerModeNativePayloadV1 | null,
): readonly LearningV2LearnerModeChoiceFeedbackV1[] {
  if (!payload) return [];
  if ("choiceFeedback" in payload) return payload.choiceFeedback;
  if ("slotFeedback" in payload) return payload.slotFeedback;
  return [];
}

export function resolveLearningV2ModeFeedbackV1({
  interfaceLocale,
  modePayload,
  outcome,
  selectedResponseId,
  orderedResponseIds,
}: Readonly<{
  interfaceLocale: LearningV2InterfaceLocale;
  modePayload: LearningV2LearnerModeNativePayloadV1 | null;
  outcome: "correct" | "wrong";
  selectedResponseId: string | null;
  orderedResponseIds: readonly string[];
}>): LearningV2ModeLearnerFeedbackV1 {
  if (outcome === "correct") {
    return Object.freeze({
      tone: "correct",
      text: CORRECT_VERDICT_BY_LOCALE[interfaceLocale],
      authored: false,
      responseId: null,
      analysis: null,
      diagnostics: null,
    });
  }
  if (modePayload?.family === "scripted_repeat_compare" && modePayload.explanationV1?.phrase) {
    const analysis = modePayload.explanationV1.phrase;
    const authoredText = analysis.explanationByLocale[interfaceLocale]?.trim();
    if (authoredText) return Object.freeze({
      tone: outcome,
      text: authoredText,
      authored: true,
      responseId: null,
      analysis,
      diagnostics: null,
    });
  }
  const orderedTokenMode = modePayload?.family === "phrase_builder" ||
    modePayload?.family === "listen_build_dictation";
  const rows = payloadFeedbackRows(modePayload);
  const candidates = selectedResponseId
    ? rows.filter((row) => row.responseId === selectedResponseId)
    : orderedTokenMode
      ? rows.filter((row) => new Set(orderedResponseIds).has(row.responseId))
      : [];
  const authored = candidates.length === 1 ? candidates[0] : undefined;
  const authoredText = authored?.feedbackByLocale[interfaceLocale]?.trim();
  if (authored && authoredText) {
    return Object.freeze({
      tone: outcome,
      text: authoredText,
      authored: true,
      responseId: authored.responseId,
      analysis: authored.analysisV1 ?? null,
      diagnostics: diagnosticsFromRow(authored),
    });
  }
  return Object.freeze({
    tone: "wrong",
    text: WRONG_VERDICT_BY_LOCALE[interfaceLocale],
    authored: false,
    responseId: null,
    analysis: null,
    diagnostics: null,
  });
}

export function LearningV2TextAnalysisV1({
  analysis,
  interfaceLocale,
  ink: inkColor,
}: Readonly<{
  analysis: LearningV2ModeTextAnalysisV1;
  interfaceLocale: LearningV2InterfaceLocale;
  /** Цвет текста из токена темы (g.text). Без него — прежний тёмный: в тёмных темах он сливается с фоном (1,2:1), поэтому вызывающий обязан передавать токен. */
  ink?: string;
}>) {
  // зачем ([BLEND-AUDIT] 18.10): текст был жёстко тёмным #17332A / #355148 поверх 12 %-тинта — в тёмных темах 1,2:1 (нечитаемо, 115 из 230 сочетаний тема/оформление/ползунок); цвет теперь приходит токеном темы
  const ink = inkColor ? { color: inkColor } : null;
  return (
    <View testID="learning-v2-text-analysis" style={styles.analysis}>
      <Text style={[styles.analysisPhrase, ink]}>{analysis.text}</Text>
      <Text style={[styles.analysisMeaning, ink]}>{analysis.meaningByLocale[interfaceLocale]}</Text>
      <Text style={[styles.analysisExplanation, ink]}>{analysis.explanationByLocale[interfaceLocale]}</Text>
      {analysis.units.map((unit, index) => (
        <View key={`${unit.start}-${unit.end}-${unit.text}-${index}`} style={styles.unit}>
          <Text style={[styles.unitTitle, ink]}>{`${unit.text} · ${unit.partOfSpeechLabelByLocale[interfaceLocale]} · ${unit.meaningByLocale[interfaceLocale]}`}</Text>
          <Text style={[styles.unitFunction, ink]}>{unit.functionByLocale[interfaceLocale]}</Text>
        </View>
      ))}
    </View>
  );
}

export function LearningV2ModeFeedbackLaneV1({
  feedback,
  interfaceLocale,
  ink: inkColor,
}: Readonly<{
  feedback: LearningV2ModeLearnerFeedbackV1 | null;
  interfaceLocale: LearningV2InterfaceLocale;
  /** Цвет текста панели из токена темы (g.text), см. LearningV2TextAnalysisV1. */
  ink?: string;
}>) {
  if (!feedback) return null;
  const ink = inkColor ? { color: inkColor } : null;
  return (
    <View
      testID="learning-v2-mode-feedback-lane"
      accessibilityLabel={feedback.text}
      accessibilityLiveRegion="polite"
      style={[styles.lane, feedback.tone === "correct" ? styles.correct : styles.wrong]}
    >
      <Text style={[styles.text, ink]}>{feedback.text}</Text>
      {feedback.analysis ? (
        <LearningV2TextAnalysisV1 analysis={feedback.analysis} interfaceLocale={interfaceLocale} ink={inkColor} />
      ) : null}
      {feedback.tone === "wrong" && feedback.diagnostics?.minimalContrastByLocale?.[interfaceLocale] ? (
        <Text style={[styles.contrast, ink]}>{feedback.diagnostics.minimalContrastByLocale[interfaceLocale]}</Text>
      ) : null}
    </View>
  );
}

const styles = {
  lane: {
    marginTop: 18,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  correct: {
    backgroundColor: MODE_FEEDBACK_ART.correctTint,
    borderColor: MODE_FEEDBACK_ART.correctEdge,
  },
  wrong: {
    backgroundColor: MODE_FEEDBACK_ART.wrongTint,
    borderColor: MODE_FEEDBACK_ART.wrongEdge,
  },
  text: {
    color: MODE_FEEDBACK_ART.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
  },
  analysis: { marginTop: 12, gap: 6 },
  analysisPhrase: { color: MODE_FEEDBACK_ART.ink, fontSize: 18, fontWeight: "700" },
  analysisMeaning: { color: MODE_FEEDBACK_ART.ink, fontSize: 16, fontWeight: "600" },
  analysisExplanation: { color: MODE_FEEDBACK_ART.inkSoft, fontSize: 15, lineHeight: 21 },
  unit: { marginTop: 4 },
  unitTitle: { color: MODE_FEEDBACK_ART.ink, fontSize: 15, fontWeight: "700" },
  unitFunction: { color: MODE_FEEDBACK_ART.inkSoft, fontSize: 14, lineHeight: 20 },
  contrast: { color: MODE_FEEDBACK_ART.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 10 },
} as const;
