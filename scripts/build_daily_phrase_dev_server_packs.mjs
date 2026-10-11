import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DAILY_PHRASE_DEV_CONTENT_VERSION = '2026.10.04.editorial-accepted-dev-v1';
const TARGETS = ['es', 'de', 'it'];
const SOURCE_LOCALES = ['ru', 'uk'];
const REQUIRED_ROWS = 176;
const DEFAULT_GENERATED_AT = '2026-10-04T00:00:00.000Z';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sha256File(filePath) {
  return sha256Text(fs.readFileSync(filePath));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertAcceptedInputs(rootDir, target) {
  const directory = path.join(rootDir, 'content', 'daily-phrases', target);
  const bankPath = path.join(directory, 'source-bank.json');
  const manifestPath = path.join(directory, 'prior-accepted-manifest.json');
  const bank = readJson(bankPath);
  const accepted = readJson(manifestPath);
  const expectedBank = accepted?.authorityArtifacts?.bank;
  const gates = accepted?.deterministicGates ?? {};

  if (accepted?.studyTarget !== target || accepted?.independentEditorialReview?.verdict !== 'ACCEPT') {
    throw new Error(`${target}: independent editorial ACCEPT is required`);
  }
  if (accepted?.independentEditorialReview?.releaseTrusted !== false) {
    throw new Error(`${target}: expected an editorial-only, non-release receipt`);
  }
  if (!expectedBank?.path || expectedBank.path.replace(/\\/g, '/') !== `content/daily-phrases/${target}/source-bank.json`) {
    throw new Error(`${target}: accepted bank path mismatch`);
  }
  if (sha256File(bankPath).toUpperCase() !== String(expectedBank.sha256).toUpperCase()) {
    throw new Error(`${target}: accepted bank sha256 mismatch`);
  }
  for (const gate of ['sourceLink', 'style', 'quiz', 'structural']) {
    if (gates[gate] !== 'PASS') throw new Error(`${target}: ${gate} gate is not PASS`);
  }
  if (bank?.studyTarget !== target || bank?.surface !== 'daily_phrase' || bank?.activationApproved !== false) {
    throw new Error(`${target}: bank identity or activation boundary mismatch`);
  }
  if (!Array.isArray(bank.rows) || bank.rows.length !== REQUIRED_ROWS) {
    throw new Error(`${target}: expected ${REQUIRED_ROWS} rows`);
  }
  if (bank.rows.some((row) => row.studyTarget !== target || row.surface !== 'daily_phrase')) {
    throw new Error(`${target}: mixed target or surface row`);
  }
  if (bank.rows.some((row) => row.active !== false || row.activationApproved !== false)) {
    throw new Error(`${target}: editorial activation flags must remain false`);
  }
  return { bank, acceptedBankSha256: expectedBank.sha256 };
}

function runtimeEntry(row, sourceLocale) {
  const suffix = sourceLocale === 'uk' ? 'uk' : 'ru';
  return {
    id: row.id,
    order: row.order,
    studyTarget: row.studyTarget,
    sourceLocale,
    surface: 'daily_phrase',
    targetText: row.targetText,
    targetExample: row.targetExample,
    literal: row[`literal_${suffix}`],
    meaning: row[`meaning_${suffix}`],
    text: row[`text_${suffix}`],
    literal_ru: row.literal_ru,
    meaning_ru: row.meaning_ru,
    text_ru: row.text_ru,
    literal_uk: row.literal_uk,
    meaning_uk: row.meaning_uk,
    text_uk: row.text_uk,
    quiz_ru: row.quiz_ru,
    quiz_uk: row.quiz_uk,
    allowSave: row.allowSave !== false,
    active: false,
    activationApproved: false,
  };
}

export function buildDailyPhraseDevServerPacks({
  rootDir,
  outputRoot,
  generatedAt = DEFAULT_GENERATED_AT,
}) {
  if (!path.isAbsolute(rootDir) || !path.isAbsolute(outputRoot)) {
    throw new Error('rootDir and outputRoot must be absolute paths');
  }

  const entries = [];
  for (const target of TARGETS) {
    const { bank, acceptedBankSha256 } = assertAcceptedInputs(rootDir, target);
    for (const sourceLocale of SOURCE_LOCALES) {
      const payload = {
        schemaVersion: 'daily-phrase-target-runtime-payload-v1',
        contentVersion: DAILY_PHRASE_DEV_CONTENT_VERSION,
        generatedAt,
        studyTarget: target,
        sourceLocale,
        surface: 'daily_phrase',
        devOnly: true,
        uploadPerformed: false,
        releaseApproved: false,
        activationApproved: false,
        acceptedBankSha256,
        entries: bank.rows.map((row) => runtimeEntry(row, sourceLocale)),
      };
      const payloadText = stableJson(payload);
      const payloadSha256 = sha256Text(payloadText);
      const prefix = `course-packs/${target}/${sourceLocale}/daily_phrase/${DAILY_PHRASE_DEV_CONTENT_VERSION}`;
      const payloadName = `${payloadSha256}.json`;
      const serverPath = `${prefix}/${payloadName}`;
      const manifestPath = `${prefix}/manifest.json`;
      const manifest = {
        packId: `${target}.${sourceLocale}.daily_phrase.${DAILY_PHRASE_DEV_CONTENT_VERSION}`,
        studyTarget: target,
        sourceLocale,
        surface: 'daily_phrase',
        schemaVersion: 'course-pack-v1',
        contentVersion: DAILY_PHRASE_DEV_CONTENT_VERSION,
        minAppVersion: 'dev-only',
        sha256: payloadSha256,
        payloadSha256,
        byteSize: Buffer.byteLength(payloadText),
        payloadBytes: Buffer.byteLength(payloadText),
        createdAt: generatedAt,
        dependencies: [],
        entryIndex: payloadName,
        payloadShard: payloadName,
        devOnly: true,
        uploadPerformed: false,
        releaseApproved: false,
        activationApproved: false,
      };

      fs.mkdirSync(path.dirname(path.join(outputRoot, serverPath)), { recursive: true });
      fs.writeFileSync(path.join(outputRoot, serverPath), payloadText, 'utf8');
      fs.writeFileSync(path.join(outputRoot, manifestPath), stableJson(manifest), 'utf8');
      entries.push({
        studyTarget: target,
        sourceLocale,
        surface: 'daily_phrase',
        payloadSha256,
        bytes: manifest.payloadBytes,
        serverPath,
        manifestPath,
      });
    }
  }

  const uploadPlan = {
    schemaVersion: 'daily-phrase-dev-server-upload-plan-v1',
    contentVersion: DAILY_PHRASE_DEV_CONTENT_VERSION,
    generatedAt,
    devOnly: true,
    uploadPerformed: false,
    releaseApproved: false,
    activationApproved: false,
    entries,
  };
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'upload-plan.json'), stableJson(uploadPlan), 'utf8');
  return uploadPlan;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const rootDir = path.resolve(process.cwd());
  const outputRoot = path.resolve(process.argv[2] || '.artifacts/daily-phrase-dev-server-packs');
  const result = buildDailyPhraseDevServerPacks({ rootDir, outputRoot });
  console.log(JSON.stringify({ outputRoot, ...result }, null, 2));
}

