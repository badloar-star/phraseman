import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const LANGUAGES = ['de', 'fr', 'it', 'es'];
export const REVIEW_FIELDS = ['accuracy', 'levelFit', 'singleAnswer', 'distractorExclusivity', 'naturalness', 'originality', 'ruInstructionAccuracy', 'enInstructionAccuracy'];
const QUOTAS = { A1: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, A2: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, B1: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, B2: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, C1: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 }, C2: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 } };
const cyrillic = /[\u0400-\u04ff]/u;
const normalize = (value) => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().replace(/\b(the|a|an|der|die|das|le|la|les|un|une|il|lo|los|las|el)\b/gu, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
const fingerprint = (value) => normalize(value);
const jaccard = (a, b) => { const left = new Set(normalize(a).split(' ').filter(Boolean)); const right = new Set(normalize(b).split(' ').filter(Boolean)); const union = new Set([...left, ...right]); return union.size ? [...left].filter((word) => right.has(word)).length / union.size : 0; };
export const questionSha256 = (item) => {
  const { review, ...reviewedContent } = item;
  return createHash('sha256').update(JSON.stringify(reviewedContent)).digest('hex');
};

export function auditBlueprint(blueprint) {
  const errors = [];
  if (!blueprint || !LANGUAGES.includes(blueprint.language)) errors.push('unsupported blueprint language');
  if (blueprint?.quotaEvidence !== 'PRODUCT_HYPOTHESIS') errors.push('quotas must be PRODUCT_HYPOTHESIS');
  if (blueprint?.descriptorEvidence !== 'OFFICIAL_STANDARD') errors.push('descriptors must be OFFICIAL_STANDARD');
  for (const level of LEVELS) {
    const plan = blueprint?.levels?.[level]; const quotas = QUOTAS[level];
    if (!plan) { errors.push(`${level}: missing plan`); continue; }
    const ids = Object.values(plan.constructs || {}).flat();
    if (ids.length !== 40 || new Set(ids).size !== 40 || ids.some((id) => !/[a-z][a-z0-9-]{3,}/i.test(id))) errors.push(`${level}: requires 40 distinct named constructs`);
    for (const [skill, count] of Object.entries(quotas)) if ((plan.constructs?.[skill] || []).length !== count) errors.push(`${level}: ${skill} quota`);
    if (!Array.isArray(plan.descriptorRefs) || !plan.descriptorRefs.length || !plan.canDo || !plan.itemFormat || !plan.context || !plan.fairnessRisks) errors.push(`${level}: missing authoring trace`);
    if (['C1', 'C2'].includes(level) && (!plan.upperBandEvidence || plan.multiSentenceReadingPragmatics < 6 || (level === 'C2' && !plan.logicalInference))) errors.push(`${level}: upper-band evidence plan incomplete`);
  }
  return { errors };
}

export function auditQuestionBank(bank) {
  const errors = [];
  const questions = bank?.questions || [];
  for (const level of LEVELS) {
    const items = questions.filter((item) => item.level === level); const ids = new Set(items.map((item) => item.constructId));
    if (items.length !== 40) errors.push(`${level}: requires 40 questions`);
    if (ids.size !== 40) errors.push(`${level}: requires 40 distinct constructId values`);
    for (const [skill, count] of Object.entries(QUOTAS[level])) if (items.filter((item) => item.skill === skill).length !== count) errors.push(`${level}: ${skill} quota`);
    if (['C1', 'C2'].includes(level)) {
      if (items.some((item) => !item.upperBandEvidence)) errors.push(`${level}: routed item lacks upperBandEvidence`);
      if (items.filter((item) => ['reading', 'pragmatics'].includes(item.skill) && (item.stimulus.match(/[.!?](?:\s|$)/gu) || []).length >= 2).length < 6) errors.push(`${level}: needs six multi-sentence reading/pragmatics items`);
      if (level === 'C2' && !items.some((item) => item.logicalInference)) errors.push('C2: needs logical inference');
    }
  }
  const seen = new Map(); const fingerprints = new Map();
  for (const item of questions) {
    if (!item.constructId || !Array.isArray(item.descriptorRefs) || !item.descriptorRefs.length) errors.push(`${item.id}: missing construct trace`);
    if (!item.review || REVIEW_FIELDS.some((field) => item.review[field] !== 'pass') || item.review.sha256 !== questionSha256(item)) errors.push(`${item.id}: incomplete or unbound review`);
    if (cyrillic.test((item.options || []).join(' '))) errors.push(`${item.id}: Russian leakage in target options`);
    if (normalize(item.instructionRu).includes(normalize(item.options?.[item.correctIndex]))) errors.push(`${item.id}: target answer leaks into service instruction`);
    for (const text of [item.stimulus, ...(item.options || [])]) { const key = normalize(text); if (seen.has(key)) errors.push(`${item.id}: duplicate material with ${seen.get(key)}`); else seen.set(key, item.id); }
    const fp = fingerprint(item.stimulus); const same = (fingerprints.get(fp) || 0) + 1; fingerprints.set(fp, same); if (same > 4) errors.push(`${item.id}: repeated structural fingerprint`);
  }
  for (let i = 0; i < questions.length; i += 1) for (let j = 0; j < i; j += 1) if (jaccard(questions[i].stimulus, questions[j].stimulus) > 0.82) errors.push(`${questions[i].id}: excessive stimulus similarity with ${questions[j].id}`);
  return { errors, counts: Object.fromEntries(LEVELS.map((level) => [level, questions.filter((item) => item.level === level).length])) };
}

function main() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  if (process.argv.includes('--help')) { console.log('Usage: node scripts/audit_language_test_bank.mjs [--all|--language de]'); return; }
  const requested = process.argv.includes('--all') ? LANGUAGES : [process.argv[process.argv.indexOf('--language') + 1] || 'de'];
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-'); let failed = false;
  for (const language of requested) {
    const source = join(root, 'content', 'language-tests', 'questions', language);
    const out = join(root, '.codex-tmp', 'language-test-audits', `${language}-${stamp}`); mkdirSync(out, { recursive: true });
    const missing = LEVELS.filter((level) => !existsSync(join(source, `${level}.json`)));
    const questions = missing.length ? [] : LEVELS.flatMap((level) => JSON.parse(readFileSync(join(source, `${level}.json`), 'utf8')).questions || []);
    const result = missing.length ? null : auditQuestionBank({ language, questions });
    const report = { language, source, missingSources: missing, status: missing.length ? 'missing-source' : result.errors.length ? 'failed' : 'passed', counts: result?.counts, errors: result?.errors };
    writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); writeFileSync(join(out, 'report.md'), `# ${language} language-test audit\n\nStatus: ${report.status}\n\nMissing: ${missing.join(', ') || 'none'}\n`);
    console.log(`${language}: ${report.status}${missing.length ? ` (${missing.join(', ')})` : result.errors.length ? ` (${result.errors.length} errors)` : ''}; report ${out}`);
    failed ||= missing.length > 0 || Boolean(result?.errors.length);
  }
  if (failed) process.exitCode = 1;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
