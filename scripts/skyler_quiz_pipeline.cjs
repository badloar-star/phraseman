#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const ROOM_DIR = path.join(ROOT, 'tools', 'skyler_quiz_agent_room');
const DEFAULT_OUT_ROOT = path.join('docs', 'skyler', 'runs');
const FALLBACK_ACTIVE_INTERFACE_LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const FALLBACK_FRENCH_SOURCE_UI_LOCALES = ['ru', 'uk'];
const TARGETS = ['en', 'fr', 'smartest'];
const MODES = ['discover', 'brief', 'gate'];
const MIN_VALIDATED_SOCIAL_SIGNALS = 2;
const ACTIVE_APP_VISUAL_FAMILIES = ['forest', 'dark', 'neonGreen', 'gold', 'coral', 'minimalDark'];
const SOURCE_PUBLISHER_TYPES = [
  'official_institution',
  'academic_or_university',
  'dictionary_or_academy',
  'expert_edited_reference',
  'primary_authority',
  'educational_publisher',
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseStringArray(text) {
  const out = [];
  const re = /['"]([^'"]+)['"]/g;
  let match = re.exec(text);
  while (match) {
    out.push(match[1]);
    match = re.exec(text);
  }
  return out;
}

function parseExportedConstArray(source, name) {
  const match = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`).exec(source);
  return match ? parseStringArray(match[1]) : [];
}

function loadActiveInterfaceLocaleState() {
  const sourcePath = path.join(ROOT, 'app', 'source_locales.ts');
  const warnings = [];
  try {
    const source = readText(sourcePath);
    const base = parseExportedConstArray(source, 'BASE_SOURCE_LOCALES');
    const heisenberg = parseExportedConstArray(source, 'HEISENBERG_BATCH_SOURCE_LOCALES');
    const locales = unique([...base, ...heisenberg]);
    if (locales.length >= 2) {
      return { locales, source: 'app/source_locales.ts', warnings };
    }
    warnings.push('Could not parse active interface locales from app/source_locales.ts; using fallback.');
  } catch (error) {
    warnings.push(`Could not read app/source_locales.ts: ${error && error.message ? error.message : String(error)}`);
  }
  return { locales: FALLBACK_ACTIVE_INTERFACE_LOCALES, source: 'fallback', warnings };
}

function loadFrenchSourceUiLocaleState() {
  const gatePath = path.join(ROOT, 'app', 'french_content_source_gate.ts');
  const warnings = [];
  try {
    const source = readText(gatePath);
    const match = /sourceLocaleUi:\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(source);
    const locales = match ? unique(parseStringArray(match[1])) : [];
    if (locales.length >= 1) {
      return { locales, source: 'app/french_content_source_gate.ts', warnings };
    }
    warnings.push('Could not parse French source UI locales from app/french_content_source_gate.ts; using fallback.');
  } catch (error) {
    warnings.push(`Could not read app/french_content_source_gate.ts: ${error && error.message ? error.message : String(error)}`);
  }
  return { locales: FALLBACK_FRENCH_SOURCE_UI_LOCALES, source: 'fallback', warnings };
}

const ACTIVE_INTERFACE_LOCALE_STATE = loadActiveInterfaceLocaleState();
const ACTIVE_INTERFACE_LOCALES = ACTIVE_INTERFACE_LOCALE_STATE.locales;
const FRENCH_SOURCE_UI_LOCALE_STATE = loadFrenchSourceUiLocaleState();
const FRENCH_SOURCE_UI_LOCALES = FRENCH_SOURCE_UI_LOCALE_STATE.locales;

const REQUIRED_PROTOCOL_FILES = [
  'README.md',
  'ROOM.md',
  'QUIZ_STYLE_CONTRACT.md',
  'THEMATIC_GENERATION_CHECKLIST.md',
  'templates/category_brief.md',
  'templates/visual_asset_plan.md',
  'templates/quiz_pack.schema.md',
  'prompts/00_SKYLER_ORCHESTRATOR.md',
  'prompts/10_SOCIAL_LISTENING_ANALYST.md',
  'prompts/20_TOPIC_TAXONOMIST.md',
  'prompts/25_VISUAL_ASSET_DIRECTOR.md',
  'prompts/30_SOURCE_LIBRARIAN.md',
  'prompts/40_FACT_CHECKER.md',
  'prompts/50_QUIZ_ARCHITECT.md',
  'prompts/60_ENGLISH_QUIZ_WRITER.md',
  'prompts/70_FRENCH_QUIZ_WRITER.md',
  'prompts/80_SMARTEST_WRITER.md',
  'prompts/90_LOCALE_EDITOR.md',
  'prompts/95_DISTRACTOR_ADVERSARY.md',
  'prompts/99_QA_GATEKEEPER.md',
];

function parseArgs(argv) {
  const args = {
    mode: 'discover',
    target: 'en',
    category: null,
    runId: null,
    outRoot: DEFAULT_OUT_ROOT,
    socialInput: null,
    draft: null,
    checkProtocol: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--check-protocol') args.checkProtocol = true;
    else if (token === '--mode') args.mode = argv[++i];
    else if (token === '--target') args.target = argv[++i];
    else if (token === '--category') args.category = argv[++i];
    else if (token === '--run-id') args.runId = argv[++i];
    else if (token === '--out-root') args.outRoot = argv[++i];
    else if (token === '--social-input') args.socialInput = argv[++i];
    else if (token === '--draft') args.draft = argv[++i];
    else throw new Error(`Unknown argument: ${token}`);
  }

  if (!args.help && !args.checkProtocol) {
    if (!MODES.includes(args.mode)) throw new Error(`Unsupported --mode: ${args.mode}`);
    if (!TARGETS.includes(args.target)) throw new Error(`Unsupported --target: ${args.target}`);
    if (args.mode === 'brief' && !args.category) throw new Error('--category is required for --mode brief');
    if (args.mode === 'gate' && !args.draft) throw new Error('--draft is required for --mode gate');
  }

  return args;
}

function printHelp() {
  console.log(`Skyler quiz pipeline

Usage:
  npm run skyler:quiz:check
  npm run skyler:quiz -- --mode discover --target en
  npm run skyler:quiz -- --mode discover --target smartest --social-input docs/signals.jsonl
  npm run skyler:quiz -- --mode brief --target fr --category travel-micro-decisions
  npm run skyler:quiz -- --mode gate --draft docs/skyler/runs/<run>/drafts/pack.json

Options:
  --mode              discover | brief | gate
  --target            en | fr | smartest
  --category          Category id for brief mode
  --run-id            Stable run id. Default: timestamp-based
  --out-root          Output root. Default: ${DEFAULT_OUT_ROOT}
  --social-input      JSON or JSONL file with public/user-provided pain signals
  --draft             Skyler quiz pack JSON for gate mode
  --check-protocol    Validate local room files and package scripts
`);
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'skyler-category';
}

function ensureDir(abs) {
  fs.mkdirSync(abs, { recursive: true });
}

function writeJson(abs, value) {
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(abs, text) {
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
}

function rel(abs) {
  return path.relative(ROOT, abs).split(path.sep).join('/');
}

function readText(abs) {
  return fs.readFileSync(abs, 'utf8');
}

function parseSocialInput(file) {
  if (!file) return [];
  const abs = path.resolve(ROOT, file);
  const raw = readText(abs).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('--social-input JSON must be an array');
    return parsed.map(normalizeSignal).filter(Boolean);
  }
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizeSignal(JSON.parse(line)))
    .filter(Boolean);
}

function normalizeSignal(value) {
  if (!value || typeof value !== 'object') return null;
  const text = String(value.text || value.body || value.summary || '').trim();
  if (!text) return null;
  return {
    source: String(value.source || value.platform || 'provided').trim(),
    url: value.url ? String(value.url) : '',
    text: text.slice(0, 600),
    tags: Array.isArray(value.tags) ? value.tags.map(String).slice(0, 8) : [],
  };
}

function defaultCandidates(target, signals) {
  const evidenceStatus = countDistinctSocialSignals(signals) >= MIN_VALIDATED_SOCIAL_SIGNALS ? 'ready' : 'needs_sources';
  if (target === 'fr') {
    return [
      {
        categoryId: 'french-social-micro-phrases',
        title: 'French social micro-phrases',
        learnerPain: 'Students know vocabulary but freeze on short polite moves.',
        curiosityHook: 'Tiny French phrases can change the whole social tone.',
        firstPackShape: '12 MCQ items, A1-A2, polite requests, repair, thanks.',
        sourceNeeds: ['FLE politeness reference', 'dictionary usage notes'],
        status: evidenceStatus,
      },
      {
        categoryId: 'french-false-friends-survival',
        title: 'French false friends survival',
        learnerPain: 'Learners trust familiar-looking words and pick the wrong meaning.',
        curiosityHook: 'Words that look friendly sometimes trick you hardest.',
        firstPackShape: '12 MCQ items, A2-B1, meaning contrasts and mini-contexts.',
        sourceNeeds: ['Larousse/CNRTL entries', 'FLE false-friend reference'],
        status: evidenceStatus,
      },
      {
        categoryId: 'french-everyday-pronoun-traps',
        title: 'Everyday French pronoun traps',
        learnerPain: 'Students confuse short pronoun forms in common sentences.',
        curiosityHook: 'One tiny pronoun can flip who does what to whom.',
        firstPackShape: '10 MCQ items, A2-B1, me/te/lui/leur/en/y in daily context.',
        sourceNeeds: ['FLE pronoun grammar', 'official dictionary examples'],
        status: evidenceStatus,
      },
    ];
  }

  if (target === 'smartest') {
    return [
      {
        categoryId: 'everyday-systems-hidden-logic',
        title: 'Hidden logic of everyday systems',
        learnerPain: 'People enjoy facts that explain things they see daily.',
        curiosityHook: 'Small systems feel smarter once you know the reason.',
        firstPackShape: '12 MCQ items, durable facts, one source-backed insight each.',
        sourceNeeds: ['official institution pages', 'museum/science/government references'],
        status: evidenceStatus,
      },
      {
        categoryId: 'word-origins-that-change-memory',
        title: 'Word origins that change memory',
        learnerPain: 'Learners remember words better when they know a surprising origin.',
        curiosityHook: 'Etymology turns memorization into a small story.',
        firstPackShape: '12 MCQ items, language facts, stable etymology sources.',
        sourceNeeds: ['dictionary etymology entries', 'academic language references'],
        status: evidenceStatus,
      },
      {
        categoryId: 'science-myths-students-repeat',
        title: 'Science myths students repeat',
        learnerPain: 'Common school-level facts are often half-remembered or distorted.',
        curiosityHook: 'Correcting a tiny myth feels instantly rewarding.',
        firstPackShape: '10 MCQ items, stable science facts, myth vs fact format.',
        sourceNeeds: ['NASA/NOAA/NIH or university sources', 'science museum references'],
        status: evidenceStatus,
      },
    ];
  }

  return [
    {
      categoryId: 'conversation-repair',
      title: 'Conversation repair moves',
      learnerPain: 'Students do not know how to ask again, soften, or recover mid-talk.',
      curiosityHook: 'A few repair phrases make real conversation feel possible.',
      firstPackShape: '12 MCQ items, A1-B1, repeat/clarify/soften/fix misunderstandings.',
      sourceNeeds: ['ELT conversation reference', 'dictionary usage examples'],
      status: evidenceStatus,
    },
    {
      categoryId: 'polite-but-not-weird',
      title: 'Polite but not weird',
      learnerPain: 'Learners overuse direct translations and sound too blunt or too formal.',
      curiosityHook: 'Politeness is a hidden grammar of social comfort.',
      firstPackShape: '12 MCQ items, A2-B1, requests, refusals, offers, thanks.',
      sourceNeeds: ['Cambridge/Oxford usage examples', 'ELT pragmatics notes'],
      status: evidenceStatus,
    },
    {
      categoryId: 'tiny-prepositions-big-meaning',
      title: 'Tiny prepositions, big meaning',
      learnerPain: 'Learners keep mixing small fixed words in phrases they already know.',
      curiosityHook: 'A small word can steer the whole sentence.',
      firstPackShape: '12 MCQ items, A1-B2, fixed phrases only, no regional edge cases.',
      sourceNeeds: ['dictionary collocation examples', 'grammar reference'],
      status: evidenceStatus,
    },
  ];
}

function renderTopicCandidates(target, signals, candidates) {
  const distinctSignalCount = countDistinctSocialSignals(signals);
  const lines = [
    '# Skyler Topic Candidates',
    '',
    `Target: \`${target}\``,
    '',
    `Social signals supplied: ${signals.length}`,
    `Distinct social signals: ${distinctSignalCount}`,
    '',
  ];
  if (distinctSignalCount < MIN_VALIDATED_SOCIAL_SIGNALS) {
    lines.push(
      `Status: seed-only discovery. Add at least ${MIN_VALIDATED_SOCIAL_SIGNALS} distinct public/user-provided social signals before treating these as validated demand.`,
      '',
    );
  }
  candidates.forEach((candidate, index) => {
    lines.push(`## ${index + 1}. ${candidate.title}`);
    lines.push('');
    lines.push(`- Category id: \`${candidate.categoryId}\``);
    lines.push(`- Status: \`${candidate.status}\``);
    lines.push(`- Learner pain: ${candidate.learnerPain}`);
    lines.push(`- Curiosity hook: ${candidate.curiosityHook}`);
    lines.push(`- First pack: ${candidate.firstPackShape}`);
    lines.push(`- Source needs: ${candidate.sourceNeeds.join('; ')}`);
    lines.push('');
  });
  return lines.join('\n');
}

function renderAgentBoard(target, category) {
  const lines = [
    '# Skyler Agent Board',
    '',
    `Target: \`${target}\``,
    category ? `Category: \`${category}\`` : 'Category: user choice pending',
    '',
    '| Agent | Owns | Prompt |',
    '| --- | --- | --- |',
    '| Skyler Orchestrator | scope, user choice, decision | prompts/00_SKYLER_ORCHESTRATOR.md |',
    '| Social Listening Analyst | learner pain signals | prompts/10_SOCIAL_LISTENING_ANALYST.md |',
    '| Topic Taxonomist | three category candidates | prompts/20_TOPIC_TAXONOMIST.md |',
    '| Visual Asset Producer / Visual Asset Director | AI visual asset pass for theme card backgrounds and theme logos before drafting | prompts/25_VISUAL_ASSET_DIRECTOR.md |',
    '| Source Librarian | official source matrix | prompts/30_SOURCE_LIBRARIAN.md |',
    '| Fact Checker | claims and answer keys | prompts/40_FACT_CHECKER.md |',
    '| Quiz Architect | item blueprint | prompts/50_QUIZ_ARCHITECT.md |',
    '| English Quiz Writer | English target packs | prompts/60_ENGLISH_QUIZ_WRITER.md |',
    '| French Quiz Writer | French target packs | prompts/70_FRENCH_QUIZ_WRITER.md |',
    '| Smartest Writer | knowledge mode packs | prompts/80_SMARTEST_WRITER.md |',
    '| Locale Editor | all interface locales | prompts/90_LOCALE_EDITOR.md |',
    '| Distractor Adversary | ambiguity attack | prompts/95_DISTRACTOR_ADVERSARY.md |',
    '| QA Gatekeeper | GO/HOLD/BLOCK gate | prompts/99_QA_GATEKEEPER.md |',
    '',
  ];
  return lines.join('\n');
}

function renderSourceMatrix(target, category) {
  const family =
    target === 'fr'
      ? 'Larousse, CNRTL, Academie francaise, TV5MONDE/FLE, university-backed French references'
      : target === 'smartest'
        ? 'official institutions, museums, universities, government/science bodies'
        : 'Cambridge, Oxford, Longman, Swan/Murphy-style ELT references, dictionary examples';
  return [
    '# Skyler Source Matrix',
    '',
    `Target: \`${target}\``,
    `Category: \`${category || 'pending'}\``,
    '',
    `Preferred source family: ${family}`,
    '',
    '| Source id | Tier | Title/URL | Used for | Checked at | Limitations |',
    '| --- | --- | --- | --- | --- | --- |',
    '| S1 | A |  |  |  |  |',
    '| S2 | A |  |  |  |  |',
    '',
    'Gate: fewer than two Tier A/B sources means `BLOCK`.',
    '',
  ].join('\n');
}

function renderVisualAssetPlan(target, category) {
  const templatePath = path.join(ROOM_DIR, 'templates', 'visual_asset_plan.md');
  return readText(templatePath)
    .replace('Category id: `<category-id>`', `Category id: \`${category || 'pending'}\``)
    .replace('Target: `<en|fr|smartest>`', `Target: \`${target}\``);
}

function renderQualityGates(target) {
  const localeLine = target === 'fr'
    ? `${FRENCH_SOURCE_UI_LOCALES.join(', ')} only while the French source gate is closed`
    : `${ACTIVE_INTERFACE_LOCALES.join(', ')} from app/source_locales.ts`;
  return [
    '# Skyler Quality Gates',
    '',
    `Target: \`${target}\``,
    '',
    '- G0 Social evidence: validated demand has at least two distinct social signals, or seed-only label.',
    '- G1 Source matrix: at least two strong sources.',
    '- G1.5 Visual asset kickoff: DALL-E / AI visual asset pass starts before quiz drafting; generated theme card backgrounds and theme logos must cover all active app theme modes before production mapping.',
    '- G2 Track fit: no English-bank reuse for French; Smartest is not a language.',
    '- G3 Item validity: four unique choices, one valid correct index.',
    '- G4 Distractors: plausible, specific, and clearly wrong.',
    '- G5 Fact truth: every claim has official/institution-backed source IDs.',
    `- G6 Locale quality: ${localeLine}; copy is adapted from research notes.`,
    '- G7 App fit: schema can map to current quiz bank or future Smartest hub.',
    '- G7.5 Visual assets: AI visual asset pass completed before quiz drafting; theme card backgrounds and theme logos cover all active app theme modes.',
    '- G7.7 Release isolation: new Skyler quiz packs remain dev-only until explicit user approval; approved packs must record production approval metadata.',
    '- G8 User choice: one selected category before drafting.',
    '',
  ].join('\n');
}

function renderWorkOrder(target, category) {
  return [
    '# Skyler Work Order',
    '',
    `Target: \`${target}\``,
    `Category: \`${category || 'pending'}\``,
    '',
    '## Steps',
    '',
    '- [ ] Confirm the user selected this category.',
    '- [ ] Start the DALL-E / AI visual asset pass before quiz drafting: generate or queue theme card backgrounds and theme logos for all active app theme modes.',
    '- [ ] Complete source matrix with at least two strong sources.',
    '- [ ] Write category brief.',
    '- [ ] Build item blueprint.',
    '- [ ] Draft first quiz pack.',
    '- [ ] Attach source IDs to every item.',
    '- [ ] Add locale review notes for all active interface locales.',
    '- [ ] Mark the pack `dev-only`, or record `approved_by_user` production metadata after explicit user approval.',
    '- [ ] Run `npm run skyler:quiz -- --mode gate --draft <pack.json>`.',
    '',
    '## Track-Specific Note',
    '',
    target === 'fr'
      ? 'French stays source-gated until app evidence is approved.'
      : target === 'smartest'
        ? 'Smartest is a separate content vertical, not a study target language.'
        : 'English packs can map to the existing quiz flow after schema review.',
    '',
  ].join('\n');
}

function renderCategoryBrief(target, category) {
  const templatePath = path.join(ROOM_DIR, 'templates', 'category_brief.md');
  return readText(templatePath)
    .replace('Category id: `<category-id>`', `Category id: \`${category}\``)
    .replace('Target: `<en|fr|smartest>`', `Target: \`${target}\``);
}

function createRun(args, mode, extra = {}) {
  const runId = args.runId || `${timestampSlug()}_${args.target}_${mode}`;
  const runDir = path.resolve(ROOT, args.outRoot, runId);
  ensureDir(runDir);
  const manifest = {
    schemaVersion: 'skyler-run-v1',
    runId,
    mode,
    target: args.target,
    category: args.category,
    generatedAt: new Date().toISOString(),
    activeInterfaceLocales: ACTIVE_INTERFACE_LOCALES,
    outputDir: rel(runDir),
    ...extra,
  };
  writeJson(path.join(runDir, 'manifest.json'), manifest);
  return { runId, runDir, manifest };
}

function runDiscover(args) {
  const signals = parseSocialInput(args.socialInput);
  const candidates = defaultCandidates(args.target, signals);
  const { runDir, manifest } = createRun(args, 'discover', {
    socialSignals: signals.length,
    distinctSocialSignals: countDistinctSocialSignals(signals),
    candidateIds: candidates.map((candidate) => candidate.categoryId),
  });
  writeText(path.join(runDir, 'topic_candidates.md'), renderTopicCandidates(args.target, signals, candidates));
  writeText(path.join(runDir, 'agent_board.md'), renderAgentBoard(args.target, null));
  writeText(path.join(runDir, 'quality_gates.md'), renderQualityGates(args.target));
  writeText(path.join(runDir, 'work_order.md'), renderWorkOrder(args.target, null));
  writeJson(path.join(runDir, 'topic_candidates.json'), { target: args.target, signals, candidates });
  console.log(JSON.stringify({ ok: true, mode: 'discover', outputDir: manifest.outputDir, candidates }, null, 2));
}

function runBrief(args) {
  const category = slugify(args.category);
  const { runDir, manifest } = createRun(args, 'brief', { category });
  writeText(path.join(runDir, 'agent_board.md'), renderAgentBoard(args.target, category));
  writeText(path.join(runDir, 'visual_asset_plan.md'), renderVisualAssetPlan(args.target, category));
  writeText(path.join(runDir, 'source_matrix.md'), renderSourceMatrix(args.target, category));
  writeText(path.join(runDir, 'quality_gates.md'), renderQualityGates(args.target));
  writeText(path.join(runDir, 'work_order.md'), renderWorkOrder(args.target, category));
  writeText(path.join(runDir, 'category_brief.md'), renderCategoryBrief(args.target, category));
  ensureDir(path.join(runDir, 'drafts'));
  console.log(JSON.stringify({ ok: true, mode: 'brief', outputDir: manifest.outputDir, category }, null, 2));
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeChoice(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim();
}

function requiredLocalesForTarget(target) {
  return target === 'fr' ? FRENCH_SOURCE_UI_LOCALES : ACTIVE_INTERFACE_LOCALES;
}

function allowedLocalesForTarget(target) {
  return target === 'fr' ? FRENCH_SOURCE_UI_LOCALES : ACTIVE_INTERFACE_LOCALES;
}

function contentClaimTypesForTarget(target) {
  return target === 'smartest' ? ['fact'] : ['grammar_rule', 'usage_rule'];
}

function allowedNonAnswerClaimTypesForTarget(target) {
  return target === 'smartest' ? ['fact'] : ['fact', 'grammar_rule', 'usage_rule'];
}

function hasSameMembers(actual, expected) {
  return actual.length === expected.length && expected.every((value) => actual.includes(value));
}

function stableRefIdReason(value, minLength = 2) {
  const weakReason = weakTextReason(value, minLength);
  if (weakReason) return weakReason;
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(String(value).trim())) {
    return 'must be a stable alphanumeric id';
  }
  return null;
}

function kebabIdReason(value, minLength = 3) {
  const weakReason = weakTextReason(value, minLength);
  if (weakReason) return weakReason;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value).trim())) {
    return 'must be stable kebab-case';
  }
  return null;
}

function tagReason(value, minLength = 3) {
  const weakReason = weakTextReason(value, minLength);
  if (weakReason) return weakReason;
  if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(String(value).trim())) {
    return 'must be a stable lowercase tag';
  }
  return null;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    else seen.add(value);
  }
  return [...duplicates];
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function sourceUrlKey(value) {
  try {
    const parsed = new URL(String(value).trim());
    parsed.hash = '';
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/g, '');
    return parsed.toString();
  } catch {
    return '';
  }
}

function sourceHostKey(value) {
  try {
    const parsed = new URL(String(value).trim());
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function socialSignalKeys(signal) {
  if (!isObject(signal)) return { primaryKey: '', urlKey: '', textKey: '' };
  const urlKey = hasText(signal.url) && isHttpUrl(signal.url) ? `url:${sourceUrlKey(signal.url)}` : '';
  const textKey = hasText(signal.source) || hasText(signal.text)
    ? `text:${normalizeTextBlock(signal.source)}:${normalizeTextBlock(signal.text)}`
    : '';
  return { primaryKey: urlKey || textKey, urlKey, textKey };
}

function countDistinctSocialSignals(signals) {
  if (!Array.isArray(signals)) return 0;
  const seenUrlKeys = new Set();
  const seenTextKeys = new Set();
  let count = 0;
  for (const signal of signals) {
    if (socialSignalQualityReason(signal)) continue;
    const { primaryKey, urlKey, textKey } = socialSignalKeys(signal);
    if (!primaryKey) continue;
    if ((urlKey && seenUrlKeys.has(urlKey)) || (textKey && seenTextKeys.has(textKey))) continue;
    if (urlKey) seenUrlKeys.add(urlKey);
    if (textKey) seenTextKeys.add(textKey);
    count += 1;
  }
  return count;
}

function socialSignalQualityReason(signal) {
  if (!isObject(signal)) return 'must be an object';
  const sourceReason = weakTextReason(signal.source, 4);
  if (sourceReason) return `source ${sourceReason}`;
  const textReason = weakTextReason(signal.text, 18);
  if (textReason) return `text ${textReason}`;
  if (hasText(signal.url) && !isHttpUrl(signal.url)) return 'url must be http(s) when provided';
  return null;
}

function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function checkedAtDateReason(value) {
  const checkedAt = parseDateOnly(value);
  if (!checkedAt) return 'Source checkedAt must be a real YYYY-MM-DD date.';
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (checkedAt.getTime() > today.getTime()) return 'Source checkedAt cannot be in the future.';
  return null;
}

function weakTextReason(value, minLength) {
  if (!hasText(value)) return 'is blank';
  const raw = String(value).trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ');
  const compact = normalized.replace(/[^a-zа-яёіїєґ0-9]+/giu, '');
  if (raw.length < minLength) return `is too short; minimum ${minLength} characters`;
  if (
    compact === '' ||
    ['todo', 'tbd', 'fixme', 'placeholder', 'lorem', 'ipsum', 'xxx', 'translation', 'translate'].includes(compact) ||
    normalized === '...' ||
    normalized === '…' ||
    normalized.includes('[todo]') ||
    normalized.includes('{{') ||
    normalized.includes('}}') ||
    /^<[^>]+>$/.test(raw)
  ) {
    return 'looks like a placeholder';
  }
  return null;
}

function normalizeTextBlock(value) {
  if (Array.isArray(value)) return normalizeTextBlock(value.join('\n'));
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function longExplanationFragments(value) {
  return String(value || '')
    .split(/[.!?;:]\s+/u)
    .map(normalizeTextBlock)
    .filter((fragment) => fragment.length >= 55);
}

function repeatedExplanationFragmentReason(explanations) {
  const fragmentCounts = new Map();
  for (const explanation of explanations) {
    for (const fragment of new Set(longExplanationFragments(explanation))) {
      fragmentCounts.set(fragment, (fragmentCounts.get(fragment) || 0) + 1);
    }
  }
  const repeated = [...fragmentCounts.entries()].find(([, count]) => count > 1);
  return repeated
    ? 'reuses the same long explanation fragment across answer choices; each choice needs its own selected-word contrast'
    : null;
}

function languagePackNeedsQuizStyleProfile(target) {
  return target === 'en' || target === 'fr';
}

const REQUIRED_QUIZ_STYLE_SAMPLE_FILES = [
  'app/quiz_data.ts',
  'app/quiz_source_locale_payloads.ts',
];

const GENERIC_PROMPT_SHELL_PATTERNS = [
  /^(?:kitchen|cooking)\s*[—-]\s*(?:object|container|action|person)\b/i,
  /^(?:кухня|готовка)\s*[—-]\s*(?:предмет|ёмкость|емкость|действие|человек)\b/i,
  /^(?:кухня|готування)\s*[—-]\s*(?:предмет|посудина|дія|людина)\b/i,
  /which\s+(?:kitchen\s+)?word\s+(?:best\s+)?fits\s*[:：]/i,
  /which\s+(?:verb|word)\s+best\s+completes\s+(?:the\s+sentence|the\s+instruction)?\s*[:：]/i,
  /which\s+object\s+do\s+you\s+(?:usually\s+)?use\s+to\b/i,
  /како[ейй]\s+(?:кухонное\s+)?(?:слово|предмет|глагол)\s+(?:лучше\s+)?(?:подходит|завершает|используют)/i,
  /яке\s+(?:кухонне\s+)?(?:слово|предмет|дієслово)\s+(?:краще\s+)?(?:підходить|завершує|використовують)/i,
  /qué\s+palabra\s+.+encaja\s*[:：]/i,
  /qual\s+palavra\s+.+combina\s*[:：]/i,
  /từ\s+.+nào\s+.+phù hợp\s*[:：]/i,
  /kata\s+.+mana\s+.+cocok\s*[:：]/i,
  /hangi\s+.+kelime\s+.+uyar\s*[:：]/i,
  /które\s+.+słowo\s+.+pasuje\s*[:：]/i,
  /^(?:cocina|cozinha)\s*[—-]\s*(?:objeto|recipiente|acción|ação|persona|pessoa)\b/i,
  /^(?:nhà bếp|dapur|mutfak|kuchnia)\s*[—-]\b/i,
];

const PHRASE_TRANSLATION_PROMPT_PATTERNS = [
  /\bhow\s+(?:do|would)\s+you\s+say\b/i,
  /\bhow\s+to\s+say\b/i,
  /как\s+(?:по[-\s]?английски\s+)?сказать/i,
  /як\s+(?:англійською\s+)?сказати/i,
  /¿?cómo\s+se\s+dice/i,
  /\bcomo\s+se\s+diz/i,
  /\b(?:nói|dịch)\s+câu.+\bbằng\s+tiếng\s+anh/i,
  /\bbagaimana\s+(?:mengatakan|cara\s+mengatakan)/i,
  /\bingilizce\s+nasıl\s+(?:söylenir|dersin)/i,
  /\bjak\s+(?:po\s+angielsku\s+)?powiedzieć/i,
];

function quotedSegments(value) {
  const raw = String(value || '');
  const segments = [];
  for (const pattern of [/«([^»]+)»/gu, /“([^”]+)”/gu, /"([^"]+)"/gu]) {
    for (const match of raw.matchAll(pattern)) segments.push(match[1]);
  }
  return segments;
}

function isMultiwordText(value) {
  return normalizeTextBlock(value).split(/\s+/).filter(Boolean).length > 1;
}

function isSingleTokenChoice(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length === 1;
}

const FLAT_EXPLANATION_PREFIX_PATTERNS = {
  ru: /^(?:верно|нет|правильно)\s*[:：]/i,
  uk: /^(?:правильно|ні)\s*[:：]/i,
  es: /^(?:correcto|no)\s*[:：]/i,
  'pt-BR': /^(?:certo|não)\s*[:：]/i,
  vi: /^(?:đúng|không đúng)\s*[:：]/i,
  id: /^(?:benar|bukan)\s*[:：]/i,
  tr: /^(?:doğru|hayır)\s*[:：]/i,
  pl: /^(?:dobrze|nie)\s*[:：]/i,
};

const GENERIC_EXPLANATION_FRAGMENTS = [
  'source-backed',
  'source backed',
  'source id',
  'source ids',
  'verified claim',
  'official source',
  'correct and source-backed',
  'is correct because',
  'is wrong because',
  'wrong because the',
  'another kitchen word',
  'other kitchen word',
  'другое кухонное слово',
  'другой кухонный вариант',
  'інше кухонне слово',
  'інший кухонний варіант',
  'otra palabra de cocina',
  'outra palavra de cozinha',
  'простое базовое слово',
  'просте базове слово',
  'подсказка говорит',
  'підказка говорить',
  'подсказка просит',
  'підказка просить',
  'the clue asks',
  'the prompt asks',
  'dictionary gloss',
];

const TAXONOMY_META_EXPLANATION_PATTERNS = [
  /\b(?:section|category)\b/iu,
  /\b(?:this|the)?\s*(?:word|answer|choice)?\s*(?:lands?|goes|fits)\s+in\s+(?:the\s+)?(?:kitchen\s+)?(?:section|category)\b/iu,
  /\u043f\u043e\u043f\u0430\u0434\p{L}*\s+\u0432\s+\u043a\u0443\u0445\u043d/iu,
  /(?:^|[^\p{L}])\u0440\u0430\u0437\u0434\u0435\u043b(?:\u0430|\u0435|\u0443|\u043e\u043c|\u044b|\u0430\u0445|\u0430\u043c|\u0430\u043c\u0438)?(?:$|[^\p{L}])/iu,
  /(?:^|[^\p{L}])\u043a\u0430\u0442\u0435\u0433\u043e\u0440(?:\u0438\u044f|\u0438\u0438|\u0438\u044e|\u0438\u0435\u0439|\u0438\u0439|\u0438\u044f\u0445|\u0438\u044f\u043c|\u0438\u044f\u043c\u0438)?(?:$|[^\p{L}])/iu,
  /(?:^|[^\p{L}])\u0440\u043e\u0437\u0434\u0456\u043b(?:\u0443|\u0456|\u043e\u043c|\u0438|\u0430\u0445|\u0430\u043c|\u0430\u043c\u0438)?(?:$|[^\p{L}])/iu,
];

const FORMULAIC_READER_REWARD_PATTERNS = [
  /[\p{L}\d][^.!?;:]{0,55}\s\+\s[^.!?;:]{1,55}\s\+\s[^.!?;:]{1,55}/u,
  /[\p{L}\d][^.!?;:]{0,65}\s=\s[^.!?;:]{1,65}[\p{L}\d]/u,
];

const FORCED_LIFEHACK_LABEL_PATTERNS = [
  /\b(?:lifehack|trick|tip)\s*:/iu,
  /\b(?:truco|dica|trik|sztuczka)\s*:/iu,
  /\btrik ingat\s*:/iu,
  /\b(?:akılda tut|ipucu|İpucu)\s*:/iu,
  /(?:лайфхак|mẹo nhớ)\s*:/iu,
];

const VAGUE_SCENE_REWARD_PATTERNS = [
  /(?:слово|word)[^.!?]{0,50}(?:на месте|fits|encaja|pas|yerine oturur)/iu,
  /(?:дружит|дружат|ходит парой|ходят парой|go together|goes together|van en pareja|andam em dupla|berpasangan|birlikte gezer|chodzą razem)/iu,
  /(?:ищет сцену|другой личностью|маленький отпуск|кухонн\w*\s+загар|аплодирует)/iu,
];

const UNSUPPORTED_CONTEXT_REFERENCE_PATTERNS = [
  /(?:в этой|в данной)\s+фразе/iu,
  /(?:у цій|у даній)\s+фразі/iu,
  /\bin this\s+(?:phrase|sentence)\b/iu,
  /\b(?:en esta|nesta)\s+frase\b/iu,
  /\b(?:trong câu này|di kalimat ini|bu cümlede|w tym zdaniu)\b/iu,
];

function readerRewardReason(value, item, explanationIndex) {
  const raw = String(value || '').trim();
  const lengthReason = weakTextReason(raw, 55);
  if (lengthReason) return `is too thin to be reader-worthy; ${lengthReason}`;
  if ([...raw].length > 220) return 'is too long for the quiz explanation card; keep the reader reward tight';
  if (FORCED_LIFEHACK_LABEL_PATTERNS.some((pattern) => pattern.test(raw))) {
    return 'uses a forced lifehack/trick label; write the memory cue as a natural mini-scene, usage cue, or verified fact instead';
  }
  if (VAGUE_SCENE_REWARD_PATTERNS.some((pattern) => pattern.test(raw))) {
    return 'uses a vague scene reward without a clear language reason; explain the meaning, usage boundary, or contrast directly';
  }
  if (UNSUPPORTED_CONTEXT_REFERENCE_PATTERNS.some((pattern) => pattern.test(raw))) {
    return 'claims sentence/phrase context that may not exist in the prompt; explain only the prompt evidence or the selected choice';
  }
  if (!Array.isArray(item.choices) || !Number.isInteger(item.correctIndex)) return null;
  const normalized = normalizeChoice(raw);
  const selectedChoice = normalizeChoice(item.choices[explanationIndex]);
  const correctChoice = normalizeChoice(item.choices[item.correctIndex]);
  if (explanationIndex === item.correctIndex) {
    const extraChoiceMentions = item.choices
      .filter((_, choiceIndex) => choiceIndex !== item.correctIndex)
      .map((choice) => normalizeChoice(choice))
      .filter((choice) => choice && normalized.includes(choice));
    if (extraChoiceMentions.length > 1) {
      return 'correct-answer feedback lists multiple distractors; keep the correct explanation focused and move distractor contrasts to wrong-answer feedback';
    }
  }
  const mentionsSelected = selectedChoice && normalized.includes(selectedChoice);
  const mentionsCorrect = correctChoice && normalized.includes(correctChoice);
  if (!mentionsSelected && !mentionsCorrect) {
    return 'must mention the selected English choice or the correct English contrast so the feedback stays choice-specific';
  }
  return null;
}

function genericPromptShellReason(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return GENERIC_PROMPT_SHELL_PATTERNS.some((pattern) => pattern.test(raw))
    ? 'uses a generic prompt shell instead of the current quiz prompt style; write a natural learner-facing phrase or question'
    : null;
}

function promptChoiceGranularityReason(value, choices) {
  const raw = String(value || '').trim();
  if (!raw || !Array.isArray(choices)) return null;
  const asksForPhraseTranslation = PHRASE_TRANSLATION_PROMPT_PATTERNS.some((pattern) => pattern.test(raw));
  if (!asksForPhraseTranslation) return null;
  const quotedMultiwordPhrase = quotedSegments(raw).some(isMultiwordText);
  if (!quotedMultiwordPhrase) return null;
  if (!choices.some(isSingleTokenChoice)) return null;
  return 'asks how to say a full phrase but offers single-word choices; rewrite the prompt as a word/verb question or make every choice a full phrase';
}

function explanationStyleReason(value, locale) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const flatPrefix = FLAT_EXPLANATION_PREFIX_PATTERNS[locale];
  if (flatPrefix && flatPrefix.test(raw)) {
    return 'uses a flat Correct/Wrong label prefix; match the current per-locale quiz explanation style instead';
  }
  const normalized = normalizeTextBlock(raw);
  if (GENERIC_EXPLANATION_FRAGMENTS.some((fragment) => normalized.includes(normalizeTextBlock(fragment)))) {
    return 'uses generic category filler instead of a choice-specific explanation';
  }
  if (TAXONOMY_META_EXPLANATION_PATTERNS.some((pattern) => pattern.test(raw))) {
    return 'uses learner-facing taxonomy meta; explain only the selected word, meaning, usage boundary, or contrast';
  }
  if (FORMULAIC_READER_REWARD_PATTERNS.some((pattern) => pattern.test(raw))) {
    return 'uses a formulaic pseudo-lifehack; write a human image, contrast, or usage cue instead';
  }
  return null;
}

function validatePack(pack) {
  const failures = [];
  const warnings = [];

  const fail = (id, detail) => failures.push({ id, detail });
  const warn = (id, detail) => warnings.push({ id, detail });

  if (!isObject(pack)) {
    fail('schema.root', 'Draft must be a JSON object.');
    return { failures, warnings };
  }
  if (pack.schemaVersion !== 'skyler-quiz-pack-v1') fail('schema.version', 'schemaVersion must be skyler-quiz-pack-v1.');
  if (!TARGETS.includes(pack.target)) fail('schema.target', 'target must be en, fr, or smartest.');
  const categoryIdReason = weakTextReason(pack.categoryId, 3);
  if (categoryIdReason) {
    fail('schema.categoryId', `categoryId ${categoryIdReason}.`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pack.categoryId)) {
    fail('schema.categoryId.format', 'categoryId must be stable kebab-case.');
  }
  const categoryTitleReason = weakTextReason(pack.categoryTitle, 8);
  if (categoryTitleReason) fail('schema.categoryTitle', `categoryTitle ${categoryTitleReason}.`);
  if (!isObject(pack.researchPolicy)) {
    fail('policy.researchPolicy', 'researchPolicy is required.');
  } else {
    if (pack.researchPolicy.directTranslationUsed !== false) {
      fail('policy.directTranslation', 'researchPolicy.directTranslationUsed must be false.');
    }
    const notesReason = weakTextReason(pack.researchPolicy.notes, 20);
    if (notesReason) fail('policy.notes', `researchPolicy.notes ${notesReason}.`);
  }
  if (languagePackNeedsQuizStyleProfile(pack.target)) {
    if (!isObject(pack.styleProfile)) {
      fail('styleProfile', 'Language quiz packs must include styleProfile based on existing quiz pool analysis.');
    } else {
      if (pack.styleProfile.basedOnExistingPools !== true) {
        fail('styleProfile.basedOnExistingPools', 'styleProfile.basedOnExistingPools must be true.');
      }
      const sampledFiles = Array.isArray(pack.styleProfile.sampledFiles)
        ? pack.styleProfile.sampledFiles.map(String)
        : [];
      for (const requiredFile of REQUIRED_QUIZ_STYLE_SAMPLE_FILES) {
        if (!sampledFiles.includes(requiredFile)) {
          fail('styleProfile.sampledFiles', `styleProfile.sampledFiles must include ${requiredFile}.`);
        }
      }
      for (const key of ['promptPattern', 'explanationPattern', 'readerRewardPattern', 'distractorPattern']) {
        const reason = weakTextReason(pack.styleProfile[key], 35);
        if (reason) fail(`styleProfile.${key}`, `styleProfile.${key} ${reason}.`);
      }
    }
  }
  if (pack.target !== 'fr' && pack.frenchGate !== undefined) {
    fail('trackIsolation.frenchGate', 'Only French packs may include frenchGate metadata.');
  }
  if (pack.target !== 'smartest' && pack.trackPolicy !== undefined) {
    fail('trackIsolation.trackPolicy', 'Only Smartest packs may include trackPolicy metadata.');
  }
  if (!isObject(pack.releasePolicy)) {
    fail('releasePolicy', 'New Skyler quiz packs must stay dev-only until explicit production approval.');
  } else {
    if (pack.releasePolicy.environment === 'dev-only') {
      if (pack.releasePolicy.productionActivation !== 'blocked_until_explicit_user_approval') {
        fail('releasePolicy.productionActivation', 'dev-only productionActivation must stay blocked_until_explicit_user_approval.');
      }
    } else if (pack.releasePolicy.environment === 'production') {
      if (pack.releasePolicy.productionActivation !== 'approved_by_user') {
        fail('releasePolicy.productionActivation', 'production activation requires productionActivation: approved_by_user.');
      }
      const approvedByReason = weakTextReason(pack.releasePolicy.approvedBy, 4);
      if (approvedByReason) fail('releasePolicy.approvedBy', `approvedBy ${approvedByReason}.`);
      const approvalSourceReason = weakTextReason(pack.releasePolicy.approvalSource, 12);
      if (approvalSourceReason) fail('releasePolicy.approvalSource', `approvalSource ${approvalSourceReason}.`);
      const approvedAt = parseDateOnly(pack.releasePolicy.approvedAt);
      if (!approvedAt) {
        fail('releasePolicy.approvedAt', 'approvedAt must be a real YYYY-MM-DD date.');
      } else {
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        if (approvedAt.getTime() > today.getTime()) fail('releasePolicy.approvedAt', 'approvedAt cannot be in the future.');
      }
    } else {
      fail('releasePolicy.environment', 'releasePolicy.environment must be dev-only or production.');
    }
    const releaseNotesReason = weakTextReason(pack.releasePolicy.notes, 30);
    if (releaseNotesReason) fail('releasePolicy.notes', `releasePolicy.notes ${releaseNotesReason}.`);
  }
  if (!isObject(pack.visualAssets)) {
    fail('visualAssets', 'visualAssets is required so the DALL-E plaque/icon kickoff is tracked before quiz drafting.');
  } else {
    if (!['generated', 'queued'].includes(pack.visualAssets.status)) {
      fail('visualAssets.status', 'visualAssets.status must be generated or queued.');
    }
    const styleBasisReason = weakTextReason(pack.visualAssets.styleBasis, 35);
    if (styleBasisReason) fail('visualAssets.styleBasis', `visualAssets.styleBasis ${styleBasisReason}.`);
    const assets = Array.isArray(pack.visualAssets.assets) ? pack.visualAssets.assets : [];
    const assetByFamily = new Map();
    for (const [index, asset] of assets.entries()) {
      if (!isObject(asset)) {
        fail(`visualAssets.assets.${index}`, 'Visual asset entry must be an object.');
        continue;
      }
      if (!ACTIVE_APP_VISUAL_FAMILIES.includes(asset.family)) {
        fail(`visualAssets.assets.${index}.family`, `Visual asset family must be one of ${ACTIVE_APP_VISUAL_FAMILIES.join(', ')}.`);
      } else if (assetByFamily.has(asset.family)) {
        fail(`visualAssets.assets.${index}.duplicate`, `Duplicate visual asset family ${asset.family}.`);
      } else {
        assetByFamily.set(asset.family, asset);
      }
      for (const key of ['plaquePrompt', 'iconPrompt']) {
        const promptReason = weakTextReason(asset[key], 45);
        if (promptReason) fail(`visualAssets.assets.${index}.${key}`, `${key} ${promptReason}.`);
      }
      if (pack.visualAssets.status === 'generated') {
        for (const key of ['plaquePath', 'iconPath']) {
          const pathReason = weakTextReason(asset[key], 12);
          if (pathReason) fail(`visualAssets.assets.${index}.${key}`, `${key} ${pathReason}.`);
          else {
            const resolvedAssetPath = path.resolve(ROOT, asset[key]);
            const assetRelativePath = path.relative(ROOT, resolvedAssetPath);
            if (assetRelativePath.startsWith('..') || path.isAbsolute(assetRelativePath)) {
              fail(`visualAssets.assets.${index}.${key}`, `${key} must stay inside the workspace.`);
            } else if (!fs.existsSync(resolvedAssetPath)) {
              fail(`visualAssets.assets.${index}.${key}`, `${key} must point to an existing generated workspace asset.`);
            }
          }
        }
      }
    }
    for (const family of ACTIVE_APP_VISUAL_FAMILIES) {
      if (!assetByFamily.has(family)) fail(`visualAssets.assets.${family}`, `Missing plaque/icon prompt entry for ${family}.`);
    }
  }
  const requiredLocales = requiredLocalesForTarget(pack.target);
  const allowedLocales = allowedLocalesForTarget(pack.target);

  if (!isObject(pack.socialListening)) {
    fail('socialListening', 'socialListening status is required: validated or seed-only.');
  } else if (!['validated', 'seed-only'].includes(pack.socialListening.status)) {
    fail('socialListening.status', 'socialListening.status must be validated or seed-only.');
  } else if (pack.socialListening.status === 'validated') {
    const signals = Array.isArray(pack.socialListening.signals) ? pack.socialListening.signals : [];
    if (signals.length < MIN_VALIDATED_SOCIAL_SIGNALS) {
      fail('socialListening.signals.count', `Validated social listening needs at least ${MIN_VALIDATED_SOCIAL_SIGNALS} distinct documented social signals; use seed-only for single-signal exploration.`);
    }
    if (signals.length > 0) {
      const seenSignalKeys = new Map();
      for (const [index, signal] of signals.entries()) {
        if (!isObject(signal)) {
          fail(`socialListening.signals.${index}`, 'Social signal must be an object.');
          continue;
        }
        const sourceReason = weakTextReason(signal.source, 4);
        if (sourceReason) fail(`socialListening.signals.${index}.source`, `Social signal source ${sourceReason}.`);
        const textReason = weakTextReason(signal.text, 18);
        if (textReason) fail(`socialListening.signals.${index}.text`, `Social signal text ${textReason}.`);
        if (hasText(signal.url) && !isHttpUrl(signal.url)) fail(`socialListening.signals.${index}.url`, 'Social signal url must be http(s) when provided.');
        const { urlKey, textKey } = socialSignalKeys(signal);
        const duplicateKey = urlKey && seenSignalKeys.has(urlKey) ? urlKey : textKey && seenSignalKeys.has(textKey) ? textKey : '';
        if (duplicateKey) {
          fail(`socialListening.signals.${index}.duplicate`, `Duplicate social signal already seen at ${seenSignalKeys.get(duplicateKey)}; validated demand needs distinct URLs and distinct source/text pairs.`);
        } else {
          if (urlKey) seenSignalKeys.set(urlKey, index);
          if (textKey) seenSignalKeys.set(textKey, index);
        }
      }
      if (signals.length >= MIN_VALIDATED_SOCIAL_SIGNALS && countDistinctSocialSignals(signals) < MIN_VALIDATED_SOCIAL_SIGNALS) {
        fail('socialListening.signals.distinctCount', `Validated social listening needs at least ${MIN_VALIDATED_SOCIAL_SIGNALS} distinct social signals.`);
      }
    }
  } else {
    warnings.push({
      id: 'socialListening.seedOnly',
      detail: 'Seed-only discovery is allowed for exploration, but not ideal for final category demand validation.',
    });
  }

  const sources = Array.isArray(pack.officialSources) ? pack.officialSources : [];
  if (sources.length < 2) fail('sources.count', 'At least two officialSources are required.');
  const sourceIds = new Set();
  const sourceIndexById = new Map();
  const sourceUrlKeys = new Map();
  const sourceHostKeys = new Map();
  const strongSourceIds = new Set();
  for (const [index, source] of sources.entries()) {
    if (!isObject(source)) {
      fail(`sources.${index}`, 'Source must be an object.');
      continue;
    }
    const sourceIdReason = stableRefIdReason(source.id);
    if (sourceIdReason) {
      fail(`sources.${index}.id`, `Source id ${sourceIdReason}.`);
    } else if (sourceIds.has(source.id)) {
      fail(`sources.${index}.duplicate`, `Duplicate source id ${source.id}.`);
    } else {
      sourceIds.add(source.id);
      sourceIndexById.set(source.id, index);
      if (['A', 'B'].includes(source.tier)) strongSourceIds.add(source.id);
    }
    const titleReason = weakTextReason(source.title, 5);
    if (titleReason) fail(`sources.${index}.title`, `Source title ${titleReason}.`);
    if (!source.url || typeof source.url !== 'string') fail(`sources.${index}.url`, 'Source url is required.');
    else if (!isHttpUrl(source.url)) fail(`sources.${index}.url`, 'Source url must be http(s).');
    else {
      const urlKey = sourceUrlKey(source.url);
      if (sourceUrlKeys.has(urlKey)) {
        fail(`sources.${index}.url.duplicate`, `Source url duplicates ${sourceUrlKeys.get(urlKey)}; cross-checking needs independent URLs.`);
      } else {
        sourceUrlKeys.set(urlKey, source.id || `sources.${index}`);
      }
      const hostKey = sourceHostKey(source.url);
      if (sourceHostKeys.has(hostKey)) {
        fail(`sources.${index}.host.duplicate`, `Source host duplicates ${sourceHostKeys.get(hostKey)}; cross-checking needs distinct source hosts.`);
      } else {
        sourceHostKeys.set(hostKey, source.id || `sources.${index}`);
      }
    }
    if (!['A', 'B'].includes(source.tier)) fail(`sources.${index}.tier`, 'Source tier must be A or B. Social/blog/AI material cannot prove facts.');
    if (!SOURCE_PUBLISHER_TYPES.includes(source.publisherType)) {
      fail(`sources.${index}.publisherType`, `Source publisherType must be one of ${SOURCE_PUBLISHER_TYPES.join(', ')}.`);
    }
    const usedForReason = weakTextReason(source.usedFor, 18);
    if (usedForReason) fail(`sources.${index}.usedFor`, `Source usedFor ${usedForReason}.`);
    const limitationsReason = weakTextReason(source.limitations, 12);
    if (limitationsReason) fail(`sources.${index}.limitations`, `Source limitations ${limitationsReason}.`);
    const checkedAtReason = checkedAtDateReason(source.checkedAt);
    if (checkedAtReason) fail(`sources.${index}.checkedAt`, checkedAtReason);
  }
  if (strongSourceIds.size < 2) fail('sources.strongCount', 'At least two Tier A/B sources are required for cross-checking.');

  const claims = Array.isArray(pack.claims) ? pack.claims : [];
  if (claims.length === 0) fail('claims.count', 'At least one verified claim/rule is required.');
  const claimIds = new Set();
  const claimsById = new Map();
  const claimSourceIds = new Set();
  for (const [index, claim] of claims.entries()) {
    if (!isObject(claim)) {
      fail(`claims.${index}`, 'Claim must be an object.');
      continue;
    }
    const claimIdReason = stableRefIdReason(claim.id);
    if (claimIdReason) {
      fail(`claims.${index}.id`, `Claim id ${claimIdReason}.`);
    } else if (claimIds.has(claim.id)) {
      fail(`claims.${index}.duplicate`, `Duplicate claim id ${claim.id}.`);
    } else {
      claimIds.add(claim.id);
      claimsById.set(claim.id, claim);
    }
    const claimTextReason = weakTextReason(claim.text, 18);
    if (claimTextReason) fail(`claims.${index}.text`, `Claim text ${claimTextReason}.`);
    if (!['fact', 'grammar_rule', 'usage_rule', 'answer_key'].includes(claim.type)) {
      fail(`claims.${index}.type`, 'Claim type must be fact, grammar_rule, usage_rule, or answer_key.');
    }
    if (claim.type === 'answer_key') {
      if (!Number.isInteger(claim.answerIndex) || claim.answerIndex < 0 || claim.answerIndex > 3) {
        fail(`claims.${index}.answerIndex`, 'answer_key claims must declare answerIndex from 0 to 3.');
      }
      const itemIdReason = kebabIdReason(claim.itemId);
      if (itemIdReason) fail(`claims.${index}.itemId`, `answer_key claim itemId ${itemIdReason}.`);
    }
    if (claim.verificationStatus !== 'verified') fail(`claims.${index}.verificationStatus`, 'Claim verificationStatus must be verified.');
    const comparisonReason = weakTextReason(claim.sourceComparison, 25);
    if (comparisonReason) fail(`claims.${index}.sourceComparison`, `Claim sourceComparison ${comparisonReason}.`);
    if (!Array.isArray(claim.sourceIds) || claim.sourceIds.length < 2) {
      fail(`claims.${index}.sourceIds`, 'Each claim needs at least two sourceIds.');
    } else {
      const duplicateSourceIds = duplicateValues(claim.sourceIds);
      if (duplicateSourceIds.length) {
        fail(`claims.${index}.sourceIds.duplicate`, `Claim sourceIds must be distinct; duplicated ${duplicateSourceIds.join(', ')}.`);
      }
      if (new Set(claim.sourceIds).size < 2) {
        fail(`claims.${index}.sourceIds.distinctCount`, 'Each claim needs at least two distinct sourceIds.');
      }
      for (const sourceId of claim.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          fail(`claims.${index}.sourceIds.${sourceId}`, `Unknown sourceId ${sourceId}.`);
        } else {
          claimSourceIds.add(sourceId);
        }
      }
    }
  }
  for (const sourceId of sourceIds) {
    if (!claimSourceIds.has(sourceId)) {
      fail(`sources.${sourceIndexById.get(sourceId)}.unusedClaim`, `Official source ${sourceId} must be cited by at least one verified claim or answer_key; unused official sources cannot inflate cross-checking.`);
    }
  }

  const reviews = Array.isArray(pack.localeReviews) ? pack.localeReviews : [];
  const reviewLocales = new Set(reviews.map((review) => review && review.locale));
  const seenReviewLocales = new Map();
  const seenReviewNotes = new Map();
  for (const locale of requiredLocales) {
    if (!reviewLocales.has(locale)) fail(`localeReviews.${locale}`, `Missing locale review for ${locale}.`);
  }
  for (const [index, review] of reviews.entries()) {
    if (!isObject(review)) {
      fail(`localeReviews.${index}`, 'Locale review must be an object.');
      continue;
    }
    if (!allowedLocales.includes(review.locale)) fail(`localeReviews.${index}.locale`, `Unsupported locale ${review.locale} for target ${pack.target}.`);
    if (seenReviewLocales.has(review.locale)) {
      fail(`localeReviews.${index}.duplicate`, `Duplicate locale review for ${review.locale}; already seen at ${seenReviewLocales.get(review.locale)}.`);
    } else {
      seenReviewLocales.set(review.locale, index);
    }
    if (!['research_adapted', 'native_reviewed'].includes(review.method)) {
      fail(`localeReviews.${index}.method`, 'Review method must be research_adapted or native_reviewed.');
    }
    const reviewerReason = weakTextReason(review.reviewer, 5);
    if (reviewerReason) fail(`localeReviews.${index}.reviewer`, `Locale review reviewer ${reviewerReason}.`);
    if (review.directTranslationUsed !== false) {
      fail(`localeReviews.${index}.directTranslationUsed`, 'Locale review directTranslationUsed must be false.');
    }
    if (!['source_notes', 'native_review', 'source_notes_and_native_review'].includes(review.adaptationBasis)) {
      fail(`localeReviews.${index}.adaptationBasis`, 'Locale review adaptationBasis must be source_notes, native_review, or source_notes_and_native_review.');
    }
    const notesReason = weakTextReason(review.notes, 24);
    if (notesReason) fail(`localeReviews.${index}.notes`, `Locale review notes ${notesReason}.`);
    else {
      const notesKey = normalizeTextBlock(review.notes);
      if (notesKey && seenReviewNotes.has(notesKey)) {
        fail(`localeReviews.${index}.notes.duplicate`, `Locale review notes duplicate ${seenReviewNotes.get(notesKey)}; notes must be locale-specific.`);
      } else {
        seenReviewNotes.set(notesKey, review.locale);
      }
    }
    if (!Array.isArray(review.sourceIds) || review.sourceIds.length < 2) {
      fail(`localeReviews.${index}.sourceIds`, 'Locale review must cite at least two sourceIds.');
    } else {
      const duplicateSourceIds = duplicateValues(review.sourceIds);
      if (duplicateSourceIds.length) {
        fail(`localeReviews.${index}.sourceIds.duplicate`, `Locale review sourceIds must be distinct; duplicated ${duplicateSourceIds.join(', ')}.`);
      }
      if (new Set(review.sourceIds).size < 2) {
        fail(`localeReviews.${index}.sourceIds.distinctCount`, 'Locale review needs at least two distinct sourceIds.');
      }
      for (const sourceId of review.sourceIds) {
        if (!sourceIds.has(sourceId)) fail(`localeReviews.${index}.sourceIds.${sourceId}`, `Unknown sourceId ${sourceId}.`);
      }
    }
  }

  if (pack.target === 'fr') {
    const gate = isObject(pack.frenchGate) ? pack.frenchGate : null;
    if (!gate) {
      fail('frenchGate', 'French packs must declare frenchGate production blocking metadata.');
    } else {
      if (gate.productionActivation !== 'blocked_until_source_gate_approval') {
        fail('frenchGate.productionActivation', 'French productionActivation must remain blocked_until_source_gate_approval.');
      }
      if (!Array.isArray(gate.sourceUiLocales) || !hasSameMembers(gate.sourceUiLocales, FRENCH_SOURCE_UI_LOCALES)) {
        fail('frenchGate.sourceUiLocales', `French sourceUiLocales must match ${FRENCH_SOURCE_UI_LOCALES.join(', ')}.`);
      }
    }
  }

  if (pack.target === 'smartest') {
    const policy = isObject(pack.trackPolicy) ? pack.trackPolicy : null;
    if (!policy) {
      fail('trackPolicy', 'Smartest packs must declare trackPolicy.');
    } else {
      if (policy.smartestIsContentVertical !== true) fail('trackPolicy.smartestIsContentVertical', 'Smartest must be a content vertical.');
      if (policy.doesNotUseStudyTarget !== true) fail('trackPolicy.doesNotUseStudyTarget', 'Smartest must not use StudyTarget.');
    }
  }

  const items = Array.isArray(pack.items) ? pack.items : [];
  if (items.length === 0) fail('items.count', 'At least one item is required.');
  const itemIds = new Set();
  const promptKeys = new Map();
  for (const [index, item] of items.entries()) {
    const label = item?.id || `item_${index}`;
    if (!isObject(item)) {
      fail(`items.${index}`, 'Item must be an object.');
      continue;
    }
    const itemIdReason = kebabIdReason(item.id);
    if (itemIdReason) fail(`items.${index}.id`, `Item id ${itemIdReason}.`);
    else if (itemIds.has(item.id)) fail(`items.${index}.duplicate`, `Duplicate item id ${item.id}.`);
    else itemIds.add(item.id);
    if (item.type !== 'mcq') fail(`${label}.type`, 'Only mcq items are currently gate-supported.');
    const promptReason = weakTextReason(item.prompt, 10);
    if (promptReason) fail(`${label}.prompt`, `Prompt ${promptReason}.`);
    const promptStyleReason = genericPromptShellReason(item.prompt);
    if (promptStyleReason) fail(`${label}.prompt.style`, promptStyleReason);
    const promptChoiceReason = promptChoiceGranularityReason(item.prompt, item.choices);
    if (promptChoiceReason) fail(`${label}.prompt.choiceGranularity`, promptChoiceReason);
    const promptKey = normalizeChoice(item.prompt);
    const authorPromptBlockKey = normalizeTextBlock(item.prompt);
    if (promptKey) {
      if (promptKeys.has(promptKey)) fail(`${label}.prompt.duplicate`, `Duplicate prompt also used by ${promptKeys.get(promptKey)}.`);
      else promptKeys.set(promptKey, label);
    }
    if (!isObject(item.localizedPrompts)) {
      fail(`${label}.localizedPrompts`, 'localizedPrompts object is required for every required interface locale.');
    } else {
      const localizedPromptKeys = new Map();
      for (const locale of Object.keys(item.localizedPrompts)) {
        if (!allowedLocales.includes(locale)) {
          fail(`${label}.localizedPrompts.${locale}.unsupported`, `Unsupported localized prompt locale ${locale} for target ${pack.target}.`);
        }
      }
      for (const locale of requiredLocales) {
        const localizedPrompt = item.localizedPrompts[locale];
        const localizedPromptReason = weakTextReason(localizedPrompt, 10);
        if (localizedPromptReason) {
          fail(`${label}.localizedPrompts.${locale}`, `Localized prompt ${localizedPromptReason}.`);
          continue;
        }
        const localizedPromptStyleReason = genericPromptShellReason(localizedPrompt);
        if (localizedPromptStyleReason) fail(`${label}.localizedPrompts.${locale}.style`, localizedPromptStyleReason);
        const localizedPromptChoiceReason = promptChoiceGranularityReason(localizedPrompt, item.choices);
        if (localizedPromptChoiceReason) fail(`${label}.localizedPrompts.${locale}.choiceGranularity`, localizedPromptChoiceReason);
        const localizedPromptKey = normalizeTextBlock(localizedPrompt);
        if (localizedPromptKey && authorPromptBlockKey && localizedPromptKey === authorPromptBlockKey) {
          fail(`${label}.localizedPrompts.${locale}.fallback`, 'Localized prompt duplicates the English author prompt; adapt it for the interface locale.');
        }
        if (localizedPromptKey && localizedPromptKeys.has(localizedPromptKey)) {
          fail(`${label}.localizedPrompts.${locale}.duplicateLocaleCopy`, `Localized prompt duplicates ${localizedPromptKeys.get(localizedPromptKey)}; required locales need adapted prompts.`);
        } else if (localizedPromptKey) {
          localizedPromptKeys.set(localizedPromptKey, locale);
        }
      }
    }
    const learningGoalReason = weakTextReason(item.learningGoal, 12);
    if (learningGoalReason) fail(`${label}.learningGoal`, `Item learningGoal ${learningGoalReason}.`);
    if (pack.target === 'en' || pack.target === 'fr') {
      const skillTagReason = tagReason(item.skillTag);
      if (skillTagReason) fail(`${label}.skillTag`, `Language-learning skillTag ${skillTagReason}.`);
      if (hasText(item.factTag)) fail(`${label}.factTag.forbidden`, 'Language-learning items must not use Smartest factTag metadata.');
    }
    if (pack.target === 'smartest') {
      const factTagReason = tagReason(item.factTag);
      if (factTagReason) fail(`${label}.factTag`, `Smartest factTag ${factTagReason}.`);
      if (hasText(item.skillTag)) fail(`${label}.skillTag.forbidden`, 'Smartest items must not use language-learning skillTag metadata.');
    }
    const correctIndexIsValid = Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex <= 3;
    const itemSourceIds = new Set(Array.isArray(item.sourceIds) ? item.sourceIds : []);
    if (!Array.isArray(item.claimIds) || item.claimIds.length === 0) {
      fail(`${label}.claimIds`, 'Each item must cite claimIds.');
    } else {
      const duplicateClaimIds = duplicateValues(item.claimIds);
      if (duplicateClaimIds.length) {
        fail(`${label}.claimIds.duplicate`, `Item claimIds must be distinct; duplicated ${duplicateClaimIds.join(', ')}.`);
      }
      let hasAnswerKeyClaim = false;
      let hasMatchingAnswerKeyClaim = false;
      let hasContentClaim = false;
      const requiredContentClaimTypes = contentClaimTypesForTarget(pack.target);
      const allowedContentClaimTypes = allowedNonAnswerClaimTypesForTarget(pack.target);
      for (const claimId of item.claimIds) {
        if (!claimIds.has(claimId)) {
          fail(`${label}.claimIds.${claimId}`, `Unknown claimId ${claimId}.`);
          continue;
        }
        const claim = claimsById.get(claimId);
        if (claim && claim.type !== 'answer_key') {
          if (requiredContentClaimTypes.includes(claim.type)) {
            hasContentClaim = true;
          } else if (!allowedContentClaimTypes.includes(claim.type)) {
            fail(`${label}.claimIds.${claimId}.contentClaimType`, `Content claim type ${claim.type || 'missing'} is not valid for target ${pack.target}; expected ${requiredContentClaimTypes.join(' or ')}.`);
          }
        }
        if (claim && claim.type === 'answer_key') {
          hasAnswerKeyClaim = true;
          const answerKeyItemMatches = claim.itemId === item.id;
          const answerKeyIndexMatches = claim.answerIndex === item.correctIndex;
          if (!answerKeyItemMatches) {
            fail(`${label}.claimIds.${claimId}.itemId`, `answer_key claim itemId ${claim.itemId || 'missing'} must match item id ${item.id}.`);
          }
          if (answerKeyItemMatches && answerKeyIndexMatches) {
            hasMatchingAnswerKeyClaim = true;
          } else if (correctIndexIsValid && Number.isInteger(claim.answerIndex) && !answerKeyIndexMatches) {
            fail(`${label}.claimIds.${claimId}.answerIndex`, `answer_key claim answerIndex ${claim.answerIndex} must match correctIndex ${item.correctIndex}.`);
          }
        }
        if (claim && Array.isArray(claim.sourceIds)) {
          for (const sourceId of claim.sourceIds) {
            if (!itemSourceIds.has(sourceId)) {
              fail(`${label}.claimIds.${claimId}.sourceCoverage`, `Item sourceIds must include claim ${claimId} sourceId ${sourceId}.`);
            }
          }
        }
      }
      if (!hasAnswerKeyClaim) {
        fail(`${label}.claimIds.answerKey`, 'Each item must cite at least one verified answer_key claim.');
      } else if (!hasMatchingAnswerKeyClaim && correctIndexIsValid) {
        fail(`${label}.claimIds.answerKeyAlignment`, 'At least one cited answer_key claim must match item id and correctIndex.');
      }
      if (!hasContentClaim) {
        fail(`${label}.claimIds.contentClaim`, 'Each item must cite at least one verified non-answer content claim.');
      }
    }
    if (!isObject(item.qualityChecks)) {
      fail(`${label}.qualityChecks`, 'Item qualityChecks are required.');
    } else {
      for (const key of ['singleCorrect', 'distractorsPlausible', 'noAmbiguity', 'sourceBacked']) {
        if (item.qualityChecks[key] !== true) fail(`${label}.qualityChecks.${key}`, `${key} must be true.`);
      }
    }
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) {
      fail(`${label}.choiceRationales`, 'Each item needs four author choiceRationales aligned with choices.');
    } else {
      for (const [rationaleIndex, rationale] of item.choiceRationales.entries()) {
        const reason = weakTextReason(rationale, 18);
        if (reason) fail(`${label}.choiceRationales.${rationaleIndex}`, `Choice rationale ${reason}.`);
      }
      const rationaleKeys = item.choiceRationales.map(normalizeTextBlock).filter(Boolean);
      if (duplicateValues(rationaleKeys).length) {
        fail(`${label}.choiceRationales.unique`, 'Choice rationales must be unique and specific to each choice.');
      }
    }
    if (!Array.isArray(item.choices) || item.choices.length !== 4) {
      fail(`${label}.choices`, 'Each item must have exactly four choices.');
    } else {
      const normalized = item.choices.map(normalizeChoice);
      if (normalized.some((choice) => !choice)) fail(`${label}.choices.blank`, 'Choices cannot be blank.');
      if (new Set(normalized).size !== 4) fail(`${label}.choices.unique`, 'Choices must be unique after normalization.');
      for (const [choiceIndex, choice] of item.choices.entries()) {
        const choiceReason = weakTextReason(choice, 1);
        if (choiceReason) fail(`${label}.choices.${choiceIndex}`, `Choice ${choiceReason}.`);
      }
      if (!Number.isInteger(item.correctIndex) || item.correctIndex < 0 || item.correctIndex > 3) {
        fail(`${label}.correctIndex`, 'correctIndex must be an integer from 0 to 3.');
      }
    }
    if (!Array.isArray(item.sourceIds) || item.sourceIds.length < 2) {
      fail(`${label}.sourceIds`, 'Each item needs at least two sourceIds for cross-checking.');
    } else {
      const duplicateSourceIds = duplicateValues(item.sourceIds);
      if (duplicateSourceIds.length) {
        fail(`${label}.sourceIds.duplicate`, `Item sourceIds must be distinct; duplicated ${duplicateSourceIds.join(', ')}.`);
      }
      if (new Set(item.sourceIds).size < 2) {
        fail(`${label}.sourceIds.distinctCount`, 'Each item needs at least two distinct sourceIds for cross-checking.');
      }
      for (const sourceId of item.sourceIds) {
        if (!sourceIds.has(sourceId)) fail(`${label}.sourceIds.${sourceId}`, `Unknown sourceId ${sourceId}.`);
      }
    }
    if (!isObject(item.explanations)) {
      fail(`${label}.explanations`, 'Explanations object is required.');
    } else {
      const explanationBundles = new Map();
      for (const locale of Object.keys(item.explanations)) {
        if (!allowedLocales.includes(locale)) fail(`${label}.explanations.${locale}.unsupported`, `Unsupported explanation locale ${locale} for target ${pack.target}.`);
      }
      for (const locale of requiredLocales) {
        const explanation = item.explanations[locale];
        if (!Array.isArray(explanation) || explanation.length !== 4) {
          fail(`${label}.explanations.${locale}`, `Need four explanations for ${locale}.`);
        } else if (explanation.some((entry) => typeof entry !== 'string' || !entry.trim())) {
          fail(`${label}.explanations.${locale}.blank`, `Explanations for ${locale} cannot be blank.`);
        } else {
          explanation.forEach((entry, explanationIndex) => {
            const reason = weakTextReason(entry, 18);
            if (reason) fail(`${label}.explanations.${locale}.${explanationIndex}`, `Explanation ${reason}.`);
            const styleReason = explanationStyleReason(entry, locale);
            if (styleReason) fail(`${label}.explanations.${locale}.${explanationIndex}.style`, styleReason);
            const rewardReason = readerRewardReason(entry, item, explanationIndex);
            if (rewardReason) fail(`${label}.explanations.${locale}.${explanationIndex}.readerReward`, rewardReason);
          });
          const explanationKeys = explanation.map(normalizeTextBlock).filter(Boolean);
          if (duplicateValues(explanationKeys).length) {
            fail(`${label}.explanations.${locale}.unique`, `Explanations for ${locale} must be unique and specific to each choice.`);
          }
          const repeatedFragmentReason = repeatedExplanationFragmentReason(explanation);
          if (repeatedFragmentReason) fail(`${label}.explanations.${locale}.repeatedFragment`, repeatedFragmentReason);
          const bundleKey = normalizeTextBlock(explanation);
          if (bundleKey && explanationBundles.has(bundleKey)) {
            fail(`${label}.explanations.${locale}.duplicateLocaleCopy`, `Explanations duplicate ${explanationBundles.get(bundleKey)}; required locales need adapted copy.`);
          } else {
            explanationBundles.set(bundleKey, locale);
          }
        }
      }
    }
  }

  if (pack.target === 'fr') {
    warn(
      'french.sourceGate',
      'French packs can be authored, but production activation still requires app-level French quiz source-gate approval.',
    );
  }

  return { failures, warnings };
}

function decisionFor(result) {
  if (result.failures.length) return 'BLOCK';
  if (result.warnings.length) return 'HOLD';
  return 'GO';
}

function renderGateMarkdown(report) {
  const lines = [
    '# Skyler Gate Report',
    '',
    `Decision: \`${report.decision}\``,
    '',
    `Draft: \`${report.draft}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Failures: ${report.failures.length}`,
    `- Warnings: ${report.warnings.length}`,
    '',
    '## Failures',
    '',
  ];
  if (!report.failures.length) lines.push('No failures.');
  for (const failure of report.failures) lines.push(`- \`${failure.id}\`: ${failure.detail}`);
  lines.push('', '## Warnings', '');
  if (!report.warnings.length) lines.push('No warnings.');
  for (const warning of report.warnings) lines.push(`- \`${warning.id}\`: ${warning.detail}`);
  lines.push('');
  return lines.join('\n');
}

function runGate(args) {
  const draftPath = path.resolve(ROOT, args.draft);
  const pack = JSON.parse(readText(draftPath));
  const result = validatePack(pack);
  const decision = decisionFor(result);
  const runDir = path.dirname(draftPath);
  const report = {
    schemaVersion: 'skyler-gate-report-v1',
    generatedAt: new Date().toISOString(),
    draft: rel(draftPath),
    decision,
    failures: result.failures,
    warnings: result.warnings,
  };
  writeJson(path.join(runDir, 'gate_report.json'), report);
  writeText(path.join(runDir, 'gate_report.md'), renderGateMarkdown(report));
  console.log(JSON.stringify(report, null, 2));
  if (decision !== 'GO') process.exitCode = 1;
}

function runProtocolCheck() {
  const failures = [];
  const warnings = [];
  for (const file of REQUIRED_PROTOCOL_FILES) {
    const abs = path.join(ROOM_DIR, file);
    if (!fs.existsSync(abs)) failures.push(`Missing ${file}`);
  }

  warnings.push(...ACTIVE_INTERFACE_LOCALE_STATE.warnings);
  warnings.push(...FRENCH_SOURCE_UI_LOCALE_STATE.warnings);
  if (ACTIVE_INTERFACE_LOCALE_STATE.source !== 'app/source_locales.ts') {
    failures.push('Skyler could not load active interface locales from app/source_locales.ts');
  }
  if (FRENCH_SOURCE_UI_LOCALE_STATE.source !== 'app/french_content_source_gate.ts') {
    failures.push('Skyler could not load French source UI locales from app/french_content_source_gate.ts');
  }

  const roomPath = path.join(ROOM_DIR, 'ROOM.md');
  const room = fs.existsSync(roomPath) ? readText(roomPath) : '';
  for (const locale of ACTIVE_INTERFACE_LOCALES) {
    if (!room.includes(locale)) failures.push(`ROOM.md does not mention locale ${locale}`);
  }
  for (const locale of FRENCH_SOURCE_UI_LOCALES) {
    if (!room.includes(locale)) failures.push(`ROOM.md does not mention French source UI locale ${locale}`);
  }
  for (const token of ['Direct translation', 'Social posts are pain signals', 'French quiz packs cannot reuse', 'Heisenberg', 'content vertical', 'copy-pasted across locales', 'unique per choice', 'localizedPrompts', 'unique source URLs', 'distinct source hosts', 'unused official sources', 'at least two distinct social signals', 'distinct social signals', 'categoryTitle', 'researchPolicy.notes', 'styleProfile', 'readerRewardPattern', 'QUIZ_STYLE_CONTRACT.md', 'Prompt, localizedPrompts, choices, and learningGoal', 'target-appropriate content claim', 'locale review needs at least two distinct source IDs', 'stable source, claim, and item IDs', 'stable answer_key itemId', 'stable skillTag/factTag', 'reviewer owner', 'distinct claimIds', 'Track isolation', 'Release isolation', 'dev-only', 'blocked_until_explicit_user_approval', 'source ID required by', 'distinct Tier A/B source IDs', 'itemId', 'answerIndex', 'source-backed fact', 'Prompt/choice granularity', 'visual asset kickoff', 'AI visual asset pass', 'theme card backgrounds', 'theme logos', 'all active app theme modes', 'before quiz drafting', 'Visual Asset Producer', 'Visual Asset Director']) {
    if (!room.includes(token)) failures.push(`ROOM.md missing rule: ${token}`);
  }

  const visualAssetTokens = ['AI visual asset pass', 'theme card backgrounds', 'theme logos', 'all active app theme modes', 'before quiz drafting'];
  for (const file of ['README.md', 'prompts/00_SKYLER_ORCHESTRATOR.md', 'prompts/25_VISUAL_ASSET_DIRECTOR.md', 'prompts/50_QUIZ_ARCHITECT.md', 'templates/visual_asset_plan.md']) {
    const abs = path.join(ROOM_DIR, file);
    const text = fs.existsSync(abs) ? readText(abs) : '';
    for (const token of visualAssetTokens) {
      if (!text.includes(token)) failures.push(`${file} missing visual asset rule: ${token}`);
    }
  }

  const styleContractPath = path.join(ROOM_DIR, 'QUIZ_STYLE_CONTRACT.md');
  const styleContract = fs.existsSync(styleContractPath) ? readText(styleContractPath) : '';
  for (const token of ['app/quiz_data.ts', 'app/quiz_source_locale_payloads.ts', 'RU/UK', 'Correct/Wrong label prefixes', 'reader-worthy', 'readerRewardPattern', 'source-backed fact', 'formulaic pseudo-lifehack', 'простое базовое слово', 'подсказка говорит', 'styleProfile', 'Which word fits', 'Prompt/choice granularity']) {
    if (!styleContract.includes(token)) failures.push(`QUIZ_STYLE_CONTRACT.md missing style rule: ${token}`);
  }

  const schemaPath = path.join(ROOM_DIR, 'templates', 'quiz_pack.schema.md');
  const schemaTemplate = fs.existsSync(schemaPath) ? readText(schemaPath) : '';
  if (schemaTemplate.includes('["...", "...", "...", "..."]')) {
    failures.push('quiz_pack.schema.md contains placeholder explanation arrays');
  }
  if (!schemaTemplate.includes('real adapted explanations')) {
    failures.push('quiz_pack.schema.md must tell authors to use real adapted explanations');
  }
  if (!schemaTemplate.includes('styleProfile') || !schemaTemplate.includes('QUIZ_STYLE_CONTRACT.md')) {
    failures.push('quiz_pack.schema.md must require the existing-pool style profile');
  }
  if (!schemaTemplate.includes('Which word fits') || !schemaTemplate.includes('Correct/Wrong label prefixes') || !schemaTemplate.includes('reader-worthy') || !schemaTemplate.includes('readerRewardPattern')) {
    failures.push('quiz_pack.schema.md must block generic prompt shells and flat explanation labels');
  }
  if (!schemaTemplate.includes('Do not duplicate the same explanation bundle')) {
    failures.push('quiz_pack.schema.md must forbid duplicated locale explanation bundles');
  }
  if (!schemaTemplate.includes('unique per choice')) {
    failures.push('quiz_pack.schema.md must require unique per-choice rationales and explanations');
  }
  if (!schemaTemplate.includes('Target-Specific Blocks')) {
    failures.push('quiz_pack.schema.md must separate target-specific blocks');
  }
  if (!schemaTemplate.includes('Evidence Date And Coverage Rules')) {
    failures.push('quiz_pack.schema.md must document evidence date and claim-source coverage rules');
  }
  if (!schemaTemplate.includes('does not count as cross-checking')) {
    failures.push('quiz_pack.schema.md must forbid duplicate source IDs as cross-checking');
  }
  if (!schemaTemplate.includes('unique source URLs')) {
    failures.push('quiz_pack.schema.md must forbid duplicate official source URLs');
  }
  if (!schemaTemplate.includes('distinct source hosts')) {
    failures.push('quiz_pack.schema.md must require distinct official source hosts');
  }
  if (!schemaTemplate.includes('unused official sources')) {
    failures.push('quiz_pack.schema.md must block unused official sources');
  }
  if (!schemaTemplate.includes('at least two distinct social signals')) {
    failures.push('quiz_pack.schema.md must require at least two distinct social signals');
  }
  if (!schemaTemplate.includes('kebab-case categoryId') || !schemaTemplate.includes('researchPolicy.notes')) {
    failures.push('quiz_pack.schema.md must require concrete category metadata and research notes');
  }
  if (!schemaTemplate.includes('Prompt, choices, and learningGoal')) {
    failures.push('quiz_pack.schema.md must forbid placeholder item prompt, choices, and learningGoal');
  }
  if (!schemaTemplate.includes('Prompt and choice granularity')) {
    failures.push('quiz_pack.schema.md must require prompt and choice granularity alignment');
  }
  if (!schemaTemplate.includes('localizedPrompts') || !schemaTemplate.includes('must not copy the English')) {
    failures.push('quiz_pack.schema.md must require localizedPrompts for every interface locale without copied English prompts');
  }
  if (!schemaTemplate.includes('itemId') || !schemaTemplate.includes('answerIndex')) {
    failures.push('quiz_pack.schema.md must require answer_key claims for item id and correctIndex support');
  }
  if (!schemaTemplate.includes('target-appropriate content claim')) {
    failures.push('quiz_pack.schema.md must require target-appropriate non-answer content claims for every item');
  }
  if (!schemaTemplate.includes('locale review needs at least two distinct source IDs')) {
    failures.push('quiz_pack.schema.md must require at least two distinct source IDs for locale reviews');
  }
  if (!schemaTemplate.includes('stable source, claim, and item IDs')) {
    failures.push('quiz_pack.schema.md must require stable source, claim, and item IDs');
  }
  if (!schemaTemplate.includes('stable answer_key itemId')) {
    failures.push('quiz_pack.schema.md must require stable answer_key itemId metadata');
  }
  if (!schemaTemplate.includes('stable skillTag/factTag')) {
    failures.push('quiz_pack.schema.md must require stable skillTag/factTag metadata');
  }
  if (!schemaTemplate.includes('reviewer owner')) {
    failures.push('quiz_pack.schema.md must require reviewer owner metadata for locale reviews');
  }
  if (!schemaTemplate.includes('distinct claimIds')) {
    failures.push('quiz_pack.schema.md must require distinct claimIds');
  }

  const categoryBriefPath = path.join(ROOM_DIR, 'templates', 'category_brief.md');
  const categoryBriefTemplate = fs.existsSync(categoryBriefPath) ? readText(categoryBriefPath) : '';
  if (!categoryBriefTemplate.includes('at least two distinct social signals')) {
    failures.push('category_brief.md must require at least two distinct social signals before validated demand');
  }
  if (!categoryBriefTemplate.includes('Single-signal')) {
    failures.push('category_brief.md must keep single-signal demand seed-only');
  }

  const smartestPromptPath = path.join(ROOM_DIR, 'prompts', '80_SMARTEST_WRITER.md');
  const smartestPrompt = fs.existsSync(smartestPromptPath) ? readText(smartestPromptPath) : '';
  if (!smartestPrompt.includes('at least two distinct source IDs')) {
    failures.push('80_SMARTEST_WRITER.md must require at least two distinct source IDs');
  }
  if (smartestPrompt.includes('one-source exception') || smartestPrompt.includes('unless the source is a')) {
    failures.push('80_SMARTEST_WRITER.md must not allow one-source exceptions');
  }

  const sourceLocalesPath = path.join(ROOT, 'app', 'source_locales.ts');
  const sourceLocales = fs.existsSync(sourceLocalesPath) ? readText(sourceLocalesPath) : '';
  for (const token of ['ACTIVE_INTERFACE_SOURCE_LOCALES', 'HEISENBERG_BATCH_SOURCE_LOCALES']) {
    if (!sourceLocales.includes(token)) failures.push(`app/source_locales.ts missing ${token}`);
  }

  const frenchGatePath = path.join(ROOT, 'app', 'french_content_source_gate.ts');
  const frenchGate = fs.existsSync(frenchGatePath) ? readText(frenchGatePath) : '';
  for (const token of ['french_quiz_question_bank', 'french_quiz_distractor_review', 'ru_uk_quiz_prompt_review', 'english_quiz_bank_reuse_without_french_source_gate']) {
    if (!frenchGate.includes(token)) failures.push(`French source gate missing ${token}`);
  }

  const quizGatePath = path.join(ROOT, 'app', 'quiz_target_gate.ts');
  const quizGate = fs.existsSync(quizGatePath) ? readText(quizGatePath) : '';
  for (const token of ['french_quiz_question_bank', 'french_quiz_distractor_review', 'ru_uk_quiz_prompt_review']) {
    if (!quizGate.includes(token)) failures.push(`Quiz target gate missing ${token}`);
  }

  const packagePath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(readText(packagePath));
  if (pkg.scripts?.['skyler:quiz'] !== 'node ./scripts/skyler_quiz_pipeline.cjs') {
    failures.push('package.json missing skyler:quiz script');
  }
  if (pkg.scripts?.['skyler:quiz:check'] !== 'node ./scripts/skyler_quiz_pipeline.cjs --check-protocol') {
    failures.push('package.json missing skyler:quiz:check script');
  }

  const result = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    activeInterfaceLocales: ACTIVE_INTERFACE_LOCALES,
    activeInterfaceLocaleSource: ACTIVE_INTERFACE_LOCALE_STATE.source,
    frenchSourceUiLocales: FRENCH_SOURCE_UI_LOCALES,
    frenchSourceUiLocaleSource: FRENCH_SOURCE_UI_LOCALE_STATE.source,
    files: REQUIRED_PROTOCOL_FILES.length,
    warnings,
    failures,
  };
  console.log(JSON.stringify(result, null, 2));
  if (failures.length) process.exitCode = 1;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }
    if (args.checkProtocol) {
      runProtocolCheck();
      return;
    }
    if (args.mode === 'discover') runDiscover(args);
    else if (args.mode === 'brief') runBrief(args);
    else if (args.mode === 'gate') runGate(args);
  } catch (error) {
    console.error(`[skyler] ${error && error.message ? error.message : String(error)}`);
    process.exit(2);
  }
}

main();
