const crypto = require('node:crypto');

const MODE = 'exact-home-poll-v2-overlay';
const PROJECT_ID = 'phraseman-ea0b3';
const SHA256_RE = /^[a-f0-9]{64}$/;
const POLL_ANCHOR = '    match /review_promo_claims/{docId} {';
const CATCH_ALL_ANCHOR = "        && collection != 'accounts_v2'\n";
const CATCH_ALL_ADDITION = "        && collection != 'home_polls_v2'\n";
const POLL_BLOCK = [
  '    // Home Polls v2. Text is bundled with the app; clients never need a Firestore',
  '    // read to render. Only admins may inspect aggregate results. Votes and counters',
  '    // are written atomically by homePollV2Vote through Admin SDK. Per-account vote',
  '    // documents contain answered booleans only and are deliberately unreadable.',
  '    match /home_polls_v2/{setId} {',
  '      allow read: if isAdmin();',
  '      allow write: if false;',
  '',
  '      match /votes/{uid} {',
  '        allow read, write: if false;',
  '      }',
  '    }',
  '',
].join('\n');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function isRow(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function occurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function validateExactHomePollV2DeployArgs(args) {
  const expected = ['--apply', '--confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES'];
  return Array.isArray(args)
    && args.length === expected.length
    && new Set(args).size === expected.length
    && expected.every((argument) => args.includes(argument));
}

function buildHomePollV2Overlay(liveSource) {
  if (typeof liveSource !== 'string') throw new Error('live.source');
  const live = liveSource.replace(/\r\n/g, '\n');
  if (occurrences(live, POLL_ANCHOR) !== 1) throw new Error('live.pollAnchor');
  if (occurrences(live, CATCH_ALL_ANCHOR) !== 1) throw new Error('live.catchAllAnchor');
  if (live.includes('match /home_polls_v2/')) throw new Error('live.pollAlreadyPresent');
  if (live.includes("collection != 'home_polls_v2'")) throw new Error('live.catchAllAlreadyPresent');
  return live
    .replace(POLL_ANCHOR, POLL_BLOCK + POLL_ANCHOR)
    .replace(CATCH_ALL_ANCHOR, CATCH_ALL_ANCHOR + CATCH_ALL_ADDITION);
}

function sameTimestamp(left, right) {
  const leftMs = Date.parse(String(left ?? ''));
  const rightMs = Date.parse(String(right ?? ''));
  return Number.isFinite(leftMs) && leftMs === rightMs;
}

function verifyHomePollV2RulesOverlay({
  mode,
  projectId,
  manifest,
  release,
  liveSource,
  candidateOverlaySource,
}) {
  const errors = [];
  if (mode !== MODE) errors.push('mode');
  if (!isRow(manifest) || manifest.schemaVersion !== 1 || manifest.mode !== MODE) errors.push('manifest');
  if (projectId !== PROJECT_ID || manifest?.projectId !== PROJECT_ID || projectId !== manifest?.projectId) errors.push('projectId');
  if (!isRow(release) || release.name !== manifest?.releaseName) errors.push('release.name');
  if (!isRow(release) || release.rulesetName !== manifest?.expectedLiveRulesetName) errors.push('release.rulesetName');
  if (!isRow(release) || !sameTimestamp(release.updateTime, manifest?.expectedLiveReleaseUpdateTime)) errors.push('release.updateTime');
  if (!SHA256_RE.test(String(manifest?.expectedLiveSha256 ?? ''))) errors.push('manifest.expectedLiveSha256');
  if (!SHA256_RE.test(String(manifest?.expectedOverlaySha256 ?? ''))) errors.push('manifest.expectedOverlaySha256');
  if (manifest?.expectedAddedLines !== 13) errors.push('manifest.expectedAddedLines');

  const live = typeof liveSource === 'string' ? liveSource.replace(/\r\n/g, '\n') : '';
  if (sha256(live) !== manifest?.expectedLiveSha256) errors.push('live.sha256');
  let overlaySource;
  try {
    overlaySource = buildHomePollV2Overlay(live);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'overlay.build');
  }
  if (overlaySource) {
    const addedLines = overlaySource.split('\n').length - live.split('\n').length;
    if (addedLines !== 13 || addedLines !== manifest?.expectedAddedLines) errors.push('overlay.addedLines');
    if (sha256(overlaySource) !== manifest?.expectedOverlaySha256) errors.push('overlay.sha256');
    const reconstructed = overlaySource.replace(POLL_BLOCK, '').replace(CATCH_ALL_ADDITION, '');
    if (reconstructed !== live) errors.push('overlay.reversible');
    const candidate = typeof candidateOverlaySource === 'string'
      ? candidateOverlaySource.replace(/\r\n/g, '\n')
      : overlaySource;
    if (candidate !== overlaySource) errors.push('overlay.exact');
    if (sha256(candidate) !== manifest?.expectedOverlaySha256) errors.push('overlay.sha256');
  }
  return { ok: errors.length === 0, errors: [...new Set(errors)], overlaySource };
}

module.exports = {
  MODE,
  PROJECT_ID,
  buildHomePollV2Overlay,
  sha256,
  validateExactHomePollV2DeployArgs,
  verifyHomePollV2RulesOverlay,
};
