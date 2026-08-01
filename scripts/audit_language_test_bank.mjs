import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const LANGUAGES = ['en', 'de', 'fr', 'it', 'es'];
export const REVIEW_FIELDS = ['accuracy', 'levelFit', 'singleAnswer', 'distractorExclusivity', 'naturalness', 'originality', 'ruInstructionAccuracy', 'enInstructionAccuracy'];
const QUOTAS = { A1: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, A2: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 }, B1: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, B2: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 }, C1: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 }, C2: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 } };
const ARTICLES = { de: new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'eines']), fr: new Set(['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'd', 'l']), it: new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una']), es: new Set(['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas']) };
const CYRILLIC = /[\u0400-\u04ff]/u;
const SENTENCES = /[.!?](?:\s|$)/gu;
const RESERVED = new Set(['item', 'question', 'sentence', 'blank', 'option', 'choice', 'alpha', 'beta', 'gamma']);
const plain = (value) => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/gu, ' ');
export const sha256Raw = (raw) => createHash('sha256').update(raw).digest('hex');
export const questionSha256 = (item) => sha256Raw(JSON.stringify(item));
const words = (value, language, dropArticles = false) => plain(value).split(' ').filter((word) => word && (!dropArticles || !ARTICLES[language]?.has(word)));
const normalized = (value, language) => words(value, language, true).join(' ');
const meaningfulWords = (value, language) => words(value, language).filter((word) => word.length > 2 && !RESERVED.has(word));
const jaccard = (left, right, language) => { const a = new Set(words(left, language)); const b = new Set(words(right, language)); const union = new Set([...a, ...b]); return union.size ? [...a].filter((word) => b.has(word)).length / union.size : 0; };
const fingerprint = (item, language) => plain(String(item.stimulus || '').replace(/\b\d+\b/gu, '#').replace(/\b(?:[A-Z][a-z]{2,}|[A-Z]{2,})\b/gu, '@')).replace(/\b(?:der|die|das|le|la|les|il|lo|los|las|el)\b/gu, '').replace(/\s+/gu, ' ').trim();
const hasLeak = (instruction, answer, language) => { const answerTokens = words(answer, language); const accented = new Set((String(answer || '').match(/\p{L}+/gu) || []).filter((token) => /[^\x00-\x7f]/u.test(token)).map(plain)); const meaningful = answerTokens.filter((token) => token.length > 2 || accented.has(token)); if (!meaningful.length) return false; const haystack = new Set(words(instruction, language)); return meaningful.every((token) => haystack.has(token)); };
const sentenceDepth = (item, language) => String(item.stimulus || '').split(/[.!?]+/u).filter((sentence) => meaningfulWords(sentence, language).length >= 4).length >= 2;
const quoteIn = (quote, stimulus) => String(quote || '').trim().split(/\s+/u).length >= 2 && String(stimulus || '').toLowerCase().includes(String(quote).trim().toLowerCase());
const nontrivialToken = (value, language) => meaningfulWords(value, language).length === 1 ? meaningfulWords(value, language)[0] : '';
const includesToken = (value, token, language) => words(value, language).includes(token);
const linked = (link, quote, answer, explanation, language) => {
  const sourceToken = nontrivialToken(link?.sourceToken, language); const answerToken = nontrivialToken(link?.answerToken, language);
  return Boolean(sourceToken && answerToken && includesToken(quote, sourceToken, language) && includesToken(answer, answerToken, language) && includesToken(explanation, sourceToken, language) && includesToken(explanation, answerToken, language));
};
const groundedAnswer = (item, language) => Array.isArray(item.answerEvidence) && item.answerEvidence.length > 0 && item.answerEvidence.every((proof) => proof && quoteIn(proof.quote, item.stimulus) && proof.correctIndex === item.correctIndex && normalized(proof.correctAnswer, language) === normalized(item.options?.[item.correctIndex], language) && Array.isArray(proof.lexicalLinks) && proof.lexicalLinks.length > 0 && typeof proof.linkingExplanation === 'string' && proof.linkingExplanation.trim().length >= 12 && proof.lexicalLinks.some((link) => linked(link, proof.quote, item.options?.[item.correctIndex], proof.linkingExplanation, language)));
const inferential = (item, language) => {
  const proof = item.inferenceEvidence; const answer = item.options?.[item.correctIndex]; const reasoning = proof?.reasoning;
  return Array.isArray(proof?.premises) && proof.premises.length >= 2 && proof.premises.every((premise) => quoteIn(premise, item.stimulus)) && normalized(proof.unstatedConclusion, language) === normalized(answer, language) && normalized(proof.unstatedConclusion, language) && !plain(item.stimulus).includes(normalized(proof.unstatedConclusion, language)) && typeof reasoning?.explanation === 'string' && reasoning.explanation.trim().length >= 12 && Array.isArray(reasoning.premiseLinks) && proof.premises.every((premise, premiseIndex) => reasoning.premiseLinks.some((link) => link?.premiseIndex === premiseIndex && linked({ sourceToken: link.premiseToken, answerToken: link.conclusionToken }, premise, answer, reasoning.explanation, language))) && nontrivialToken(reasoning.conclusionToken, language) && includesToken(answer, nontrivialToken(reasoning.conclusionToken, language), language) && includesToken(reasoning.explanation, nontrivialToken(reasoning.conclusionToken, language), language) && String(proof.whyNotExplicit || '').trim().length >= 12;
};
const EXTERNAL_FACT = /\b(?:atomic\s+number|chemical\s+element|bohrium|who|name|person|architect|painted|designed|born|capital|population|historical\s+fact|invented)\b(?:[\s\S]{0,100}\b(?:18\d{2}|19\d{2}|20\d{2}|is|was|of|the)\b)?|\b(?:18\d{2}|19\d{2}|20\d{2})\b[\s\S]{0,100}\b(?:who|name|person|architect|painted|designed|born|capital|population|historical\s+fact|invented)\b/iu;
const ASSESSMENT = { grammar: ['target-language-form'], vocabulary: ['target-language-lexis'], reading: ['textual-information', 'discourse-inference'], pragmatics: ['pragmatic-intent', 'discourse-inference'] };
const DESCRIPTOR_REF = /^CEFR-2020-(?:A1|A2|B1|B2|C1|C2)-(?:reception|pragmatics|language-competence)$/u;
const ASSESSED_DESCRIPTOR_REF = /^CEFR-2020-(?:A1|A2|B1|B2|C1|C2)-(?:reception|pragmatics)$/u;
const requiredReview = (review, incorrectIndexes) => REVIEW_FIELDS.every((field) => review?.[field] === 'pass') && review?.reviewStatus === 'reviewed' && ['authoringPass', 'adversarialPass', 'deterministicPass', 'levelCoveragePass'].every((field) => review?.[field] === 'pass') && incorrectIndexes.length === 3 && Object.keys(review?.rationales || {}).length === 3 && incorrectIndexes.every((index) => typeof review?.rationales?.[index] === 'string' && review.rationales[index].trim());

export function auditSeparateReview({ sourceRaw, questions, review, language, level }) {
  const errors = [];
  if (!review || review.language !== language || review.level !== level || review.sourceSha256 !== sha256Raw(sourceRaw)) errors.push(`${level}: stale review hash/language/level`);
  const ids = new Set((questions || []).map((item) => item.id)); const entries = Array.isArray(review?.reviews) ? review.reviews : [];
  const reviewIds = new Set(entries.map((entry) => entry?.id));
  if (entries.length !== ids.size || reviewIds.size !== entries.length || reviewIds.size !== ids.size || [...ids].some((id) => !reviewIds.has(id))) errors.push(`${level}: review IDs must be exactly one per question`);
  const byId = new Map((questions || []).map((item) => [item.id, item]));
  for (const entry of entries) { const item = byId.get(entry?.id); const incorrect = item ? [0, 1, 2, 3].filter((index) => index !== item.correctIndex) : []; const failed = REVIEW_FIELDS.filter((field) => entry?.[field] !== 'pass'); if (!item || entry.language !== language || entry.level !== level || !requiredReview(entry, incorrect)) errors.push(`${entry?.id || level}: incomplete review evidence${failed.length ? ` (${failed.join(', ')})` : ''}`); }
  return { errors };
}

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
      for (const field of ['construct', 'canDo', 'itemFormat', 'adultContext', 'fairnessRisk', 'constructIrrelevantRisk', 'evidenceLabel', 'selectionEvidenceLabel', 'descriptorEvidenceLabel']) if (typeof item?.[field] !== 'string' || !item[field].trim()) errors.push(`${level}: missing ${field}`);
      if (item?.selectionEvidenceLabel !== 'SYNTHESIS' || item?.descriptorEvidenceLabel !== 'OFFICIAL_STANDARD') errors.push(`${level}: anchor evidence labels`);
      if (!Array.isArray(item?.descriptorRefs) || !item.descriptorRefs.some((ref) => ASSESSED_DESCRIPTOR_REF.test(ref)) || !item.descriptorRefs.every((ref) => DESCRIPTOR_REF.test(ref))) errors.push(`${level}: descriptorRefs must map to CEFR anchor`);
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
      const deep = routed.filter((item) => item.upperBandEvidence === true && sentenceDepth(item, language));
      if (deep.length < 6) errors.push(`${level}: needs six meaningful multi-sentence reading/pragmatics items`);
      if (level === 'C2' && !routed.some((item) => inferential(item) && sentenceDepth(item, language))) errors.push('C2: logical inference must be reading/pragmatics evidence');
    }
    for (const item of items) {
      if (!String(item.id || '').startsWith(`${language}-${level.toLowerCase()}-`)) errors.push(`${item.id || level}: ID prefix/level mismatch`);
      if (ids.has(item.id)) errors.push(`${item.id}: duplicate question ID`); ids.add(item.id);
      if (constructs.has(item.constructId)) errors.push(`${item.id}: duplicate constructId`); constructs.add(item.constructId);
      if (!String(item.constructId || '').startsWith(`${language}-${level.toLowerCase()}-`)) errors.push(`${item.id}: constructId prefix/level mismatch`);
      if (['C1', 'C2'].includes(level) && item.routingEligible !== false && item.upperBandEvidence !== true) errors.push(`${item.id}: routing-eligible upper-band item needs upperBandEvidence`);
      if (['C1', 'C2'].includes(level) && (item.externalKnowledgeRequired !== false || item.answerableFromStimulus !== true)) errors.push(`${item.id}: upper-band item must be answerable from stimulus without external knowledge`);
      if (item.culturalKnowledgeRequired !== false || item.externalKnowledgeRequired !== false || item.triviaRisk !== 'none') errors.push(`${item.id}: cultural/external knowledge and trivia metadata required`);
      if (!Array.isArray(item.descriptorRefs) || !item.descriptorRefs.some((ref) => ASSESSED_DESCRIPTOR_REF.test(ref)) || !item.descriptorRefs.every((ref) => DESCRIPTOR_REF.test(ref))) errors.push(`${item.id}: meaningless descriptorRefs`);
      if (CYRILLIC.test((item.options || []).join(' '))) errors.push(`${item.id}: Russian leakage in target options`);
      const answer = item.options?.[item.correctIndex];
      for (const field of ['instructionRu', 'instructionEn']) if (hasLeak(item[field], answer, language)) errors.push(`${item.id}: ${field} leaks target answer`);
      for (const text of [item.stimulus, ...(item.options || [])]) { const key = normalized(text, language); if (key && materials.has(key)) errors.push(`${item.id}: duplicate material with ${materials.get(key)}`); if (key && reconstructedMaterials.has(key)) errors.push(`${item.id}: reconstructed sentence duplicate with ${reconstructedMaterials.get(key)}`); else if (key) materials.set(key, item.id); }
      if (/_{3,}/u.test(String(item.stimulus || ''))) { const reconstructed = String(item.stimulus).replace(/_{3,}/gu, String(answer || '')); const reconstructedKey = normalized(reconstructed, language); const prior = materials.get(reconstructedKey) || reconstructedMaterials.get(reconstructedKey); if (reconstructedKey && prior && prior !== item.id) errors.push(`${item.id}: reconstructed sentence duplicate with ${prior}`); else if (reconstructedKey) reconstructedMaterials.set(reconstructedKey, item.id); }
      const fp = fingerprint(item, language); const count = (fingerprints.get(fp) || 0) + 1; fingerprints.set(fp, count); if (count > 4) errors.push(`${item.id}: repeated structural fingerprint`);
      if (/\b(?:obscure|trivia|which year|which decree|capital of|architect(?:ed)?|chapel)\b/iu.test(String(item.stimulus || '')) || EXTERNAL_FACT.test(String(item.stimulus || ''))) errors.push(`${item.id}: external-knowledge/obscure-trivia proxy`);
      if (!ASSESSMENT[item.skill]?.includes(item.assessmentBasis) || item.knowledgeTarget !== item.assessmentBasis) errors.push(`${item.id}: invalid assessment basis/knowledge target`);
      if (['reading', 'pragmatics'].includes(item.skill) && (!item.answerableFromStimulus || !groundedAnswer(item, language))) errors.push(`${item.id}: ungrounded answer evidence`);
      if (level === 'C2' && ['reading', 'pragmatics'].includes(item.skill) && item.inferenceEvidence && !inferential(item, language)) errors.push(`${item.id}: ungrounded inference evidence`);
    }
  }
  const projection = (item) => [item.scenario, item.stimulus, ...(item.options || []), item.targetConstruct, item.explanation, item.ambiguityNotes].filter(Boolean).join(' ');
  for (let i = 0; i < questions.length; i += 1) for (let j = 0; j < i; j += 1) if (jaccard(projection(questions[i]), projection(questions[j]), language) > 0.82) errors.push(`${questions[i].id}: excessive assessed-item similarity with ${questions[j].id}`);
  return { errors, warnings, counts: Object.fromEntries(LEVELS.map((level) => [level, questions.filter((item) => item.level === level).length])) };
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const confined = (root, target) => { const rel = relative(root, target); return rel && !rel.startsWith(`..${sep}`) && rel !== '..' && !rel.includes(`..${sep}`); };
const evidence = (file) => ({ file, sha256: sha256Raw(readFileSync(file)), mtimeMs: statSync(file).mtimeMs });
const ANCHOR_LABELS = new Set(['OFFICIAL_STANDARD', 'PRIMARY_EVIDENCE', 'SYNTHESIS', 'PRODUCT_HYPOTHESIS']);
const ANCHOR_HOSTS = new Set(['www.coe.int', 'www.goethe.de', 'www.france-education-international.fr', 'france-education-international.fr', 'cils.unistrasi.it', 'cvc.cervantes.es']);
export function parseAnchors(raw, source = 'references') {
  const anchors = new Map();
  for (const [index, line] of String(raw).split(/\r?\n/u).entries()) {
    if (!line.startsWith('- ')) continue;
    const match = /^- ([^|\s]+) \| ([A-Z_]+) \| (https:\/\/\S+)$/u.exec(line);
    if (!match) throw new Error(`${source}:${index + 1}: invalid anchor row`);
    const [, id, label, url] = match;
    if (!ANCHOR_LABELS.has(label)) throw new Error(`${source}:${index + 1}: unknown evidence label ${label}`);
    if (anchors.has(id)) throw new Error(`${source}:${index + 1}: duplicate anchor ID ${id}`);
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !ANCHOR_HOSTS.has(parsed.host) || parsed.host === 'example.test') throw new Error(`${source}:${index + 1}: non-allowlisted official HTTPS URL`);
    anchors.set(id, { label, url });
  }
  return anchors;
}
export const readAnchors = (file) => parseAnchors(readFileSync(file, 'utf8'), file);
export const validateAnchors = (items, anchors, kind) => {
  const errors = [];
  for (const item of items || []) {
    for (const ref of item.descriptorRefs || []) if (anchors.get(ref)?.label !== 'OFFICIAL_STANDARD') errors.push(`${item.id || item.constructId}: invented or non-standard descriptor anchor ${ref}`);
    for (const ref of item.selectionRefs || []) if (anchors.get(ref)?.label !== 'SYNTHESIS') errors.push(`${item.id || item.constructId}: selection anchor must be SYNTHESIS ${ref}`);
  }
  return errors;
};
export function auditLanguage(root, language, allowDraft = false) {
  const base = join(root, 'content', 'language-tests'); const files = []; const errors = []; const warnings = [];
  const blueprintFile = join(base, 'blueprints', `${language}.json`);
  const referenceFile = join(base, 'references', `${language}.md`); const anchors = existsSync(referenceFile) ? readAnchors(referenceFile) : new Map();
  if (!existsSync(referenceFile) || !anchors.size) errors.push('missing machine-readable references'); else files.push(evidence(referenceFile));
  if (!existsSync(blueprintFile)) errors.push('missing blueprint'); else { const blueprint = readJson(blueprintFile); files.push(evidence(blueprintFile)); errors.push(...auditBlueprint(blueprint).errors); errors.push(...validateAnchors(LEVELS.flatMap((level) => blueprint.levels?.[level]?.items || []), anchors, 'blueprint')); }
  const levels = [];
  for (const level of LEVELS) {
    const source = join(base, 'questions', language, `${level}.json`); const review = join(base, 'reviews', language, `${level}.json`);
    if (!existsSync(source)) { errors.push(`missing source ${level}`); continue; }
    const raw = readFileSync(source); const data = JSON.parse(raw); const sourceSha256 = sha256Raw(raw); files.push(evidence(source));
    if (data.language !== language || !Array.isArray(data.questions)) errors.push(`${level}: source language/questions schema`);
    errors.push(...validateAnchors(data.questions, anchors, 'question'));
    if (!existsSync(review)) { (allowDraft ? warnings : errors).push(`${level}: missing review`); } else { const reviews = readJson(review); files.push(evidence(review)); const result = auditSeparateReview({ sourceRaw: raw, questions: data.questions, review: reviews, language, level }); (allowDraft ? warnings : errors).push(...result.errors); }
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
function parseArgs(args) { const known = new Set(['--all', '--language', '--allow-draft', '--help', '--root']); for (const arg of args) if (!known.has(arg) && !LANGUAGES.includes(arg) && !args.includes('--root')) throw new Error(`unknown argument: ${arg}`); if (args.includes('--all') && args.includes('--language')) throw new Error('use --all or --language, not both'); const language = args.includes('--language') ? args[args.indexOf('--language') + 1] : null; const root = args.includes('--root') ? args[args.indexOf('--root') + 1] : null; if (args.includes('--language') && !LANGUAGES.includes(language)) throw new Error(`unsupported language: ${language || '(missing)'}`); if (args.includes('--root') && (!root || root.startsWith('-'))) throw new Error('missing root'); return { all: args.includes('--all'), language, root, allowDraft: args.includes('--allow-draft'), help: args.includes('--help') }; }
function main() {
  let args; try { args = parseArgs(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; return; }
  if (args.help) { console.log('Usage: node scripts/audit_language_test_bank.mjs [--all|--language en|de|fr|it|es] [--allow-draft]'); return; }
  const scriptRoot = resolve(fileURLToPath(new URL('..', import.meta.url))); const root = args.root ? resolve(args.root) : scriptRoot; const languages = args.all ? LANGUAGES.filter((language) => language !== 'en') : [args.language || 'de']; const stamp = new Date().toISOString().replace(/[:.]/gu, '-'); let failures = 0;
  for (const language of languages) { const result = auditLanguage(root, language, args.allowDraft); const out = resolve(root, '.codex-tmp', 'language-test-audits', `${language}-${stamp}`); if (!confined(root, out)) throw new Error('unsafe report path'); mkdirSync(out, { recursive: true }); const report = { ...result, status: result.errors.length ? 'failed' : 'passed', allowDraft: args.allowDraft }; writeFileSync(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`); const list = (name, values) => values.length ? values.map((value) => `- ${value}`).join('\n') : '- none'; writeFileSync(join(out, 'report.md'), `# ${language} language-test audit\n\nStatus: ${report.status}\n\nCounts: ${JSON.stringify(report.counts)}\n\n## Errors (${report.errors.length})\n${list('errors', report.errors)}\n\n## Warnings (${report.warnings.length})\n${list('warnings', report.warnings)}\n\n## Files\n${report.files.map((file) => `- ${file.file} | ${file.sha256} | ${file.mtimeMs}`).join('\n') || '- none'}\n`); console.log(`${language}: ${report.status} (${report.errors.length} errors, ${report.warnings.length} warnings); report ${out}`); failures += Number(Boolean(result.errors.length)); }
  if (failures) process.exitCode = 1;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
