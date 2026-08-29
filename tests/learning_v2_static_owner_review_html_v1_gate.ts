import assert from "node:assert/strict";
import { buildLearningV2StaticOwnerReviewBundleV1 } from "../modules/learning-v2/preview/static_owner_review_bundle_v1";
import { learningV2AuthoringDevicePreviewRowsV1 } from "../modules/learning-v2/preview/authoring_device_preview_v1";
import { renderLearningV2StaticOwnerReviewHtmlV1 } from "../scripts/learning-v2-static-owner-review/template_v1";

const html = renderLearningV2StaticOwnerReviewHtmlV1(
  buildLearningV2StaticOwnerReviewBundleV1(),
);

assert.match(html, /<!doctype html>/iu);
assert.match(html, /data-learning-v2-owner-review="v1"/u);
assert.match(html, /id:"session-picker"/u);
assert.match(html, /id:"locale-select"/u);
assert.match(html, /learning-v2-static-owner-review-bundle\.v1/u);
assert.match(html, /data-renderer="phrase_builder"/u);
assert.match(html, /data-renderer="listen_choose"/u);
assert.match(html, /data-renderer="listen_build_dictation"/u);
assert.match(html, /data-renderer="context_gap_grammar"/u);
assert.match(html, /data-renderer="speed_match"/u);
assert.match(html, /data-renderer="scripted_repeat_compare"/u);
assert.match(html, /id:"word-card-overlay"/u);
assert.match(html, /speechSynthesis/u);
assert.match(html, /MediaRecorder/u);
assert.match(html, /id:"qa-inspector"/u);
assert.match(html, /sourceFingerprint/u);
assert.match(
  html,
  /interaction\.inputMode==="single_choice"&&state\.answer&&state\.answer\.feedback/u,
  "owner review may render answer explanations only for real single-choice modes",
);
assert.doesNotMatch(
  html,
  /entries\.find\(item=>item\.correct===correct\)/u,
  "owner review must never substitute another option's explanation by correctness",
);
const visibleRows = learningV2AuthoringDevicePreviewRowsV1();
for (const row of visibleRows) {
  assert.match(html, new RegExp(`"sessionOrdinal":${row.sessionOrdinal}`, "u"));
}
const firstForbiddenOrdinal = Math.max(...visibleRows.map((row) => row.sessionOrdinal)) + 1;
assert.doesNotMatch(
  html,
  new RegExp(`"sessionOrdinal":${firstForbiddenOrdinal}`, "u"),
);
assert.doesNotMatch(html, /(?:firebase|expo-router|react-native)/iu);

process.stdout.write("LEARNING V2 STATIC OWNER REVIEW HTML: PASS\n");
