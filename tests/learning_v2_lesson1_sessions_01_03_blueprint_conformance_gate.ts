import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2 } from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";
import { EPISODE_01_SESSION_01_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_01_v1";
import { EPISODE_01_SESSION_02_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_02_v1";
import { EPISODE_01_SESSION_03_SOURCE } from "../modules/learning-v2/content/source/episode_01_session_03_v1";

type Finding = Readonly<{
  code: string;
  sessionId: string;
  detail: string;
}>;

const AUDITED_SESSION_IDS = [
  "lesson-01:session:01",
  "lesson-01:session:02",
  "lesson-01:session:03",
] as const;

const SOURCE_BY_SESSION_ID = Object.freeze({
  "lesson-01:session:01": EPISODE_01_SESSION_01_SOURCE,
  "lesson-01:session:02": EPISODE_01_SESSION_02_SOURCE,
  "lesson-01:session:03": EPISODE_01_SESSION_03_SOURCE,
});

function normalized(value: string): string {
  return value
    .toLocaleLowerCase("en")
    .replaceAll("’", "'")
    .replace(/[^a-z0-9']+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function tokens(value: string): readonly string[] {
  return normalized(value).match(/[a-z]+(?:'[a-z]+)*/gu) ?? [];
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values.map(normalized))].sort();
}

const lexicalEnglishById = new Map(
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.map((sense) => [
    sense.id,
    normalized(sense.english),
  ]),
);

const findings: Finding[] = [];

for (const sessionId of AUDITED_SESSION_IDS) {
  const packet = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.sessionPackets.find(
    (candidate) => candidate.sessionId === sessionId,
  );
  const source = SOURCE_BY_SESSION_ID[sessionId];

  if (!packet) {
    findings.push({
      code: "approved_packet_missing",
      sessionId,
      detail: "owner-approved blueprint has no exact packet",
    });
    continue;
  }

  const expectedNewLexemes = packet.newLexicalSenseIds.map((senseId) => {
    const english = lexicalEnglishById.get(senseId);
    if (!english) {
      findings.push({
        code: "packet_lexical_sense_missing",
        sessionId,
        detail: senseId,
      });
      return senseId;
    }
    return english;
  });
  const expectedRetrievalLexemes = packet.retrievalLexicalSenseIds.map(
    (senseId) => lexicalEnglishById.get(senseId) ?? senseId,
  );
  const actualNewLexemes = (source.newVocabulary ?? []).map((word) =>
    normalized(word.target),
  );
  const sourcePhrases = source.phrases.map((phrase) => normalized(phrase.english));
  const sourceCorpusTokens = new Set([
    ...actualNewLexemes,
    ...sourcePhrases.flatMap(tokens),
  ]);
  const exampleTokens = new Set(packet.canonicalExamples.flatMap(tokens));

  for (const lexeme of expectedNewLexemes) {
    if (!exampleTokens.has(lexeme)) {
      findings.push({
        code: "packet_new_lexeme_missing_from_canonical_examples",
        sessionId,
        detail: `${lexeme} absent from ${JSON.stringify(packet.canonicalExamples)}`,
      });
    }
  }

  if (
    JSON.stringify(sortedUnique(actualNewLexemes)) !==
    JSON.stringify(sortedUnique(expectedNewLexemes))
  ) {
    findings.push({
      code: "source_new_lexicon_mismatch",
      sessionId,
      detail: `expected=${JSON.stringify(sortedUnique(expectedNewLexemes))} actual=${JSON.stringify(sortedUnique(actualNewLexemes))}`,
    });
  }

  const missingRetrieval = expectedRetrievalLexemes.filter(
    (lexeme) => !sourceCorpusTokens.has(normalized(lexeme)),
  );
  if (missingRetrieval.length > 0) {
    findings.push({
      code: "source_retrieval_lexicon_missing",
      sessionId,
      detail: `missing=${JSON.stringify(missingRetrieval)}`,
    });
  }

  const missingCanonicalAnchors = packet.canonicalExamples
    .map(normalized)
    .filter((example) => !sourcePhrases.includes(example));
  if (missingCanonicalAnchors.length === packet.canonicalExamples.length) {
    findings.push({
      code: "source_has_no_canonical_example_anchor",
      sessionId,
      detail: `packet=${JSON.stringify(packet.canonicalExamples)} source=${JSON.stringify(source.phrases.map((phrase) => phrase.english))}`,
    });
  }

  const approvedFocusIds = [
    ...packet.grammarOperationIds,
    ...packet.reviewOperationIds,
  ];
  const sourceUsesContraction = [
    ...actualNewLexemes,
    ...sourcePhrases,
  ].some((value) => value.includes("i'm"));
  if (
    sourceUsesContraction &&
    !approvedFocusIds.some((focusId) => focusId.includes("contraction"))
  ) {
    findings.push({
      code: "source_unapproved_contraction_focus",
      sessionId,
      detail: `approvedFocus=${JSON.stringify(approvedFocusIds)}`,
    });
  }

  const expectedBinding = `blueprint:${LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.blueprintFingerprint}:${sessionId}`;
  if (source.generationInputFingerprint !== expectedBinding) {
    findings.push({
      code: "source_blueprint_binding_missing",
      sessionId,
      detail: `expected=${expectedBinding} actual=${source.generationInputFingerprint}`,
    });
  }
}

if (findings.length > 0) {
  process.stderr.write(
    `LEARNING V2 SESSIONS 1-3 BLUEPRINT CONFORMANCE GATE: HOLD (${findings.length} findings)\n`,
  );
  for (const finding of findings) {
    process.stderr.write(
      `${finding.code}:session=${finding.sessionId}:${finding.detail}\n`,
    );
  }
  process.exitCode = 1;
} else {
  process.stdout.write(
    "LEARNING V2 SESSIONS 1-3 BLUEPRINT CONFORMANCE GATE: PASS\n",
  );
}
