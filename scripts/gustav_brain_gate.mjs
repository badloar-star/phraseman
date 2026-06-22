#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = process.cwd();
const DOC_ROOT = path.join(ROOT, 'docs', 'gustav');

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function pathExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function gitStatusShort() {
  try {
    return execFileSync('git', ['status', '--short'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trimEnd();
  } catch {
    return '';
  }
}

function makeCheck(input) {
  return {
    severity: 'blocker',
    blocks: ['generation'],
    status: 'PASS',
    evidence: [],
    requiredBeforeGeneration: [],
    ...input,
  };
}

function requiredDoc(checks, id, title, relativePath, snippets, requiredBeforeGeneration = []) {
  const text = readText(relativePath);
  if (!text) {
    checks.push(makeCheck({
      id,
      title,
      status: 'FAIL',
      evidence: [relativePath],
      detail: `Missing required Gustav contract: ${relativePath}`,
      requiredBeforeGeneration,
    }));
    return;
  }
  const missing = snippets.filter((snippet) => !text.includes(snippet));
  checks.push(makeCheck({
    id,
    title,
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    evidence: [relativePath],
    detail: missing.length === 0
      ? `Required contract exists and contains the expected anchors: ${relativePath}`
      : `Required contract exists, but is missing anchors: ${missing.join(', ')}`,
    requiredBeforeGeneration,
  }));
}

function failIfPattern(checks, id, title, relativePath, patterns, detail, requiredBeforeGeneration) {
  const text = readText(relativePath);
  if (!text) {
    checks.push(makeCheck({
      id,
      title,
      status: 'FAIL',
      evidence: [relativePath],
      detail: `Cannot audit missing source file: ${relativePath}`,
      requiredBeforeGeneration,
    }));
    return;
  }
  const hits = patterns
    .map((pattern) => typeof pattern === 'string'
      ? (text.includes(pattern) ? pattern : null)
      : (pattern.test(text) ? pattern.toString() : null))
    .filter(Boolean);
  checks.push(makeCheck({
    id,
    title,
    status: hits.length === 0 ? 'PASS' : 'FAIL',
    evidence: [relativePath],
    detail: hits.length === 0
      ? 'No known unsafe pattern found.'
      : `${detail} Known pattern(s): ${hits.join(' | ')}`,
    requiredBeforeGeneration,
  }));
}

function failUnlessAny(checks, id, title, relativePath, tokens, detail, requiredBeforeGeneration) {
  const text = readText(relativePath);
  if (!text) {
    checks.push(makeCheck({
      id,
      title,
      status: 'FAIL',
      evidence: [relativePath],
      detail: `Cannot audit missing source file: ${relativePath}`,
      requiredBeforeGeneration,
    }));
    return;
  }
  const found = tokens.some((token) => text.includes(token));
  checks.push(makeCheck({
    id,
    title,
    status: found ? 'PASS' : 'FAIL',
    evidence: [relativePath],
    detail: found ? 'A language gate marker exists.' : detail,
    requiredBeforeGeneration,
  }));
}

function failUnlessRegex(checks, id, title, relativePath, regex, detail, requiredBeforeGeneration) {
  const text = readText(relativePath);
  if (!text) {
    checks.push(makeCheck({
      id,
      title,
      status: 'FAIL',
      evidence: [relativePath],
      detail: `Cannot audit missing source file: ${relativePath}`,
      requiredBeforeGeneration,
    }));
    return;
  }
  checks.push(makeCheck({
    id,
    title,
    status: regex.test(text) ? 'PASS' : 'FAIL',
    evidence: [relativePath],
    detail: regex.test(text) ? 'Required source marker exists.' : detail,
    requiredBeforeGeneration,
  }));
}

function buildChecks() {
  const checks = [];

  requiredDoc(
    checks,
    'BRN-DOC-001',
    'Brain contract exists',
    'docs/gustav/GUSTAV_BRAIN.md',
    ['Required brain cycle before generation', 'Gate before cache and live return', 'Known current blockers'],
    ['Create and maintain GUSTAV_BRAIN.md as the required pre-generation brain contract.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-002',
    'Prompt porting contract exists',
    'docs/gustav/GUSTAV_AI_PROMPT_PORTING_CONTRACT.md',
    ['Prompt pack manifest', 'Wrong-language examples required', 'Return contract'],
    ['Create prompt-porting requirements for every AI prompt family before target content generation.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-003',
    'Admin target sync contract exists',
    'docs/gustav/GUSTAV_ADMIN_TARGET_SYNC_CONTRACT.md',
    ['Required admin map', 'Admin language boundary', 'Blockers'],
    ['Map admin/tester/import/export paths before content generation or apply.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-004',
    'Brain to 100% plan exists',
    'docs/gustav/GUSTAV_BRAIN_TO_100_PLAN.md',
    ['Phase A - Shared AI language contract', 'Phase C - Gate new AI surfaces before cache/return', 'Order of work'],
    ['Keep the implementation order explicit before content generation.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-005',
    'Target language architecture contract exists',
    'docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md',
    ['sourceLocale', 'studyTarget', 'Content container contract'],
    ['Keep source/interface language separate from study target.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-006',
    'Run isolation and apply gate contracts exist',
    'docs/gustav/GUSTAV_RUN_ISOLATION_PROTOCOL.md',
    ['Every Gustav run must be isolated', 'Only `apply` may touch product files'],
    ['Keep generation artifacts isolated under docs/gustav/runs/<runId>.'],
  );

  requiredDoc(
    checks,
    'BRN-DOC-007',
    'Apply gate exists',
    'docs/gustav/GUSTAV_APPLY_GATE.md',
    ['Apply prerequisites', 'Dirty worktree rule', 'Hard fail rules'],
    ['Require explicit apply approval before production writes.'],
  );

  requiredDoc(
    checks,
    'BRN-AUDIT-001',
    'AI language-boundary audit baseline exists',
    'docs/gustav/GUSTAV_ALGORITHM_AUDIT_181.md',
    ['Production AI language boundary audit', 'Current readiness estimate for AI language-boundary safety'],
    ['Keep the AI language-boundary audit baseline available until its blockers are closed.'],
  );

  failIfPattern(
    checks,
    'AI-LIVE-REJECT-001',
    'Phrase explanation must not return judge-rejected generated text',
    'functions/src/explain_phrase.ts',
    ['verdict gates shared cache only', /text:\s*sanitized/, /status:\s*verdict\.ok\s*\?\s*'ok'\s*:\s*'rejected'/],
    'Phrase explanation still appears to allow rejected fresh generated text to reach live response.',
    ['Change rejected phrase explanation responses to safe fallback/unavailable and update tests.'],
  );

  failIfPattern(
    checks,
    'AI-LIVE-REJECT-002',
    'Choice explanation must not return judge-rejected generated text',
    'functions/src/explain_choice.ts',
    ['live caller receives generated output', /status:\s*verdict\.ok\s*\?\s*'ok'\s*:\s*'rejected'/],
    'Choice explanation still appears to return parsed generated output with rejected status.',
    ['Change rejected choice explanation responses to empty/safe payload and update tests.'],
  );

  failIfPattern(
    checks,
    'AI-LIVE-REJECT-003',
    'Quiz explanation must not return judge-rejected generated text',
    'functions/src/explain_quiz.ts',
    ['live caller receives generated output', /status:\s*verdict\.ok\s*\?\s*'ok'\s*:\s*'rejected'/],
    'Quiz explanation still appears to return parsed generated output with rejected status.',
    ['Change rejected quiz explanation responses to empty/safe payload and update tests.'],
  );

  failIfPattern(
    checks,
    'AI-LIVE-REJECT-004',
    'Compass must not return judge-rejected generated text',
    'functions/src/compass.ts',
    [/status:\s*verdict\.ok\s*\?\s*'ok'\s*:\s*'rejected'/],
    'Compass still appears to return generated comment with rejected status.',
    ['Change rejected compass response to safe fallback/unavailable and update tests.'],
  );

  failUnlessAny(
    checks,
    'AI-GATE-001',
    'mistake_explain must have output language gate markers',
    'functions/src/mistake_explain.ts',
    ['assertAiOutputLanguage', 'judgeMistakeExplanation', 'languageContractVersion'],
    'mistake_explain has no visible shared language gate/judge/contract-version marker before cache and live return.',
    ['Gate full and eli5 mistake explanations independently before cache and live return.'],
  );

  failUnlessAny(
    checks,
    'AI-GATE-002',
    'premium dialog translation must have output language gate markers',
    'functions/src/premium_dialog.ts',
    ['assertAiOutputLanguage', 'languageContractVersion', 'resolveAiOutputLang'],
    'premium dialog translation has no visible shared target-language gate marker.',
    ['Gate premiumDialogTranslate before cache and live return; reject unknown targetLang.'],
  );

  failUnlessAny(
    checks,
    'AI-GATE-003',
    'weekly review must gate visible JSON text fields',
    'functions/src/weekly_review.ts',
    ['assertAiJsonTextFieldsLanguage', 'assertAiOutputLanguage', 'languageContractVersion'],
    'weekly_review parses JSON but has no visible shared language gate marker.',
    ['Gate all visible weekly review text fields before return.'],
  );

  failUnlessAny(
    checks,
    'AI-GATE-004',
    'stats insights must gate visible JSON text fields',
    'functions/src/stats_insights.ts',
    ['assertAiJsonTextFieldsLanguage', 'assertAiOutputLanguage', 'languageContractVersion'],
    'stats_insights parses JSON but has no visible shared language gate marker.',
    ['Gate all visible stats insight text fields before return.'],
  );

  failIfPattern(
    checks,
    'LANG-RESOLVE-001',
    'AI prompt language resolver must preserve exact language codes',
    'functions/src/explain/explain_prompts.ts',
    [/slice\(0,\s*2\)/, /return\s+'ru'/],
    'AI language resolver still appears to collapse regional codes or silently fallback to Russian.',
    ['Replace ad hoc prompt language resolving with strict shared AI language contract.'],
  );

  failUnlessRegex(
    checks,
    'TARGET-RESOLVE-001',
    'studyTarget resolver must preserve French target context',
    'functions/src/mistake_explain.ts',
    /sanitizeStudyTarget[\s\S]*['"]fr['"]/,
    'mistake_explain studyTarget sanitizer does not visibly preserve fr.',
    ['Preserve studyTarget=fr separately from interface language in server AI payloads.'],
  );

  failUnlessRegex(
    checks,
    'CLIENT-CACHE-001',
    'Weekly local cache must be guarded by UI/source language',
    'app/weekly_review_client.ts',
    /getWeeklyReviewState\s*\([^)]*lang/,
    'getWeeklyReviewState does not visibly accept or check current lang, so stale-language cache can be returned.',
    ['Make weekly local cache follow the stats client pattern: return cached text only when stored.lang matches current lang.'],
  );

  const hasDomainRegistry = pathExists('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/algorithm_domain_registry_packet.md');
  checks.push(makeCheck({
    id: 'SURFACE-REGISTRY-001',
    title: 'Expanded algorithm domain registry exists',
    status: hasDomainRegistry ? 'PASS' : 'FAIL',
    evidence: ['docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/algorithm_domain_registry_packet.md'],
    detail: hasDomainRegistry
      ? 'Domain registry packet exists for current app expansion.'
      : 'No expanded domain registry packet found.',
    requiredBeforeGeneration: ['Create or refresh the algorithm domain registry packet before generation.'],
  }));

  const dirtyStatus = gitStatusShort();
  const dirtyLines = dirtyStatus ? dirtyStatus.split(/\r?\n/).filter(Boolean) : [];
  checks.push(makeCheck({
    id: 'WORKTREE-001',
    title: 'Dirty worktree is recorded before generation',
    severity: dirtyLines.length > 0 ? 'warning' : 'info',
    blocks: dirtyLines.length > 0 ? ['apply'] : [],
    status: 'PASS',
    evidence: ['git status --short'],
    detail: dirtyLines.length > 0
      ? `Dirty worktree detected and recorded: ${dirtyLines.length} changed/untracked paths. Apply remains blocked unless overlap is audited.`
      : 'Worktree appears clean.',
    requiredBeforeGeneration: [],
  }));

  return checks;
}

function renderMarkdown(report) {
  const lines = [
    '# GUSTAV Brain Gate Report',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Decision: \`${report.decision}\``,
    `Readiness estimate: ${report.readinessPercent}%`,
    `Study target: \`${report.studyTarget}\``,
    `Source locales: ${report.sourceLocales.map((item) => `\`${item}\``).join(', ')}`,
    '',
    '## Summary',
    '',
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    `- Blocker failures: ${report.summary.blockerFailures}`,
    `- Warning failures: ${report.summary.warningFailures}`,
    `- Generation blocked: ${report.generationBlocked ? 'yes' : 'no'}`,
    `- Apply blocked: ${report.applyBlocked ? 'yes' : 'no'}`,
    '',
    '## Failed Checks',
    '',
  ];

  const failed = report.checks.filter((check) => check.status === 'FAIL');
  if (failed.length === 0) {
    lines.push('No failed checks.');
  } else {
    for (const check of failed) {
      lines.push(`### ${check.id}: ${check.title}`);
      lines.push('');
      lines.push(`Severity: \`${check.severity}\``);
      lines.push(`Blocks: ${check.blocks.map((block) => `\`${block}\``).join(', ') || '`none`'}`);
      lines.push(`Evidence: ${check.evidence.map((entry) => `\`${entry}\``).join(', ')}`);
      lines.push('');
      lines.push(check.detail);
      if (check.requiredBeforeGeneration.length > 0) {
        lines.push('', 'Required before generation:');
        for (const item of check.requiredBeforeGeneration) lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  lines.push('## Passed Checks', '');
  for (const check of report.checks.filter((check) => check.status === 'PASS')) {
    lines.push(`- \`${check.id}\`: ${check.title}`);
  }

  lines.push('', '## Next Work', '');
  if (report.nextWork.length === 0) {
    lines.push('- No required work. Brain gate is clear.');
  } else {
    for (const item of report.nextWork) lines.push(`- ${item}`);
  }

  lines.push('', '## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

function main() {
  const studyTarget = argValue('--study-target', 'fr');
  const sourceLocales = String(argValue('--source-locales', 'ru,uk'))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const writeReport = !process.argv.includes('--no-write');
  const strict = process.argv.includes('--strict');

  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const checks = buildChecks();

  const failed = checks.filter((check) => check.status === 'FAIL');
  const blockerFailures = failed.filter((check) => check.severity === 'blocker');
  const warningFailures = failed.filter((check) => check.severity === 'warning');
  const generationBlocked = blockerFailures.some((check) => check.blocks.includes('generation'));
  const applyBlocked = failed.some((check) => check.blocks.includes('apply'))
    || checks.some((check) => check.id === 'WORKTREE-001' && check.severity === 'warning');

  const rawReadiness = checks.length === 0
    ? 0
    : Math.round((checks.filter((check) => check.status === 'PASS').length / checks.length) * 100);
  const readinessPercent = generationBlocked
    ? Math.min(rawReadiness, 55)
    : failed.length > 0
      ? Math.min(rawReadiness, 85)
      : 100;
  const decision = generationBlocked ? 'BLOCK' : failed.length > 0 ? 'HOLD' : 'PASS';

  const nextWork = [...new Set(
    failed.flatMap((check) => check.requiredBeforeGeneration),
  )];

  const report = {
    schemaVersion: 'gustav-brain-gate-v1',
    generatedAt,
    studyTarget,
    sourceLocales,
    decision,
    readinessPercent,
    generationBlocked,
    applyBlocked,
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.status === 'PASS').length,
      failed: failed.length,
      blockerFailures: blockerFailures.length,
      warningFailures: warningFailures.length,
    },
    checks,
    nextWork,
    notes: [
      'This gate is read-only for production code. It writes only Gustav reports unless --no-write is used.',
      'PASS is required before target-language content generation.',
      'Use --strict in CI to return non-zero on HOLD or BLOCK.',
    ],
  };

  if (writeReport) {
    fs.mkdirSync(DOC_ROOT, { recursive: true });
    const jsonPath = path.join(DOC_ROOT, `GUSTAV_BRAIN_GATE_REPORT_${stamp}.json`);
    const mdPath = path.join(DOC_ROOT, `GUSTAV_BRAIN_GATE_REPORT_${stamp}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(mdPath, renderMarkdown(report), 'utf8');
    report.reportPaths = {
      json: rel(jsonPath),
      markdown: rel(mdPath),
    };
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(`GUSTAV brain gate: ${decision} (${readinessPercent}%)`);
  console.log(`checks=${report.summary.checks} passed=${report.summary.passed} failed=${report.summary.failed}`);
  if (report.reportPaths) {
    console.log(`markdown=${report.reportPaths.markdown}`);
    console.log(`json=${report.reportPaths.json}`);
  }

  if (strict && decision !== 'PASS') process.exit(1);
}

main();
