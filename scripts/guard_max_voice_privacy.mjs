#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORBIDDEN_CONTENT_KEYS = [
  'history',
  'transcript',
  'audio',
  'utterance',
  'userText',
  'assistantText',
  'memoryFact',
  'conversationSummary',
];

function read(relativePath, overrides = {}) {
  if (Object.prototype.hasOwnProperty.call(overrides, relativePath)) return String(overrides[relativePath]);
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function lineAt(source, index) {
  return source.slice(0, Math.max(0, index)).split('\n').length;
}

function callBlocks(source, markers) {
  const blocks = [];
  for (const marker of markers) {
    let cursor = 0;
    while (cursor < source.length) {
      const start = source.indexOf(marker, cursor);
      if (start < 0) break;
      let depth = 0;
      let quote = '';
      let escaped = false;
      let end = start + marker.length;
      for (let index = source.indexOf('(', start); index >= 0 && index < source.length; index += 1) {
        const char = source[index];
        if (quote) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === quote) quote = '';
          continue;
        }
        if (char === '"' || char === "'" || char === '`') {
          quote = char;
          continue;
        }
        if (char === '(') depth += 1;
        if (char === ')') {
          depth -= 1;
          if (depth === 0) {
            end = index + 1;
            break;
          }
        }
      }
      blocks.push({ start, text: source.slice(start, end) });
      cursor = Math.max(end, start + marker.length);
    }
  }
  return blocks;
}

function forbiddenObjectKeys(block) {
  return FORBIDDEN_CONTENT_KEYS.filter((key) => new RegExp(`\\b${key}\\s*:`).test(block));
}

export function runMaxVoicePrivacyGuard({ overrides = {} } = {}) {
  const get = (relativePath) => read(relativePath, overrides);
  const violations = [];
  const durableWriters = [
    'functions/src/max_voice_finalize.ts',
    'functions/src/max_voice_session_end.ts',
    'functions/src/max_voice_memory_controls.ts',
  ];
  for (const relativePath of durableWriters) {
    const source = get(relativePath);
    for (const block of callBlocks(source, ['tx.set(', 'transaction.set(', '.doc().set(', '.add(', '.update('])) {
      for (const key of forbiddenObjectKeys(block.text)) {
        violations.push(`${relativePath}:${lineAt(source, block.start)} durable write contains ${key}`);
      }
    }
  }

  const maxRuntimeFiles = fs.readdirSync(path.join(ROOT, 'functions', 'src'))
    .filter((name) => /^max_voice_.*\.ts$/.test(name) && !name.endsWith('.test.ts'))
    .map((name) => `functions/src/${name}`)
    .concat(fs.readdirSync(path.join(ROOT, 'app'))
      .filter((name) => /^max_.*\.(?:ts|tsx)$/.test(name))
      .map((name) => `app/${name}`));
  for (const relativePath of maxRuntimeFiles) {
    const source = get(relativePath);
    for (const block of callBlocks(source, ['console.log(', 'console.info(', 'console.warn(', 'console.error(', 'trackEvent('])) {
      for (const key of forbiddenObjectKeys(block.text)) {
        violations.push(`${relativePath}:${lineAt(source, block.start)} log/analytics contains ${key}`);
      }
    }
  }

  const maxSafetyPath = 'functions/src/max_voice_safety.ts';
  const maxSafety = get(maxSafetyPath);
  const forbiddenMaxSafetyPatterns = [
    ['generic safety_flags writer', /\brecordSafetyFlag\b/],
    ['safety_flags collection', /collection\(\s*['"]safety_flags['"]\s*\)/],
    ['transcript renderer', /\brenderSafetyTranscript\b/],
    ['two-year retention contract', /\bSAFETY_FLAG_RETENTION_MS\b/],
    ['standalone safety guard collection', /\bmax_voice_safety_guards\b/],
  ];
  for (const [label, pattern] of forbiddenMaxSafetyPatterns) {
    const match = pattern.exec(maxSafety);
    if (match) violations.push(`${maxSafetyPath}:${lineAt(maxSafety, match.index)} uses ${label}`);
  }
  if (!maxSafety.includes('recordMaxVoiceSafetySignal')) {
    violations.push(`${maxSafetyPath} does not use recordMaxVoiceSafetySignal`);
  }
  if (!maxSafety.includes('safetyGuard') || !maxSafety.includes('VOICE_QUOTA_COLLECTION')) {
    violations.push(`${maxSafetyPath} does not keep bounded guard state in account-scoped voice quota`);
  }
  const resolverCall = 'const stableUid = await resolveStableUidForAuth(db, authUid);';
  const resolverTokenCount = maxSafety.match(/\bresolveStableUidForAuth\b/g)?.length ?? 0;
  const callableStart = maxSafety.indexOf('export const maxVoiceSafetyReport');
  const resolverStart = maxSafety.indexOf(resolverCall);
  const quotaOwnershipTail = resolverStart >= 0 ? maxSafety.slice(resolverStart, resolverStart + 500) : '';
  if (resolverTokenCount !== 2
    || resolverStart < callableStart
    || !/reportMaxVoiceSafetySignal\(db,\s*\{[\s\S]*?\bauthUid,\s*\bstableUid,/.test(quotaOwnershipTail)) {
    violations.push(`${maxSafetyPath} stable identity resolver is restricted to quota ownership`);
  }
  for (const block of callBlocks(maxSafety, ['tx.set(quotaRef,', 'tx.update(quotaRef,'])) {
    if (!block.text.includes('safetyGuard')) continue;
    for (const key of ['authUid', 'stableUid', 'sessionId', 'reportId', 'category', 'kind', 'mode', 'note', 'history', 'transcript', 'userText']) {
      if (new RegExp(`\\b${key}\\s*:`).test(block.text)) {
        violations.push(`${maxSafetyPath}:${lineAt(maxSafety, block.start)} safety guard write contains ${key}`);
      }
    }
  }

  const aiSafety = get('functions/src/ai_safety.ts');
  const redactedSignalStart = aiSafety.indexOf('export async function recordMaxVoiceSafetySignal');
  const redactedSignal = redactedSignalStart >= 0 ? aiSafety.slice(redactedSignalStart) : '';
  if (redactedSignalStart < 0) {
    violations.push('functions/src/ai_safety.ts has no recordMaxVoiceSafetySignal');
  } else {
    for (const forbidden of ['admin.firestore', 'stableUid', 'authUid', 'userText', 'history', 'transcript', 'sessionId', 'verdict.matched', 'recordSafetyFlag', 'safety_flags']) {
      if (redactedSignal.includes(forbidden)) {
        violations.push(`functions/src/ai_safety.ts redacted MAX signal contains ${forbidden}`);
      }
    }
  }

  const admin = get('admin/v2/legacy.html');
  for (const collection of ['voice_call_reviews', 'voice_tutor_memory', 'voice_call_quotas']) {
    const index = admin.indexOf(collection);
    if (index >= 0) violations.push(`admin/v2/legacy.html:${lineAt(admin, index)} exposes private ${collection}`);
  }
  if (/MAX[^\n]{0,100}(?:transcript|dialog(?:ue)?|session)\s*(?:search|lookup)/i.test(admin)) {
    violations.push('admin/v2/legacy.html exposes MAX conversation/session search');
  }
  for (const [label, pattern] of [
    ['direct safety_flags collection read', /collection\(\s*db\s*,\s*['"]safety_flags['"]\s*\)/],
    ['User360 direct safety_flags query', /u360Query\(\s*['"]safety_flags['"]/],
    ['Firestore safety_flags fallback', /fetchSafetyFlagsFirestoreFallback/],
  ]) {
    const match = pattern.exec(admin);
    if (match) violations.push(`admin/v2/legacy.html:${lineAt(admin, match.index)} uses ${label}`);
  }
  if (!admin.includes("getAdminListSafetyFlagsCallable()({ handled:'all', identity:uid, limit:60 })")) {
    violations.push('admin/v2/legacy.html User360 does not use server-filtered safety callable');
  }

  const compliance = get('functions/src/admin_compliance.ts');
  if (!compliance.includes('export function isMaxVoiceSafetyFlag')
    || !compliance.includes('if (isMaxVoiceSafetyFlag(row)) return false;')) {
    violations.push('functions/src/admin_compliance.ts can return legacy MAX safety_flags');
  }

  const jarvisDir = path.join(ROOT, 'functions', 'src', 'jarvis');
  const jarvisReaders = fs.readdirSync(jarvisDir)
    .filter((name) => name.endsWith('_firestore_fetcher.ts'))
    .map((name) => get(`functions/src/jarvis/${name}`))
    .join('\n');
  for (const collection of ['voice_call_reviews', 'voice_tutor_memory']) {
    if (new RegExp(`collection\\(\\s*['\"]${collection}['\"]\\s*\\)`).test(jarvisReaders)) {
      violations.push(`functions/src/jarvis/*_firestore_fetcher.ts reads private ${collection}`);
    }
  }

  const deletion = get('functions/src/account_delete.ts');
  for (const collection of ['voice_call_reviews', 'voice_tutor_memory']) {
    if (!deletion.includes(`{ collection: '${collection}', field: 'stableUid', values: 'stable' }`)
      || !deletion.includes(`{ collection: '${collection}', field: 'authUid', values: 'auth' }`)) {
      violations.push(`functions/src/account_delete.ts does not delete ${collection} by both identities`);
    }
  }
  for (const spec of [
    "{ collection: 'safety_flags', field: 'uid', values: 'stable' }",
    "{ collection: 'safety_flags', field: 'authUid', values: 'auth' }",
  ]) {
    if (!deletion.includes(spec)) {
      violations.push(`functions/src/account_delete.ts missing legacy MAX deletion spec: ${spec}`);
    }
  }
  for (const spec of [
    "{ collection: 'voice_call_quotas', field: 'stableUid', values: 'stable' }",
    "{ collection: 'voice_call_quotas', field: 'authUid', values: 'auth' }",
  ]) {
    if (!deletion.includes(spec)) violations.push(`functions/src/account_delete.ts missing quota guard deletion spec: ${spec}`);
  }

  const client = get('app/max_call_session.tsx');
  const safetyCall = callBlocks(client, ['safetyReportCallable('])[0]?.text ?? '';
  for (const key of ['mode', 'note', 'history', 'transcript', 'userText', 'assistantText']) {
    if (new RegExp(`\\b${key}\\s*:`).test(safetyCall)) violations.push(`app/max_call_session.tsx safety payload contains ${key}`);
  }

  for (const [relativePath, requiredSecrets] of [
    ['functions/src/max_voice_safety.ts', ['ADMIN_ALERT_BOT_TOKEN']],
    ['functions/src/max_voice_finalize.ts', ['OPENAI_API_KEY', 'ADMIN_ALERT_BOT_TOKEN']],
    ['functions/src/premium_dialog_review.ts', ['OPENAI_API_KEY', 'ADMIN_ALERT_BOT_TOKEN']],
  ]) {
    const source = get(relativePath);
    const callable = source.slice(source.lastIndexOf('export const '));
    for (const secret of requiredSecrets) {
      if (!new RegExp(`secrets\\s*:\\s*\\[[^\\]]*\\b${secret}\\b[^\\]]*\\]`).test(callable)) {
        violations.push(`${relativePath} callable does not bind ${secret}`);
      }
    }
  }

  const rules = get('firestore.rules');
  if (!/match \/safety_flags\/\{docId\}\s*\{\s*allow read, write: if false;/.test(rules)
    || !rules.includes("collection != 'safety_flags'")) {
    violations.push('firestore.rules permits a direct browser safety_flags path');
  }
  if (rules.includes('match /max_voice_safety_guards/')) {
    violations.push('firestore.rules retains standalone MAX safety guard collection');
  }
  if (!/match \/voice_call_quotas\/\{docId\}\s*\{\s*allow read, write: if false;/.test(rules)
    || !rules.includes("collection != 'voice_call_quotas'")) {
    violations.push('firestore.rules permits direct browser access to voice_call_quotas safety guard state');
  }

  const scrub = get('scripts/scrub_max_voice_safety_flags.mjs');
  for (const field of ['uid', 'authUid', 'userText', 'historyContext', 'transcript', 'sessionId', 'retainUntilMs', 'retentionReason']) {
    if (!scrub.includes(`'${field}'`)) violations.push(`MAX safety scrub does not remove ${field}`);
  }
  if (!scrub.includes("process.argv.includes('--apply')") || !scrub.includes('DRY RUN')) {
    violations.push('MAX safety scrub is not dry-run by default with explicit --apply');
  }

  return { ok: violations.length === 0, violations };
}

const result = runMaxVoicePrivacyGuard();
const testOverrides = {};
if (process.env.NODE_ENV === 'test' && process.argv.includes('--inject-admin-direct-read')) {
  testOverrides['admin/v2/legacy.html'] = `${read('admin/v2/legacy.html')}\ncollection(db, 'safety_flags')`;
}
if (process.env.NODE_ENV === 'test' && process.argv.includes('--inject-safety-resolver-misuse')) {
  testOverrides['functions/src/max_voice_safety.ts'] = `${read('functions/src/max_voice_safety.ts')}\nconst injectedStableUid = await resolveStableUidForAuth(db, authUid);`;
}
if (process.env.NODE_ENV === 'test' && process.argv.includes('--inject-safety-guard-raw-kind')) {
  testOverrides['functions/src/max_voice_safety.ts'] = `${read('functions/src/max_voice_safety.ts')}\ntx.update(quotaRef, { safetyGuard: { kind: 'harassment' } });`;
}
const injected = Object.keys(testOverrides).length > 0
  ? runMaxVoicePrivacyGuard({ overrides: testOverrides })
  : result;
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(injected)}\n`);
  if (!injected.ok) process.exitCode = 1;
} else if (injected.ok) {
  process.stdout.write('MAX voice privacy guard: PASS\n');
} else {
  process.stderr.write(`MAX voice privacy guard: FAIL\n${injected.violations.map((item) => `- ${item}`).join('\n')}\n`);
  process.exitCode = 1;
}
