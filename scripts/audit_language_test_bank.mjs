import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];
export const REVIEW_FIELDS = ['accuracy', 'levelFit', 'singleAnswer', 'distractorExclusivity', 'naturalness', 'originality', 'ruInstructionAccuracy', 'enInstructionAccuracy'];
const QUOTAS = { A1: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, A2: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, B1: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, B2: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, C1: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 }, C2: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 } };
const ARTICLES = { de: new Set(['der', 'die', 'das', 'ein', 'eine']), fr: new Set(['le', 'la', 'les', 'un', 'une']), it: new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una']), es: new Set(['el', 'la', 'los', 'las', 'un', 'una']) };
const CYRILLIC = /[\u0400-\u04ff]/u;
const SENTENCES = /[.!?](?:\s|$)/gu;
const RESERVED = new Set(['item', 'question', 'sentence', 'blank', 'option', 'choice', 'alpha', 'beta', 'gamma']);
const plain = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
export const sha256Raw = (raw) => createHash('sha256').update(raw).digest('hex');
export const questionSha256 = (item) => { const { review, ...content } = item; return sha256Raw(JSON.stringify(content)); };
const words = (value, language, dropArticles = false) => plain(value).split(' ').filter((word) => word && (!dropArticles || !ARTICLES[language]?.has(word)));
const normalized = (value, language) => words(value, language, true).join(' ');
const meaningfulWords = (value, language) => words(value, language).filter((word) => word.length > 2 && !RESERVED.has(word));
const jaccard = (left, right, language) => { const a = new Set(words(left, language)); const b = new Set(words(right, language)); const union = new Set([...a, ...b]); return union.size ? [...a].filter((word) => b.has(word)).length / union.size : 0; };
const fingerprint = (item, language) => plain(String(item.stimulus || '').replace(/\b\d+\b/gu, '#')).replace(/\b(?:der|die|das|le|la|les|il|lo|los|las|el)\b/gu, '').replace(/\s+/gu, ' ').trim();
const hasLeak = (instruction, answer, language) => { const tokens = meaningfulWords(answer, language); if (!tokens.length || tokens.join('').length < 3) return false; const haystack = new Set(words(instruction, language)); return tokens.every((token) => haystack.has(token)); };
const sentenceDepth = (item, language) => (String(item.stimulus || '').match(SENTENCES) || []).length >= 2 && meaningfulWords(item.stimulus, language).length >= 8;
const inferential = (item) => item.logicalInference?.domain === 'reading_pragmatics' && /\b(combin|infer|conclusion|implicit|unstated|together)\b/i.test(String(item.logicalInference?.evidence || ''));
const requiredReview = (review) => REVIEW_FIELDS.every((field) => review?.[field] === 'pass') && review?.reviewStatus === 'reviewed' && ['authoringPass', 'adversarialPass', 'deterministicPass', 'levelCoveragePass'].every((field) => review?.[field] === 'pass') && [1, 2, 3].every((index) => typeof review?.rationales?.[index] === 'string' && review.rationales[index].trim());

export function auditBlueprint(blueprint) {
  const errors = [];
  if (!blueprint || !LANGUAGES.includes(blueprint.language) || blueprint.language === 'en') errors.push('unsupported blueprint language');
  for (const level of LEVELS) {
    const plan = blueprint?.levels?.[level];
    if (!plan) { errors.push(`${level}: missing plan`); continue; }
    if (!Array.isArray(plan.items) || plan.items.length !== 40) { errors.push(`${level}: requires 40 individual construct objects`); continue; }
    const quotas = QUOTAS[level]; const ids = new Set();
    for (const item of plan.items) {
      if (!item || !String(item.constructId || '').startsWith(`${blueprint.language}-${level.toLowerCase()}-`)) errors.push(`${level}: constructId must be ${blueprint.language}-${level.toLowerCase()} prefixed`);
      if (ids.has(item?.constructId)) errors.push(`${level}: duplicate constructId`); ids.add(item?.constructId);
      if (!quotas[item?.skill]) errors.push(`${level}: invalid skill`);
      for (const field of ['construct', 'canDo', 'itemFormat', 'adultContext', 'fairnessRisk', 'constructIrrelevantRisk', 'evidenceLabel']) if (typeof item?.[field] !== 'string' || !item[field].trim()) errors.push(`${level}: missing ${field}`);
      if (!Array.isArray(item?.descriptorRefs) || !item.descriptorRefs.some((ref) => /^CEFR-2020-(?:reception|pragmatics)-[A-Z][0-9]-[\w-]+$/u.test(ref))) errors.push(`${level}: descriptorRefs must map to CEFR anchor`);
    }
    for (const [skill, count] of Object.entries(quotas)) if (plan.items.filter((item) => item.skill === skill).length !== count) errors.push(`${level}: ${skill} quota`);
  }
  return { errors };
}

export function auditQuestionBank(bank, { allowDraft = false } = {}) {
  const errors = []; const warnings = []; const questions = Array.isArray(bank?.questions) ? bank.questions : [];
  const language = bank?.language;
  if (!LANGUAGES.includes(language)) errors.push('unsupported bank language');
  const ids = new Set(); const constructs = new Set(); const materials = new Map(); const reconstructedMaterials = new Map(); const fingerprints = new Map();
  for (const level of LEVELS) {
    const items = questions.filter((item) => item.level === level); const quota = QUOTAS[level];
    if (items.length !== 40) errors.push(`${level}: requires 40 questions`);
    for (const [skill, count] of Object.entries(quota)) if (items.filter((item) => item.skill === skill).length !== count) errors.push(`${level}: ${skill} quota`);
    const routed = items.filter((item) => ['reading', 'pragmatics'].includes(item.skill));
    if (['C1', 'C2'].includes(level)) {
      const deep = routed.filter((item) => item.upperBandEvidence?.route === 'reading_pragmatics' && sentenceDepth(item, language));
      if (deep.length < 6) errors.push(`${level}: needs six meaningful multi-sentence reading/pragmatics items`);
      if (level === 'C2' && !routed.some((item) => inferential(item) && sentenceDepth(item, language))) errors.push('C2: logical inference must be reading/pragmatics evidence');
    }
    for (const item of items) {
      if (!String(item.id || '').startsWith(`${language}-${level.toLowerCase()}-`)) errors.push(`${item.id || level}: ID prefix/level mismatch`);
      if (ids.has(item.id)) errors.push(`${item.id}: duplicate question ID`); ids.add(item.id);
      if (constructs.has(item.constructId)) errors.push(`${item.id}: duplicate constructId`); constructs.add(item.constructId);
      if (!String(item.constructId || '').startsWith(`${language}-${level.toLowerCase()}-`)) errors.push(`${item.id}: constructId prefix/level mismatch`);
      if (!Array.isArray(item.descriptorRefs) || !item.descriptorRefs.some((ref) => /^CEFR-2020-[A-Z][0-9]-(?:reception|pragmatics)-[\w-]+$/u.test(ref))) errors.push(`${item.id}: meaningless descriptorRefs`);
      if (CYRILLIC.test((item.options || []).join(' '))) errors.push(`${item.id}: Russian leakage in target options`);
      const answer = item.options?.[item.correctIndex];
      for (const field of ['instructionRu', 'instructionEn']) if (hasLeak(item[field], answer, language)) errors.push(`${item.id}: ${field} leaks target answer`);
      for (const text of [item.stimulus, ...(item.options || [])]) { const key = normalized(text, language); if (key && materials.has(key)) errors.push(`${item.id}: duplicate material with ${materials.get(key)}`); if (key && reconstructedMaterials.has(key)) errors.push(`${item.id}: reconstructed sentence duplicate with ${reconstructedMaterials.get(key)}`); else if (key) materials.set(key, item.id); }
      if (/_{3,}/u.test(String(item.stimulus || ''))) { const reconstructed = String(item.stimulus).replace(/_{3,}/gu, String(answer || '')); const reconstructedKey = normalized(reconstructed, language); if (reconstructedKey && materials.has(reconstructedKey) && materials.get(reconstructedKey) !== item.id) errors.push(`${item.id}: reconstructed sentence duplicate with ${materials.get(reconstructedKey)}`); else if (reconstructedKey) reconstructedMaterials.set(reconstructedKey, item.id); }
      const fp = fingerprint(item, language); const count = (fingerprints.get(fp) || 0) + 1; fingerprints.set(fp, count); if (count > 4) errors.push(`${item.id}: repeated structural fingerprint`);
      if (/\b(?:obscure|trivia|which year|which decree|capital of)\b/iu.test(String(item.stimulus || ''))) errors.push(`${item.id}: external-knowledge/obscure-trivia proxy`);
      if (['C1', 'C2'].includes(level) && item.logicalInference && !inferential(item)) errors.push(`${item.id}: logical inference must not be grammar-only`);
      const reviewOK = requiredReview(item.review) && item.review?.sha256 === questionSha256(item);
      if (!reviewOK) (allowDraft ? warnings : errors).push(`${item.id}: incomplete or unbound review`);
    }
  }
  for (let i = 0; i < questions.length; i += 1) for (let j = 0; j < i; j += 1) if (jaccard(questions[i].stimulus, questions[j].stimulus, language) > 0.82) errors.push(`${questions[i].id}: excessive stimulus similarity with ${questions[j].id}`);
  return { errors, warnings, counts: Object.fromEntries(LEVELS.map((level) => [level, questions.filter((item) => item.level === level).length])) };
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const confined = (root, target) => { const rel = relative(root, target); return rel && !rel.startsWith(`..${sep}`) && rel !== '..' && !rel.includes(`..${sep}`); };
const evidence = (file) => ({ file, sha256: sha256Raw(readFileSync(file)), mtimeMs: statSync(file).mtimeMs });
function auditLanguage(root, language, allowDraft) {
  const base = join(root, 'content', 'language-tests'); const files = []; const errors = []; const warnings = [];
  const blueprintFile = join(base, 'blueprints', `${language}.json`);
  if (!existsSync(blueprintFile)) errors.push('missing blueprint'); else { files.push(evidence(blueprintFile)); errors.push(...auditBlueprint(readJson(blueprintFile)).errors); }
  const levels = [];
  for (const level of LEVELS) {
    const source = join(base, 'questions', language, `${level}.json`); const review = join(base, 'reviews', language, `${level}.json`);
    if (!existsSync(source)) { errors.push(`missing source ${level}`); continue; }
    const raw = readFileSync(source); const data = JSON.parse(raw); const sourceSha256 = sha256Raw(raw); files.push(evidence(source));
    if (data.language !== language || !Array.isArray(data.questions)) errors.push(`${level}: source language/questions schema`);
    if (!existsSync(review)) { (allowDraft ? warnings : errors).push(`${level}: missing review`); } else { const reviews = readJson(review); files.push(evidence(review)); if (reviews.language !== language || reviews.level !== level || reviews.sourceSha256 !== sourceSha256) errors.push(`${level}: stale review hash/language/level`); if (!Array.isArray(reviews.reviews) || reviews.reviews.length !== data.questions.length || new Set(reviews.reviews.map((entry) => entry.id)).size !== data.questions.length) errors.push(`${level}: review IDs must be exactly one per question`); }
    levels.push(...data.questions);
  }
  if (levels.length) { const result = auditQuestionBank({ language, questions: levels }, { allowDraft }); errors.push(...result.errors); warnings.push(...result.warnings); }
  if (levels.length === 240) {
    const sourceLevels = LEVELS.map((level) => readJson(join(base, 'questions', language, `${level}.json`)));
    const expected = `${JSON.stringify({ schemaVersion: sourceLevels[0].schemaVersion, bankVersion: sourceLevels[0].bankVersion, language, levels: LEVELS, questions: levels }, null, 2)}\n`;
    for (const generated of [join(root, 'knowly-www', 'english-level-test', 'data', `questions.${language}.json`), join(root, 'functions-english-test', 'data', `questions.${language}.json`)]) {
      if (!existsSync(generated)) { (allowDraft ? warnings : errors).push(`missing generated copy ${generated}`); continue; }
      files.push(evidence(generated)); if (readFileSync(generated, 'utf8') !== expected) errors.push(`generated copy differs ${generated}`);
    }
  }
  return { language, errors, warnings, files, counts: Object.fromEntries(LEVELS.map((level) => [level, levels.filter((item) => item.level === level).length])) };
}
function parseArgs(args) { const known = new Set(['--all', '--language', '--allow-draft', '--help']); for (const arg of args) if (!known.has(arg) && !LANGUAGES.includes(arg)) throw new Error(`unknown argument: ${arg}`); if (args.includes('--all') && args.includes('--language')) throw new Error('use --all or --language, not both'); const language = args.includes('--language') ? args[args.indexOf('--language') + 1] : null; if (args.includes('--language') && !LANGUAGES.includes(language)) throw new Error(`unsupported language: ${language || '(missing)'}`); return { all: args.includes('--all'), language, allowDraft: args.includes('--allow-draft'), help: args.includes('--help') }; }
function main() {
  let args; try { args = parseArgs(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; return; }
  if (args.help) { console.log('Usage: node scripts/audit_language_test_bank.mjs [--all|--language en|de|fr|it|es] [--allow-draft]'); return; }
  const root = resolve(fileURLToPath(new URL('..', import.meta.url))); const languages = args.all ? LANGUAGES.filter((language) => language !== 'en') : [args.language || 'de']; const stamp = new Date().toISOString().replace(/[:.]/gu, '-'); let failures = 0;
  for (const language of languages) { const result = auditLanguage(root, language, args.allowDraft); const out = resolve(root, '.codex-tmp', 'language-test-audits', `${language}-${stamp}`); if (!confined(root, out)) throw new Error('unsafe report path'); mkdirSync(out, { recursive: true }); const report = { ...result, status: result.errors.length ? 'failed' : 'passed', allowDraft: args.allowDraft }; writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`); writeFileSync(join(out, 'report.md'), `# ${language} language-test audit\n\nStatus: ${report.status}\n\nErrors: ${report.errors.length}\n\nWarnings: ${report.warnings.length}\n`); console.log(`${language}: ${report.status} (${report.errors.length} errors, ${report.warnings.length} warnings); report ${out}`); failures += Number(Boolean(result.errors.length)); }
  if (failures) process.exitCode = 1;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
