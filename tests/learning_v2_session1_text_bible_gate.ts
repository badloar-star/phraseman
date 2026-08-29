import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  evaluateLearningV2SessionContentQuality,
  learningV2SessionContentFingerprint,
} from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";
import {
  LESSON1_AUTHORING_REGISTRY_V1,
  lesson1AuthoringPreflightV1,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";
import { learningV2NewWordCardEditorialV1 } from "../modules/learning-v2/content/source/learning_v2_new_word_card_editorial_v1";

const ROOT = join(__dirname, "..");
const session1 = AUTHORED_EPISODE_01_SESSIONS.find(
  (source) => source.requiredSessionOrdinal === 1,
);
assert.ok(session1, "english_session_1_source_missing");

const startV2 = readFileSync(join(ROOT, "docs", "v2", "СТАРТ В2.md"), "utf8");
const releaseChecklist = readFileSync(
  join(ROOT, "docs", "v2", "КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md"),
  "utf8",
);
assert.match(
  startV2,
  /БИБЛИЯ_ТЕКСТОВ_LEARNING_V2\.ru\.md/u,
  "start_v2_must_route_every_author_to_the_current_text_bible",
);
assert.doesNotMatch(
  releaseChecklist,
  /intro_body_too_thin|минимум\s+300|не менее\s+300/iu,
  "release_checklist_must_not_restore_the_cancelled_intro_minimum",
);

assert.deepEqual(
  LESSON1_AUTHORING_REGISTRY_V1.map((entry) => entry.status),
  ["LOCKED", ...Array.from({ length: 55 }, () => "DRAFT")],
  "owner_approved_text_bible_candidate_locks_only_session_1",
);

const actualFingerprints = Object.fromEntries(
  Array.from({ length: 56 }, (_, index) => [index + 1, null as string | null]),
) as Record<number, string | null>;
for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  actualFingerprints[source.requiredSessionOrdinal] =
    learningV2SessionContentFingerprint(source);
}
assert.deepEqual(
  lesson1AuthoringPreflightV1(2, actualFingerprints),
  { lockedThrough: 1, currentSessionOrdinal: 2, forbiddenFrom: 3 },
);

const automaticIssues = evaluateLearningV2SessionContentQuality(session1).issues.filter(
  (issue) =>
    ![
      "quality_review_missing",
      "quality_review_stale",
      "quality_review_rejected",
      "quality_review_not_independent",
      "locale_review_missing",
    ].includes(issue.code),
);
assert.deepEqual(
  automaticIssues,
  [],
  `english_session_1_text_bible_hold:${JSON.stringify(automaticIssues.slice(0, 12))}`,
);

const spanishDistractorProbe = structuredClone(session1);
const recognize = spanishDistractorProbe.newVocabulary?.[0]?.contacts.recognize;
assert.ok(recognize, "session_1_recognize_contact_missing");
(recognize.guidance as unknown as { es: string }).es += " zztrap";
(recognize.distractors as unknown as (typeof recognize.distractors)[number][]).push({
  value: "zztrap",
  reasonCode: "text_bible_probe",
  trapType: "orthographic",
  feedback: {
    ru: "Zztrap выглядит близко, но это проверочная ловушка; здесь нужен I.",
    uk: "Zztrap виглядає близько, але це перевірочна пастка; тут потрібне I.",
    es: "Zztrap parece cercano, pero es una trampa de prueba; aquí se necesita I.",
    "pt-BR": "Zztrap parece próximo, mas é uma armadilha de teste; aqui é preciso I.",
    vi: "Zztrap trông gần giống nhưng là bẫy kiểm tra; ở đây cần I.",
    id: "Zztrap tampak dekat tetapi hanya jebakan uji; di sini diperlukan I.",
    tr: "Zztrap yakın görünür ama bir test tuzağıdır; burada I gerekir.",
    pl: "Zztrap wygląda podobnie, ale jest pułapką testową; tutaj potrzebne jest I.",
  },
});
assert.ok(
  evaluateLearningV2SessionContentQuality(spanishDistractorProbe).issues.some(
    (issue) =>
      issue.code === "guidance_mentions_unknown_word" &&
      issue.path.endsWith("guidance.es"),
  ),
  "all_eight_locales_must_reject_a_distractor_named_before_the_learner_selects_it",
);

const amCard = learningV2NewWordCardEditorialV1({
  targetLanguage: "en",
  lexicalItemId: "e01-s01-word-am",
  targetText: "am",
});
for (const [locale, copy] of Object.entries(amCard.playfulMeaningByLocale)) {
  assert.doesNotMatch(
    copy,
    /\bbe\b/iu,
    `am_card_must_not_explain_itself_through_unknown_be:${locale}`,
  );
}

process.stdout.write("LEARNING V2 SESSION 1 TEXT BIBLE GATE: PASS\n");
