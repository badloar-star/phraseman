#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_ROOT = path.join(ROOT, "content", "learning-v2-course", "release", "en");
const SOURCE_ROOT = path.join(ROOT, "content", "learning-v2-course", "sessions", "en");
const OUTPUT = path.join(
  ROOT,
  "modules",
  "learning-v2",
  "content",
  "factory_native",
  "factory_native_manifest_v1.generated.ts",
);
const CATALOG_OUTPUT = path.join(
  ROOT,
  "modules",
  "learning-v2",
  "content",
  "factory_native",
  "factory_native_catalog_v1.generated.ts",
);
const GENERATED_RELEASE_ROOT = path.join(
  ROOT, "modules", "learning-v2", "content", "factory_native", "generated_release", "en",
);
const MOCKUP_DATA = path.join(ROOT, "content", "learning-v2-course", "mockup", "data.js");
const CHECK = process.argv.includes("--check");

const read = (file) => fs.readFileSync(file, "utf8");
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}

function stripInlineMarkdown(value) {
  return value.replace(/^\*\*|\*\*$/gu, "").trim();
}

function introMetadata(markdown, sourceLabel) {
  const blocks = markdown.split(/^##\s*[ИІ]нтро\s*\d+[^\n]*$/gmi).slice(1, 4);
  if (blocks.length !== 3) throw new Error(`${sourceLabel}: expected three intro blocks`);
  return blocks.map((block, pageIndex) => {
    const optionLines = [...block.matchAll(/^-\s+(✅|❌)\s*([\s\S]*?)(?=^-\s+(?:✅|❌)|^---|(?![\s\S]))/gm)];
    const correct = optionLines
      .map((match, index) => match[1] === "✅" ? index : -1)
      .filter((index) => index >= 0);
    if (correct.length !== 1) {
      throw new Error(`${sourceLabel}: intro ${pageIndex + 1} expected one correct choice`);
    }
    const questionRegion = block.slice(0, optionLines[0]?.index ?? block.length);
    const question = [...questionRegion.matchAll(/\*\*([^*]+)\*\*/g)].at(-1)?.[1]?.replace(/\s+/gu, " ").trim();
    if (!question) throw new Error(`${sourceLabel}: intro ${pageIndex + 1} question missing`);
    const options = optionLines.map((match) => {
      const normalized = match[2].replace(/\s+/gu, " ").trim();
      const [choicePart, feedbackPart = ""] = normalized.split(/\s+—\s+(?=\*)/u, 2);
      return {
        correct: match[1] === "✅",
        choice: stripInlineMarkdown(choicePart),
        feedback: feedbackPart.replace(/^\*|\*$/gu, "").trim(),
      };
    });
    return { correctChoiceIndex: correct[0], question, options };
  });
}

function learningOutcome(markdown, sourceLabel) {
  const match = /\*\*(?:(?:Новая|Нова)\s+)?операц[иі]я:\*\*\s*(.+)/iu.exec(markdown);
  if (!match?.[1]?.trim()) throw new Error(`${sourceLabel}: learning operation missing`);
  return match[1].trim();
}

function practiceTitles(markdown, sourceLabel) {
  const afterIntro = markdown.split(/^##\s*[ИІ]нтро\s*3[^\n]*$/mi)[1] ?? markdown;
  const practicePart = (afterIntro.split(/^##\s+(?!Для сборщика)/m)[1] ?? afterIntro)
    .split(/^## Для сборщика/m)[0] ?? "";
  const rows = practicePart.split(/^\*\*(?=\d+ · )/m).slice(1).map((chunk) => {
    const match = /^(\d+) · ([^*]+)\*\*/u.exec(chunk);
    if (!match) throw new Error(`${sourceLabel}: malformed practice heading`);
    return { ordinal: Number(match[1]), title: match[2].trim() };
  });
  if (rows.length < 12 || rows.length > 22) {
    throw new Error(`${sourceLabel}: expected 12-22 authored records, got ${rows.length}`);
  }
  return rows;
}

function lessonTitle(markdown, lessonOrdinal, locale) {
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1]?.trim() ?? "";
  const prefix = title.split(/\s+·\s+(?:Сессия|Сесія)\s+\d+/u)[0]?.trim();
  if (prefix && prefix.length >= 4) return prefix;
  return locale === "uk" ? `Англійська · Урок ${lessonOrdinal}` : `Английский · Урок ${lessonOrdinal}`;
}

function rows() {
  const result = [];
  const lessons = fs.readdirSync(RELEASE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^l\d{2}$/u.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const lesson of lessons) {
    const lessonOrdinal = Number(lesson.name.slice(1));
    const sessions = fs.readdirSync(path.join(RELEASE_ROOT, lesson.name), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^s\d{2}$/u.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name));
    sessions.forEach((session, index) => {
      const sessionOrdinal = Number(session.name.slice(1));
      if (sessionOrdinal !== index + 1) {
        throw new Error(`${lesson.name}: non-contiguous release at ${session.name}`);
      }
      const relative = `content/learning-v2-course/release/en/${lesson.name}/${session.name}`;
      const releaseDir = path.join(RELEASE_ROOT, lesson.name, session.name);
      const sourceDir = path.join(SOURCE_ROOT, lesson.name, session.name);
      const files = {
        intro: path.join(releaseDir, "intro.json"),
        learnerRu: path.join(releaseDir, "learner.json"),
        learnerUk: path.join(releaseDir, "learner.uk.json"),
        answers: path.join(releaseDir, "answers.json"),
        sourceRu: path.join(sourceDir, "final.ru.md"),
        sourceUk: path.join(sourceDir, "final.uk.md"),
      };
      for (const [kind, file] of Object.entries(files).filter(([kind]) => kind !== "learnerUk")) {
        if (!fs.existsSync(file)) throw new Error(`${relative}: ${kind} missing`);
      }
      const sourceRu = read(files.sourceRu);
      const sourceUk = read(files.sourceUk);
      const learnerRu = JSON.parse(read(files.learnerRu));
      const newWordCount = Array.isArray(learnerRu.interactions)
        ? learnerRu.interactions.filter(
            (interaction) => interaction?.modePayload?.isWordCard === true,
          ).length
        : 0;
      const introRu = introMetadata(sourceRu, `${lesson.name}/${session.name}/ru`);
      const introUk = introMetadata(sourceUk, `${lesson.name}/${session.name}/uk`);
      const releaseIntro = JSON.parse(read(files.intro));
      if (!Array.isArray(releaseIntro.pages) || releaseIntro.pages.length !== 3) {
        throw new Error(`${lesson.name}/${session.name}: release intro expected three pages`);
      }
      introRu.forEach((page, pageIndex) => {
        const ukPage = introUk[pageIndex];
        if (!ukPage || page.correctChoiceIndex !== ukPage.correctChoiceIndex ||
          page.options.map((option) => option.choice).join("\u0000") !== ukPage.options.map((option) => option.choice).join("\u0000")) {
          throw new Error(`${lesson.name}/${session.name}: intro ${pageIndex + 1} locale choice order differs`);
        }
        const releasePage = releaseIntro.pages[pageIndex];
        for (const locale of ["ru", "uk"]) {
          const releaseChoices = releasePage?.question?.choicesByLocale?.[locale];
          const sourceChoices = (locale === "ru" ? page : ukPage).options.map((option) => option.choice);
          if (!Array.isArray(releaseChoices) || releaseChoices.length !== 3 ||
            releaseChoices.map((choice) => choice?.text).join("\u0000") !== sourceChoices.join("\u0000")) {
            throw new Error(`${lesson.name}/${session.name}: intro ${pageIndex + 1} ${locale} release choices differ from reviewed source`);
          }
          const responseIds = releaseChoices.map((choice) => choice?.responseId);
          if (new Set(responseIds).size !== 3 || responseIds.some((responseId, index) =>
            typeof responseId !== "string" || !responseId.endsWith(`:intro${pageIndex + 1}:r${index + 1}`))) {
            throw new Error(`${lesson.name}/${session.name}: intro ${pageIndex + 1} ${locale} response ids invalid`);
          }
        }
      });
      const releaseBytes = [files.intro, files.learnerRu, files.answers, ...(fs.existsSync(files.learnerUk) ? [files.learnerUk] : [])]
        .map(read)
        .join("\u0000");
      result.push({
        lessonOrdinal,
        sessionOrdinal,
        relative,
        introCorrectChoiceIndexes: introRu.map((page) => page.correctChoiceIndex),
        introPromptByAuthoredLocale: {
          ru: introRu.map((page) => page.question),
          uk: introUk.map((page) => page.question),
        },
        introWrongFeedbackByAuthoredLocale: {
          ru: introRu.map((page) => page.options.filter((option) => !option.correct).map((option) => option.feedback)),
          uk: introUk.map((page) => page.options.filter((option) => !option.correct).map((option) => option.feedback)),
        },
        learningOutcomeByAuthoredLocale: {
          ru: learningOutcome(sourceRu, `${lesson.name}/${session.name}/ru`),
          uk: learningOutcome(sourceUk, `${lesson.name}/${session.name}/uk`),
        },
        newWordCount,
        lessonTitleByAuthoredLocale: {
          ru: lessonTitle(sourceRu, lessonOrdinal, "ru"),
          uk: lessonTitle(sourceUk, lessonOrdinal, "uk"),
        },
        practiceTitlesByAuthoredLocale: {
          ru: practiceTitles(sourceRu, `${lesson.name}/${session.name}/ru`),
          uk: practiceTitles(sourceUk, `${lesson.name}/${session.name}/uk`),
        },
        hasLocalizedLearnerRelease: fs.existsSync(files.learnerUk),
        sourceFingerprint: sha(`${sourceRu}\u0000${sourceUk}\u0000${releaseBytes}`),
      });
    });
  }
  if (!fs.existsSync(MOCKUP_DATA)) throw new Error("canonical mockup data missing");
  const mockupSource = read(MOCKUP_DATA).replace(/^window\.__DATA__\s*=\s*/u, "").replace(/;\s*$/u, "");
  const mockupRows = JSON.parse(mockupSource);
  if (!Array.isArray(mockupRows)) throw new Error("canonical mockup data invalid");
  const canonicalCoordinates = mockupRows.map((value) => `${value.lesson}/${value.session}`);
  const releaseCoordinates = result.map((value) =>
    `l${String(value.lessonOrdinal).padStart(2, "0")}/s${String(value.sessionOrdinal).padStart(2, "0")}`);
  if (JSON.stringify(canonicalCoordinates) !== JSON.stringify(releaseCoordinates)) {
    throw new Error("native release inventory differs from canonical mockup");
  }
  return result;
}

function render(manifestRows) {
  const entries = manifestRows.map((row) => {
    const lesson = `l${String(row.lessonOrdinal).padStart(2, "0")}`;
    const session = `s${String(row.sessionOrdinal).padStart(2, "0")}`;
    const moduleBase = `./generated_release/en/${lesson}/${session}`;
    return `  Object.freeze({\n` +
      `    lessonOrdinal: ${row.lessonOrdinal}, sessionOrdinal: ${row.sessionOrdinal},\n` +
      `    sourceFingerprint: ${JSON.stringify(row.sourceFingerprint)},\n` +
      `    introCorrectChoiceIndexes: Object.freeze(${JSON.stringify(row.introCorrectChoiceIndexes)}),\n` +
      `    introPromptByAuthoredLocale: Object.freeze(${JSON.stringify(row.introPromptByAuthoredLocale)}),\n` +
      `    introWrongFeedbackByAuthoredLocale: Object.freeze(${JSON.stringify(row.introWrongFeedbackByAuthoredLocale)}),\n` +
      `    learningOutcomeByAuthoredLocale: Object.freeze(${JSON.stringify(row.learningOutcomeByAuthoredLocale)}),\n` +
      `    lessonTitleByAuthoredLocale: Object.freeze(${JSON.stringify(row.lessonTitleByAuthoredLocale)}),\n` +
      `    practiceTitlesByAuthoredLocale: Object.freeze(${JSON.stringify(row.practiceTitlesByAuthoredLocale)}),\n` +
      `    loadIntro: () => require(${JSON.stringify(`${moduleBase}/intro.json`)}) as unknown,\n` +
      `    loadLearner: (locale: "ru" | "uk") => locale === "uk" ? ${row.hasLocalizedLearnerRelease ? `require(${JSON.stringify(`${moduleBase}/learner.uk.json`)})` : `require(${JSON.stringify(`${moduleBase}/learner.json`)})`} as unknown : require(${JSON.stringify(`${moduleBase}/learner.json`)}) as unknown,\n` +
      `    loadAnswers: () => require(${JSON.stringify(`${moduleBase}/answers.json`)}) as unknown,\n` +
      `  }),`;
  });
  return `/* This file is generated by scripts/build_learning_v2_factory_native_manifest.mjs. */\n` +
    `/* The release JSON stays the learner-reviewed source of truth; this file only gives Metro static edges. */\n` +
    `export interface LearningV2FactoryNativeManifestRowV1 {\n` +
    `  readonly lessonOrdinal: number; readonly sessionOrdinal: number; readonly sourceFingerprint: string;\n` +
    `  readonly introCorrectChoiceIndexes: readonly number[];\n` +
    `  readonly introPromptByAuthoredLocale: Readonly<Record<"ru" | "uk", readonly string[]>>;\n` +
    `  readonly introWrongFeedbackByAuthoredLocale: Readonly<Record<"ru" | "uk", readonly (readonly string[])[]>>;\n` +
    `  readonly learningOutcomeByAuthoredLocale: Readonly<Record<"ru" | "uk", string>>;\n` +
    `  readonly lessonTitleByAuthoredLocale: Readonly<Record<"ru" | "uk", string>>;\n` +
    `  readonly practiceTitlesByAuthoredLocale: Readonly<Record<"ru" | "uk", readonly Readonly<{ ordinal: number; title: string }>[]>>;\n` +
    `  readonly loadIntro: () => unknown; readonly loadLearner: (locale: "ru" | "uk") => unknown; readonly loadAnswers: () => unknown;\n` +
    `}\n` +
    `export const FACTORY_NATIVE_MANIFEST_V1: readonly LearningV2FactoryNativeManifestRowV1[] = Object.freeze([\n${entries.join("\n")}\n]);\n`;
}

function renderCatalog(manifestRows) {
  const entries = manifestRows.map((row) => `  Object.freeze({
    lessonOrdinal: ${row.lessonOrdinal}, sessionOrdinal: ${row.sessionOrdinal},
    sourceFingerprint: ${JSON.stringify(row.sourceFingerprint)},
    newWordCount: ${row.newWordCount},
    learningOutcomeByAuthoredLocale: Object.freeze(${JSON.stringify(row.learningOutcomeByAuthoredLocale)}),
    lessonTitleByAuthoredLocale: Object.freeze(${JSON.stringify(row.lessonTitleByAuthoredLocale)}),
  }),`);
  return `/* This file is generated by scripts/build_learning_v2_factory_native_manifest.mjs. */\n` +
    `/* Catalog metadata intentionally contains no Metro edges to session JSON. */\n` +
    `export interface LearningV2FactoryNativeCatalogRowV1 {\n` +
    `  readonly lessonOrdinal: number; readonly sessionOrdinal: number; readonly sourceFingerprint: string;\n` +
    `  readonly newWordCount: number;\n` +
    `  readonly learningOutcomeByAuthoredLocale: Readonly<Record<"ru" | "uk", string>>;\n` +
    `  readonly lessonTitleByAuthoredLocale: Readonly<Record<"ru" | "uk", string>>;\n` +
    `}\n` +
    `export const FACTORY_NATIVE_CATALOG_ROWS_V1: readonly LearningV2FactoryNativeCatalogRowV1[] = Object.freeze([\n${entries.join("\n")}\n]);\n`;
}

const manifestRows = rows();
const generatedFiles = manifestRows.flatMap((row) => {
  const lesson = `l${String(row.lessonOrdinal).padStart(2, "0")}`;
  const session = `s${String(row.sessionOrdinal).padStart(2, "0")}`;
  const releaseDir = path.join(RELEASE_ROOT, lesson, session);
  return ["intro.json", "learner.json", "learner.uk.json", "answers.json"]
    .filter((name) => fs.existsSync(path.join(releaseDir, name)))
    .map((name) => ({
      source: path.join(releaseDir, name),
      destination: path.join(GENERATED_RELEASE_ROOT, lesson, session, name),
    }));
});
const output = render(manifestRows);
const catalogOutput = renderCatalog(manifestRows);
if (CHECK) {
  const staleRelease = generatedFiles.some(({ source, destination }) =>
    !fs.existsSync(destination) || read(source) !== read(destination));
  if (
    !fs.existsSync(OUTPUT) ||
    read(OUTPUT) !== output ||
    !fs.existsSync(CATALOG_OUTPUT) ||
    read(CATALOG_OUTPUT) !== catalogOutput ||
    staleRelease
  ) {
    console.error("Learning V2 factory native manifest is stale");
    process.exitCode = 1;
  } else {
    console.log("Learning V2 factory native manifest: FRESH");
  }
} else {
  const resolvedGeneratedRoot = path.resolve(GENERATED_RELEASE_ROOT);
  const resolvedFactoryRoot = path.resolve(path.dirname(OUTPUT));
  if (!resolvedGeneratedRoot.startsWith(`${resolvedFactoryRoot}${path.sep}`)) {
    throw new Error("generated release root escaped factory module");
  }
  const desiredGeneratedFiles = new Set(generatedFiles.map(({ destination }) => path.resolve(destination)));
  for (const existing of filesUnder(GENERATED_RELEASE_ROOT)) {
    if (!desiredGeneratedFiles.has(path.resolve(existing))) fs.rmSync(existing, { force: true });
  }
  for (const { source, destination } of generatedFiles) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (!fs.existsSync(destination) || read(source) !== read(destination)) {
      fs.copyFileSync(source, destination);
    }
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, output, "utf8");
  fs.writeFileSync(CATALOG_OUTPUT, catalogOutput, "utf8");
  console.log(`Learning V2 factory native manifest: wrote ${path.relative(ROOT, OUTPUT)}`);
}
