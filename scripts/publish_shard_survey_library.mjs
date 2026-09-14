import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const PROJECT_ID = 'phraseman-ea0b3';
const ACTIVE_SURVEY_ID = 'survey_preset_001';
const LIBRARY_SOURCE = 'owner_selected_survey_library_2026_09_12';
const ACTIVATION_PHRASE = 'ACTIVATE_SURVEY_LIBRARY_63';
const ROTATION_ANCHOR_UTC_DAY = '2026-09-12';
const ROTATION_VERSION = 'owner-selected-63-v1';
const CREATED_AT_MS = Date.UTC(2026, 8, 12, 12, 0, 0);
const SURVEY_APP_ROUTES = new Set([
  '/ideas_catalog', '/referrals', '/settings_themes', '/settings_notifications',
  '/(tabs)/home', '/flashcards', '/streak_stats', '/(tabs)/arena', '/club_screen',
  '/lingman_videos', '/support_report', '/flashcards_training_setup?mode=blitz',
  '/achievements_screen',
]);

function readPresetLibrary() {
  const source = readFileSync(new URL('../admin/v2/legacy.html', import.meta.url), 'utf8');
  const match = source.match(/const SHARD_SURVEY_PRESETS =\s*(\[[\s\S]*?\n  \]);\s*\n  const SS_SURVEY_ACTION_ROUTES/);
  if (!match) throw new Error('preset_library_not_found');
  const presets = JSON.parse(match[1]);
  if (!Array.isArray(presets) || presets.length !== 63) throw new Error('preset_library_must_contain_63');
  const ids = presets.map((preset) => Number(preset.id));
  if (new Set(ids).size !== 63) throw new Error('preset_ids_must_be_unique');
  return presets;
}

function prepareAction(action) {
  if (!action) return undefined;
  const cta = { ru: String(action.cta || '').trim() };
  if (!cta.ru) throw new Error('preset_action_cta_required');
  if (action.kind === 'store_review') return { kind: 'store_review', cta };
  if (action.kind === 'app_route') {
    const route = String(action.route || '');
    if (!SURVEY_APP_ROUTES.has(route)) throw new Error('preset_action_route_invalid');
    return { kind: 'app_route', route, cta };
  }
  throw new Error('preset_action_kind_invalid');
}

function buildSurvey(preset, index) {
  const surveyId = `survey_preset_${String(preset.id).padStart(3, '0')}`;
  return {
    surveyId,
    // `enabled` остаётся legacy-флагом и выключен у всей библиотеки: единственный
    // опрос дня выбирается сервером по rotation metadata, без 63 кампаний сразу.
    enabled: false,
    title: { ru: String(preset.question).trim() },
    subtitle: { ru: String(preset.description).trim() },
    rewardShards: 1,
    minDaysBetweenSurveys: 7,
    audience: { tier: 'any', minLessons: null, maxLessons: null, platforms: [] },
    questions: [{
      id: 'q1',
      type: 'single_choice',
      text: { ru: String(preset.question).trim() },
      options: preset.options.map((option, optionIndex) => ({
        id: `opt${optionIndex + 1}`,
        label: { ru: String(option.label).trim() },
        ...(option.action ? { action: prepareAction(option.action) } : {}),
      })),
    }],
    accentColor: '',
    finalScreen: {
      title: { ru: 'Спасибо!' },
      subtitle: { ru: 'Ответ записан. Теперь у нас меньше гаданий на кофейной гуще.' },
    },
    createdAtMs: CREATED_AT_MS + index,
    updatedAtMs: CREATED_AT_MS + index,
    updatedBy: LIBRARY_SOURCE,
    presetId: Number(preset.id),
    librarySource: LIBRARY_SOURCE,
    rotation: {
      enabled: true,
      order: index,
      anchorUtcDay: ROTATION_ANCHOR_UTC_DAY,
      version: ROTATION_VERSION,
    },
  };
}

function publicationPlan() {
  const surveys = readPresetLibrary().map(buildSurvey);
  return {
    projectId: PROJECT_ID,
    total: surveys.length,
    enabledCount: surveys.filter((survey) => survey.enabled).length,
    activeSurveyId: ACTIVE_SURVEY_ID,
    surveys,
  };
}

function firebaseAdmin() {
  const require = createRequire(import.meta.url);
  return require('../functions/node_modules/firebase-admin');
}

function initializeAdmin() {
  const admin = firebaseAdmin();
  const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
  if (serviceAccount.project_id !== PROJECT_ID) throw new Error('service_account_project_mismatch');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
  }
  return admin;
}

async function publish(plan) {
  const admin = initializeAdmin();
  const db = admin.firestore();
  const surveyIds = new Set(plan.surveys.map((survey) => survey.surveyId));
  const surveyRefs = plan.surveys.map((survey) => db.collection('shard_surveys').doc(survey.surveyId));
  const nowMs = Date.now();
  let beforeState = null;

  await db.runTransaction(async (tx) => {
    const activeSnap = await tx.get(db.collection('shard_surveys').where('enabled', '==', true));
    const presetSnaps = await tx.getAll(...surveyRefs);
    beforeState = {
      capturedAtMs: nowMs,
      activeDocs: activeSnap.docs.map((doc) => ({
        id: doc.id,
        enabled: doc.data()?.enabled === true,
        updatedAtMs: doc.data()?.updatedAtMs ?? null,
        updatedBy: doc.data()?.updatedBy ?? null,
      })),
      presetDocs: presetSnaps.map((snap) => ({
        id: snap.id,
        exists: snap.exists,
        data: snap.exists ? snap.data() : null,
      })),
    };
    for (const doc of activeSnap.docs) {
      tx.set(doc.ref, { enabled: false, updatedAtMs: nowMs, updatedBy: LIBRARY_SOURCE }, { merge: true });
    }
    for (let index = 0; index < plan.surveys.length; index += 1) {
      const survey = plan.surveys[index];
      const existingCreatedAtMs = Number(presetSnaps[index].data()?.createdAtMs) || survey.createdAtMs;
      tx.set(surveyRefs[index], { ...survey, createdAtMs: existingCreatedAtMs, updatedAtMs: nowMs }, { merge: true });
    }
  });

  if (!beforeState) throw new Error('pre_write_checkpoint_missing');
  const checkpointDir = new URL('../.codex-tmp/survey-library-release/', import.meta.url);
  mkdirSync(checkpointDir, { recursive: true });
  const checkpointPath = new URL(`checkpoint-${nowMs}.json`, checkpointDir);
  writeFileSync(checkpointPath, JSON.stringify({ projectId: PROJECT_ID, activeSurveyId: ACTIVE_SURVEY_ID, beforeState }, null, 2));

  try {
    const written = await db.getAll(...surveyRefs);
    const missing = written.filter((snap) => !snap.exists).map((snap) => snap.id);
    const enabled = written.filter((snap) => snap.data()?.enabled === true).map((snap) => snap.id);
    const wrongSource = written.filter((snap) => snap.data()?.librarySource !== LIBRARY_SOURCE).map((snap) => snap.id);
    const wrongRotation = written.filter((snap, index) => {
      const rotation = snap.data()?.rotation;
      return rotation?.enabled !== true
        || rotation?.order !== index
        || rotation?.anchorUtcDay !== ROTATION_ANCHOR_UTC_DAY
        || rotation?.version !== ROTATION_VERSION;
    }).map((snap) => snap.id);
    const activeSnap = await db.collection('shard_surveys').where('enabled', '==', true).get();
    const allActiveIds = activeSnap.docs.map((doc) => doc.id);
    if (missing.length || wrongSource.length || wrongRotation.length || enabled.length !== 0) {
      throw new Error(`post_write_verification_failed:${JSON.stringify({ missing, wrongSource, wrongRotation, enabled })}`);
    }
    if (allActiveIds.length !== 0) {
      throw new Error(`active_survey_invariant_failed:${JSON.stringify(allActiveIds)}`);
    }
  } catch (error) {
    await rollbackPublication(db, beforeState);
    throw new Error(`publication_rolled_back_after_failed_verification:${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    written: surveyIds.size,
    activeSurveyId: ACTIVE_SURVEY_ID,
    disabledPrevious: beforeState.activeDocs.map((doc) => doc.id),
    checkpointPath: checkpointPath.pathname,
  };
}

async function rollbackPublication(db, beforeState) {
  const presetIds = new Set(beforeState.presetDocs.map((doc) => doc.id));
  await db.runTransaction(async (tx) => {
    for (const doc of beforeState.presetDocs) {
      const ref = db.collection('shard_surveys').doc(doc.id);
      if (doc.exists) tx.set(ref, doc.data);
      else tx.delete(ref);
    }
    for (const doc of beforeState.activeDocs) {
      if (presetIds.has(doc.id)) continue;
      tx.set(db.collection('shard_surveys').doc(doc.id), {
        enabled: doc.enabled,
        updatedAtMs: doc.updatedAtMs,
        updatedBy: doc.updatedBy,
      }, { merge: true });
    }
  });
  const restoredActive = await db.collection('shard_surveys').where('enabled', '==', true).get();
  const actual = restoredActive.docs.map((doc) => doc.id).sort();
  const expected = beforeState.activeDocs.filter((doc) => doc.enabled).map((doc) => doc.id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`rollback_verification_failed:${JSON.stringify({ expected, actual })}`);
  }
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isJson = args.includes('--json');
const isExecute = args.includes('--execute');
const projectArg = args[args.indexOf('--project') + 1];
const confirmArg = args[args.indexOf('--confirm') + 1];
const plan = publicationPlan();

if (isDryRun) {
  if (isJson) process.stdout.write(JSON.stringify(plan));
  else console.log(`DRY RUN project=${plan.projectId} surveys=${plan.total} today=${plan.activeSurveyId} legacyEnabled=${plan.enabledCount}`);
} else if (isExecute) {
  if (projectArg !== PROJECT_ID) throw new Error('explicit_project_required');
  if (confirmArg !== ACTIVATION_PHRASE) throw new Error('explicit_confirmation_required');
  const result = await publish(plan);
  console.log(`PUBLISHED project=${PROJECT_ID} surveys=${result.written} today=${result.activeSurveyId} legacyEnabled=0 previousActiveDisabled=${result.disabledPrevious.length} checkpoint=${result.checkpointPath}`);
} else {
  throw new Error('use_--dry-run_or_explicit_--execute');
}
