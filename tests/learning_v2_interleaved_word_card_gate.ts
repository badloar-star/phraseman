import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string): string => {
  try {
    return readFileSync(resolve(root, path), "utf8");
  } catch {
    return "";
  }
};
const findings: string[] = [];
const expectText = (path: string, needle: string, label: string): void => {
  if (!read(path).includes(needle)) findings.push(`${label}:${path}:${needle}`);
};
const rejectText = (path: string, needle: string, label: string): void => {
  if (read(path).includes(needle)) findings.push(`${label}:${path}:${needle}`);
};

expectText(
  "app/learning_v2_interleaved_new_word_flow_v1.ts",
  'kind: "practice_reached"',
  "missing_interaction_trigger",
);
expectText(
  "app/learning_v2_interleaved_new_word_flow_v1.ts",
  'kind: "continue"',
  "missing_resume_same_interaction",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  'from "../../app/flashcards/FlashcardListItem"',
  "overlay_does_not_use_exact_compact_cards_section_component",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "<FlashcardListItem",
  "overlay_has_no_exact_compact_flip_card",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  'from "../../app/flashcards/FlashcardListItemChrome"',
  "overlay_does_not_share_exact_cards_section_geometry",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "cardStyle={FLASHCARD_LIST_ITEM_CARD_STYLE}",
  "overlay_does_not_render_shared_compact_card_style",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "onSpeak={onSpeakFromCardsComponent}",
  "canonical_top_right_speaker_not_wired",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "exactMeaningByLocale[locale]",
  "card_back_is_not_exact_translation_only",
);
rejectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "<PhraseCard",
  "overlay_still_uses_wrong_tall_deck_card_variant",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  "encounter.playfulMeaningByLocale[locale]",
  "under_card_editorial_definition_missing",
);
expectText(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
  'testID="learning-v2-new-word-definition"',
  "under_card_editorial_definition_not_rendered",
);
const overlaySource = read(
  "components/learning-v2/LearningV2NewWordEncounterOverlay.tsx",
);
if ((overlaySource.match(/accessibilityLabel=\{copy\.saveLabel\}/g) ?? []).length !== 1) {
  findings.push("word_card_save_control_must_appear_exactly_once");
}
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'practiceActivated &&\n          sessionAttempts.state.phase !== "awaiting_recovery"',
  "underlay_save_control_not_hidden_behind_word_card",
);
expectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'kind: "practice_reached"',
  "player_does_not_gate_current_interaction",
);
rejectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'kind: "intro_completed"',
  "player_still_drains_word_cards_after_intro",
);
rejectText(
  "app/learning_v2_direct_session_player_v1.tsx",
  'newWordFlow.kind === "completed"',
  "practice_waits_for_entire_word_queue",
);

if (findings.length) {
  throw new Error(
    [
      "LEARNING V2 INTERLEAVED WORD CARD GATE: HOLD",
      `total_findings=${findings.length}`,
      ...findings,
    ].join("\n"),
  );
}

process.stdout.write("LEARNING V2 INTERLEAVED WORD CARD GATE: PASS\n");
