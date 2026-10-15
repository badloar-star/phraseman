import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function renderedShuffle(values, seed) {
  return values.map((value, index) => ({ value, key: sha256(`${seed}:${index}:${JSON.stringify(value)}`) }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => entry.value);
}

function visibleFeedback(rows, locale) {
  return (rows ?? []).flatMap((row) => {
    const text = String(row?.feedbackByLocale?.[locale] ?? "").trim();
    return text ? [{ responseId: row.responseId, text }] : [];
  });
}

function renderInteraction(interaction, locale) {
  const payload = interaction?.modePayload ?? {};
  const rendered = {
    interactionId: interaction.interactionId,
    ordinal: interaction.ordinal,
    purpose: interaction.purpose,
    family: interaction.family,
    inputMode: interaction.inputMode,
    prompt: interaction.prompt,
    accessibilityLabel: interaction.accessibilityLabel,
    responseOptions: (interaction.responseOptions ?? []).map((option) => ({
      responseId: option.responseId,
      text: option.text,
    })),
    audio: (interaction.audioTargetIds ?? []).length ? "present_not_transcribed_or_played" : "none",
  };
  const visibleTiles = renderedShuffle(
    [...(payload.orderedTokens ?? []), ...(payload.authoredDistractorTokens ?? [])],
    `${interaction.interactionId}:${locale}:tiles`,
  );
  if (visibleTiles.length) rendered.visibleTiles = visibleTiles;
  if (payload.localizedScene?.[locale]) rendered.scene = payload.localizedScene[locale];
  if (payload.gappedTargetPhrase) rendered.gappedText = payload.gappedTargetPhrase;
  if (payload.gapOptions) rendered.gapOptions = payload.gapOptions.map((option) => ({ responseId: option.responseId, text: option.text }));
  if (payload.localizedMeaningChoices) {
    rendered.visibleMeaningChoices = payload.localizedMeaningChoices.map((choice) => ({
      responseId: choice.responseId,
      targetText: choice.targetText,
      meaning: choice.meaningByLocale?.[locale] ?? null,
    }));
  }
  if (payload.wordCard) {
    rendered.wordCard = {
      word: payload.wordCard.word,
      definition: payload.wordCard.definitionByLocale?.[locale] ?? "",
    };
  }
  if (payload.pairGrid) {
    rendered.visiblePairColumns = {
      left: renderedShuffle(payload.pairGrid.map((pair) => pair.target), `${interaction.interactionId}:${locale}:left`),
      right: renderedShuffle(payload.pairGrid.map((pair) => pair.meaningByLocale?.[locale] ?? ""), `${interaction.interactionId}:${locale}:right`),
    };
  }
  const feedback = [
    ...visibleFeedback(payload.choiceFeedback, locale),
    ...visibleFeedback(payload.slotFeedback, locale),
  ];
  if (feedback.length) rendered.feedback = feedback;
  return rendered;
}

export function buildBlindLearnerReviewPacket({
  candidateBundleSha256,
  contentReceiptSha256,
  candidateInventorySha256,
  sourceFingerprint,
  intro,
  learnersByLocale,
  auxiliary,
}) {
  return {
    schemaVersion: "learning_v2_blind_learner_rendered_packet_v1",
    courseSessionId: intro.courseSessionId,
    reviewBoundary: {
      answerFree: true,
      audioReviewed: false,
      omittedFields: [
        "answers",
        "evaluator",
        "correct flags",
        "targetPhrase",
        "hiddenTargetPhrase",
        "audio transcripts",
      ],
    },
    candidateBinding: {
      candidateBundleSha256,
      contentReceiptSha256,
      candidateInventorySha256,
      sourceFingerprint,
    },
    intro: (intro.pages ?? []).map((page) => ({
      pageOrdinal: page.pageOrdinal,
      pageId: page.pageId,
      kind: page.kind,
      titleByLocale: page.titleByLocale,
      bodyByLocale: page.bodyByLocale,
      question: {
        interactionId: page.question?.interactionId,
        promptByLocale: page.question?.promptByLocale,
        choicesByLocale: page.question?.choicesByLocale,
      },
      feedbackByResponseId: Object.fromEntries((auxiliary?.entries ?? [])
        .filter((entry) => entry.interactionId === page.question?.interactionId)
        .flatMap((entry) => Object.entries(entry.responseFeedbackById ?? {}))),
    })),
    locales: Object.fromEntries(Object.entries(learnersByLocale).map(([locale, learner]) => [
      locale,
      { interactions: (learner.interactions ?? []).map((interaction) => renderInteraction(interaction, locale)) },
    ])),
  };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value || value.startsWith("--")) throw new Error("usage: --candidate <dir> --out <file>");
    parsed[name.slice(2)] = value;
  }
  if (!parsed.candidate || !parsed.out) throw new Error("usage: --candidate <dir> --out <file>");
  return parsed;
}

export function projectionRelativePathForReceipt(receipt) {
  const match = /^([a-z]{2}):lesson-(\d{2}):session-(\d{2})$/u.exec(String(receipt?.courseSessionId ?? ""));
  if (!match) throw new Error("blind_packet_course_session_invalid");
  return `${match[1]}/l${match[2]}/s${match[3]}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();
  const candidateRoot = path.resolve(repoRoot, args.candidate);
  const receiptPath = path.join(candidateRoot, "content-receipt.json");
  const receiptBytes = fs.readFileSync(receiptPath);
  const receipt = JSON.parse(receiptBytes);
  const projectionRoot = path.join(candidateRoot, ...projectionRelativePathForReceipt(receipt).split("/"));
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(projectionRoot, name), "utf8"));
  const packet = buildBlindLearnerReviewPacket({
    candidateBundleSha256: receipt.candidateBundleSha256,
    contentReceiptSha256: sha256(receiptBytes),
    candidateInventorySha256: receipt.inventorySha256,
    sourceFingerprint: receipt.sourceSnapshot.indexSha256,
    intro: readJson("intro.json"),
    auxiliary: readJson("auxiliary.json"),
    learnersByLocale: { ru: readJson("learner.json"), uk: readJson("learner.uk.json") },
  });
  const serialized = `${JSON.stringify(packet, null, 2)}\n`;
  const forbidden = /"(?:targetPhrase|hiddenTargetPhrase|correctResponseId|correctText|correct|evaluatorPayload|acceptedAnswerPayload)"\s*:/u;
  if (forbidden.test(serialized)) throw new Error("blind_packet_forbidden_field");
  const output = path.resolve(repoRoot, args.out);
  if (fs.existsSync(output)) throw new Error("blind_packet_output_exists");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, serialized, { flag: "wx" });
  process.stdout.write(`${JSON.stringify({ output: path.relative(repoRoot, output).replaceAll("\\", "/"), sha256: sha256(serialized), bytes: Buffer.byteLength(serialized) })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
