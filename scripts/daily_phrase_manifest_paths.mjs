import path from 'node:path';

export const DAILY_PHRASE_MANIFEST_TARGETS = Object.freeze(['es', 'fr', 'de', 'it']);
const TARGET_SET = new Set(DAILY_PHRASE_MANIFEST_TARGETS);
const AUTHORITY_KEYS = Object.freeze([
  'bank',
  'sourceEvidence',
  'sourceLinkage',
  'englishBaseline',
  'styleContract',
]);

export function isDailyPhraseManifestTarget(value) {
  return TARGET_SET.has(value);
}

export function defaultDailyPhrasePriorAcceptedPaths(studyTarget) {
  if (!isDailyPhraseManifestTarget(studyTarget)) {
    throw new Error(`Unsupported Daily Phrase studyTarget: ${studyTarget}`);
  }
  const sourceEvidenceName = studyTarget === 'es'
    ? 'cvc-source-ledger.json'
    : 'authoritative-source-ledger.json';
  return Object.freeze({
    bank: `content/daily-phrases/${studyTarget}/source-bank.json`,
    sourceEvidence: `content/daily-phrases/${studyTarget}/${sourceEvidenceName}`,
    sourceLinkage: `content/daily-phrases/${studyTarget}/source-ledger.json`,
    englishBaseline: 'admin/daily_phrases_seed.json',
    styleContract: 'content/daily-phrases/quality/STYLE_CONTRACT.md',
  });
}

function safeRepoRelativePath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  if (path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/u.test(raw) || raw.startsWith('/') || raw.startsWith('\\')) {
    return null;
  }
  const normalized = path.posix.normalize(raw.replace(/\\/gu, '/'));
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  return normalized;
}

export function assertDailyPhraseAuthorityPaths(paths, studyTarget) {
  const expected = defaultDailyPhrasePriorAcceptedPaths(studyTarget);
  for (const key of AUTHORITY_KEYS) {
    const actual = safeRepoRelativePath(paths?.[key]);
    if (actual !== expected[key] || paths?.[key] !== expected[key]) {
      throw new Error(`Noncanonical ${studyTarget} authority path for ${key}`);
    }
  }
  return expected;
}

export function assertDailyPhraseAuthoringPacketPath(packetPath, studyTarget, rowIds) {
  const normalized = safeRepoRelativePath(packetPath);
  const expectedPattern = new RegExp(
    `^content/daily-phrases/${studyTarget}/authoring/${studyTarget}-(\\d{3})-(\\d{3})\\.json$`,
    'u',
  );
  const match = (normalized ?? '').match(expectedPattern);
  if (normalized !== packetPath || !match) {
    throw new Error(`Invalid ${studyTarget} authoring packet path: ${String(packetPath ?? '')}`);
  }
  const firstOrder = Number(match[1]);
  const lastOrder = Number(match[2]);
  const rangeSize = lastOrder - firstOrder + 1;
  if (!Number.isInteger(rangeSize) || rangeSize < 1 || rangeSize > 10) {
    throw new Error(`Authoring packet range must contain 1-10 rows: ${packetPath}`);
  }
  if (rowIds !== undefined) {
    const ids = Array.isArray(rowIds) ? rowIds : [];
    const expectedIds = Array.from(
      { length: rangeSize },
      (_, index) => `${studyTarget}-${String(firstOrder + index).padStart(3, '0')}`,
    );
    let exactRange = ids.length === expectedIds.length;
    for (let index = 0; exactRange && index < expectedIds.length; index += 1) {
      const value = ids[index];
      exactRange = Object.prototype.hasOwnProperty.call(ids, index)
        && typeof value === 'string'
        && value.trim() === value
        && value === expectedIds[index];
    }
    if (!exactRange) {
      throw new Error(`Authoring packet path requires exact contiguous row ids: ${packetPath}`);
    }
  }
  return normalized;
}

export function collectDailyPhraseManifestArtifactPaths(manifest) {
  const studyTarget = String(manifest?.studyTarget ?? '').trim();
  if (!isDailyPhraseManifestTarget(studyTarget)) {
    throw new Error(`Unsupported Daily Phrase studyTarget: ${studyTarget}`);
  }
  const authorityRecords = manifest?.authorityArtifacts ?? {};
  const authorityPaths = Object.fromEntries(
    AUTHORITY_KEYS.map((key) => [key, authorityRecords?.[key]?.path]),
  );
  assertDailyPhraseAuthorityPaths(authorityPaths, studyTarget);
  const packetPaths = (Array.isArray(manifest?.authoringPackets) ? manifest.authoringPackets : [])
    .map((record) => assertDailyPhraseAuthoringPacketPath(record?.path, studyTarget, record?.rowIds));
  return [...Object.values(defaultDailyPhrasePriorAcceptedPaths(studyTarget)), ...packetPaths];
}
