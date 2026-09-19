#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseRoot = path.resolve(
  root,
  "modules/learning-v2/content/factory_native/generated_release/en",
);
const voices = Object.freeze(["ash", "onyx", "nova", "coral"]);

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function transcriptsFor(interaction) {
  const payload = interaction?.modePayload;
  const references = payload?.family === "sound_contrast"
    ? [payload.audioA, payload.audioB]
    : [payload?.referenceAudio];
  return references
    .map((reference) => typeof reference?.transcript === "string"
      ? reference.transcript.normalize("NFKC").trim()
      : "")
    .filter(Boolean);
}

const learners = walk(releaseRoot)
  .filter((file) => path.basename(file) === "learner.json")
  .sort();
const rows = [];
const uniqueTargets = new Set();
const invalid = [];
for (const file of learners) {
  const learner = JSON.parse(fs.readFileSync(file, "utf8"));
  const audioInteractions = learner.interactions.filter(
    (interaction) => Array.isArray(interaction.audioTargetIds) && interaction.audioTargetIds.length > 0,
  );
  const transcripts = [];
  for (const interaction of audioInteractions) {
    const interactionTranscripts = transcriptsFor(interaction);
    if (interactionTranscripts.length === 0) {
      invalid.push({ courseSessionId: learner.courseSessionId, interactionId: interaction.interactionId });
      continue;
    }
    transcripts.push(...interactionTranscripts);
    interactionTranscripts.forEach((transcript) => uniqueTargets.add(transcript));
  }
  rows.push({
    courseSessionId: learner.courseSessionId,
    audioInteractionCount: audioInteractions.length,
    uniqueTranscriptCount: new Set(transcripts).size,
    transcripts: [...new Set(transcripts)].sort(),
  });
}

const existingManifest = path.resolve(
  root,
  "assets/audio/learning-v2/session1-production-v1/manifest.json",
);
const existing = fs.existsSync(existingManifest)
  ? JSON.parse(fs.readFileSync(existingManifest, "utf8")).entries ?? []
  : [];
const factoryManifest = path.resolve(
  root,
  "assets/audio/learning-v2/factory-production-v1/manifest.json",
);
const factoryExisting = fs.existsSync(factoryManifest)
  ? JSON.parse(fs.readFileSync(factoryManifest, "utf8")).entries ?? []
  : [];
const existingCoordinates = new Set(
  [...existing, ...factoryExisting].map((entry) => `${String(entry.transcript).normalize("NFKC").trim()}\u0000${entry.voiceId}`),
);
const expectedCoordinates = [...uniqueTargets].flatMap((transcript) =>
  voices.map((voice) => `${transcript}\u0000${voice}`),
);
const missingCoordinates = expectedCoordinates.filter((coordinate) => !existingCoordinates.has(coordinate));
const sessionCoverage = rows.map((row) => {
  const required = row.transcripts.flatMap((transcript) => voices.map((voice) => `${transcript}\u0000${voice}`));
  const availableFileCount = required.filter((coordinate) => existingCoordinates.has(coordinate)).length;
  return {
    courseSessionId: row.courseSessionId,
    requiredFileCount: required.length,
    availableFileCount,
    complete: availableFileCount === required.length,
  };
});
const estimatedCharacters = missingCoordinates.reduce(
  (sum, coordinate) => sum + coordinate.slice(0, coordinate.lastIndexOf("\u0000")).length,
  0,
);
const audioSessions = rows.filter((row) => row.audioInteractionCount > 0);
const report = {
  schemaVersion: "learning-v2-factory-audio-audit.v1",
  sessionCount: rows.length,
  audioSessionCount: audioSessions.length,
  audioInteractionCount: rows.reduce((sum, row) => sum + row.audioInteractionCount, 0),
  uniqueTranscriptCount: uniqueTargets.size,
  requiredVoiceIds: voices,
  expectedFileCount: expectedCoordinates.length,
  reusableExistingFileCount: expectedCoordinates.length - missingCoordinates.length,
  missingFileCount: missingCoordinates.length,
  completeSessionCount: sessionCoverage.filter((row) => row.complete).length,
  incompleteSessionCount: sessionCoverage.filter((row) => !row.complete).length,
  estimatedMissingCharacters: estimatedCharacters,
  invalidAudioInteractionCount: invalid.length,
};

const detailDir = path.resolve(root, ".codex-tmp/learning-v2-audio-audit");
fs.mkdirSync(detailDir, { recursive: true });
fs.writeFileSync(
  path.join(detailDir, "latest.json"),
  `${JSON.stringify({ ...report, sessions: rows, sessionCoverage, invalid, targets: [...uniqueTargets].sort() }, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({ ...report, detailPath: ".codex-tmp/learning-v2-audio-audit/latest.json" }, null, 2));
if (invalid.length > 0) process.exitCode = 1;
