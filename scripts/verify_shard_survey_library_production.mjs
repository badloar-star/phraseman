import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJECT_ID = 'phraseman-ea0b3';
const ACTIVE_SURVEY_ID = 'survey_preset_001';
const LIBRARY_SOURCE = 'owner_selected_survey_library_2026_09_12';
const ROTATION_ANCHOR_UTC_DAY = '2026-09-12';
const ROTATION_VERSION = 'owner-selected-63-v1';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');
const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
if (serviceAccount.project_id !== PROJECT_ID) throw new Error('service_account_project_mismatch');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
const db = admin.firestore();

const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
const idsMatch = source.match(/const SHARD_SURVEY_PRESET_IDS = \[([^\]]+)]/);
if (!idsMatch) throw new Error('preset_ids_not_found');
const ids = idsMatch[1].split(',').map((value) => Number(value.trim()));
const refs = ids.map((id) => db.collection('shard_surveys').doc(`survey_preset_${String(id).padStart(3, '0')}`));
const docs = await db.getAll(...refs);
const active = await db.collection('shard_surveys').where('enabled', '==', true).get();
const missing = docs.filter((doc) => !doc.exists).map((doc) => doc.id);
const wrongSource = docs.filter((doc) => doc.data()?.librarySource !== LIBRARY_SOURCE).map((doc) => doc.id);
const activeIds = active.docs.map((doc) => doc.id).sort();
const malformed = docs.filter((doc) => {
  const data = doc.data();
  return !data || data.rewardShards !== 1 || data.questions?.length !== 1 || data.questions[0]?.options?.length < 2;
}).map((doc) => doc.id);
const wrongRotation = docs.filter((doc, order) => {
  const rotation = doc.data()?.rotation;
  return rotation?.enabled !== true
    || rotation?.order !== order
    || rotation?.anchorUtcDay !== ROTATION_ANCHOR_UTC_DAY
    || rotation?.version !== ROTATION_VERSION;
}).map((doc) => doc.id);

const dayMs = 24 * 60 * 60 * 1000;
const todayStartMs = Math.floor(Date.now() / dayMs) * dayMs;
const anchorMs = Date.parse(`${ROTATION_ANCHOR_UTC_DAY}T00:00:00.000Z`);
const dayOffset = Math.floor((todayStartMs - anchorMs) / dayMs);
const todayIndex = ((dayOffset % refs.length) + refs.length) % refs.length;
const logicalTodaySurveyId = refs[todayIndex].id;

if (missing.length || wrongSource.length || malformed.length || wrongRotation.length) {
  throw new Error(`library_verification_failed:${JSON.stringify({ missing, wrongSource, malformed, wrongRotation })}`);
}
if (activeIds.length !== 0) {
  throw new Error(`active_survey_verification_failed:${JSON.stringify(activeIds)}`);
}
if (dayOffset === 0 && logicalTodaySurveyId !== ACTIVE_SURVEY_ID) throw new Error('rotation_anchor_mismatch');

console.log(JSON.stringify({
  projectId: PROJECT_ID,
  libraryDocs: docs.length,
  legacyEnabledIds: activeIds,
  logicalTodaySurveyId,
  todayIndex,
  missing: 0,
  malformed: 0,
  wrongRotation: 0,
}));
