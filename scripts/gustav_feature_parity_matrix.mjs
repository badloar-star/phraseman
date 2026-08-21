import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'feature_parity');
const OUT_JSON = path.join(OUT_DIR, 'english_feature_atlas_french_gap_matrix.json');
const OUT_MD = path.join(OUT_DIR, 'english_feature_atlas_french_gap_matrix.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');
const ADMIN_ATLAS_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'admin_parity', 'admin_website_parity_atlas.json');

const SCAN_ROOTS = ['app', 'functions/src', 'scripts', 'tests', 'admin', 'docs/gustav'];
const EXCLUDE_PARTS = new Set([
  '.git',
  'node_modules',
  'functions/lib',
  'android/.gradle',
  'android/app/build',
  '.codex',
  '.codex-tmp',
  '.claude',
  '.superpowers',
  'maestro-results',
  'docs/reports',
  'assets/images',
  'admin/avatars',
  'builds',
  'dist',
  'exports',
]);

const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.html']);

const FEATURE_DEFINITIONS = [
  {
    id: 'onboarding_study_target',
    label: 'Onboarding study-target choice and preload',
    keywords: ['onboarding', 'study_target', 'studyTarget', 'ENABLE_DEV_STUDY_TARGET_LANG', 'server prefetch'],
    missingFamily: null,
    priority: 1,
  },
  {
    id: 'core_lessons_32',
    label: '32 core lessons, intro, phrase graph and lesson runtime',
    keywords: ['lesson', 'lessons', 'lesson_data', 'lesson_intro', 'lesson_menu', 'lesson1', 'course_pack'],
    missingFamily: 'target_specific_lesson_scope_sequence',
    priority: 2,
  },
  {
    id: 'lesson_theory',
    label: 'Lesson theory blocks and explanations',
    keywords: ['theory', 'lesson_theory', 'teaching_notes', 'explanation'],
    missingFamily: 'lesson_theory',
    priority: 3,
  },
  {
    id: 'vocabulary_bank',
    label: 'Vocabulary/word bank surfaces',
    keywords: ['vocabulary', 'lesson_words', 'word', 'words', 'dictionary'],
    missingFamily: 'vocabulary_bank',
    priority: 4,
  },
  {
    id: 'grammar_hubs',
    label: 'Grammar hubs and language-specific grammar sections',
    keywords: ['grammar', 'irregular_verbs', 'preposition', 'article', 'pronoun'],
    missingFamily: 'grammar_hubs',
    priority: 5,
  },
  {
    id: 'mistake_explanations',
    label: 'Mistake explanation AI prompts and gates',
    keywords: ['mistake_explain', 'ai_mistake'],
    missingFamily: 'ai_prompt_packs',
    priority: 8,
  },
  {
    id: 'compass_ai',
    label: 'Compass, situations, dialogs and coaching AI',
    keywords: ['compass', 'premium_dialog', 'dialog', 'situation', 'coach'],
    missingFamily: 'ai_prompt_packs',
    priority: 9,
  },
  {
    id: 'personal_practice',
    label: 'Personal diagnostics and weak-spot practice',
    keywords: ['personal_practice', 'diagnostic', 'weak_spot'],
    missingFamily: 'personal_practice_banks_not_row_fanout',
    priority: 10,
  },
  {
    id: 'mistake_practice',
    label: 'Errors adaptive practice',
    keywords: ['mistake_practice', 'content_unavailable', 'correction_rewarded'],
    missingFamily: null,
    priority: 11,
  },
  {
    id: 'flashcards',
    label: 'Flashcards and saved cards',
    keywords: ['flashcard', 'flashcards'],
    missingFamily: 'flashcard_packs_not_row_fanout',
    priority: 12,
  },
  {
    id: 'community_card_packs',
    label: 'Community packs and collectible/card packs',
    keywords: ['community_pack', 'community-packs', 'card_pack', 'card-packs', 'collectible', 'collectibles'],
    missingFamily: 'collectible_card_packs',
    priority: 13,
  },
  {
    id: 'daily_phrase',
    label: 'Daily Phrase',
    keywords: ['daily_phrase', 'daily-phrases', 'daily phrase'],
    missingFamily: 'daily_phrase_bank',
    priority: 14,
  },
  {
    id: 'diagnostics_exams',
    label: 'Diagnostics, level checks and exams',
    keywords: ['diagnostic', 'exam', 'level_exam', 'final_exam'],
    missingFamily: 'diagnostics_bank',
    priority: 15,
  },
  {
    id: 'audio_tts',
    label: 'Phrase/dialogue/question audio and TTS manifests',
    keywords: ['audio', 'tts', 'voice', 'regen_phrase_audio', 'upload_plan_audio'],
    missingFamily: 'audio_files',
    priority: 18,
  },
  {
    id: 'server_course_packs',
    label: 'Server downloadable packs, manifests and remote loader',
    keywords: ['course_pack', 'manifest', 'remote_loader', 'server', 'downloadable', 'pack_candidates'],
    missingFamily: 'english_feature_parity_packets',
    priority: 19,
  },
  {
    id: 'storage_cloud_isolation',
    label: 'Storage/cloud/cache isolation',
    keywords: ['storage', 'cloud_sync', 'cache', 'target_storage', 'studyTarget'],
    missingFamily: null,
    priority: 20,
  },
  {
    id: 'admin_website',
    label: 'Admin website controls, queues, diagnostics and rollback',
    keywords: ['admin', 'index.html', 'admin_website', 'reviewer', 'activation', 'rollback'],
    missingFamily: 'admin_website_parity_packets',
    priority: 21,
  },
  {
    id: 'research_best_practices',
    label: 'Target-language research and best-practice packets',
    keywords: ['research', 'best-practice', 'official_source', 'evidence', 'anti-calque'],
    missingFamily: 'target_research_best_practice_packets',
    priority: 22,
  },
];

function shouldExclude(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return [...EXCLUDE_PARTS].some((part) => normalized.includes(part));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir) || shouldExclude(path.relative(ROOT, dir))) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const relative = path.relative(ROOT, full).replace(/\\/g, '/');
    if (shouldExclude(relative)) continue;
    if (entry.isDirectory()) walk(full, files);
    else if (INCLUDE_EXT.has(path.extname(entry.name))) files.push(relative);
  }
  return files;
}

function readSmall(relative) {
  const full = path.join(ROOT, relative);
  const stat = fs.statSync(full);
  if (stat.size > 2_200_000) return '';
  return fs.readFileSync(full, 'utf8');
}

function fileCorpus(files) {
  return files.map((file) => {
    let text = '';
    try {
      text = readSmall(file);
    } catch {
      text = '';
    }
    return { file, lower: `${file}\n${text}`.toLowerCase() };
  });
}

function matchesFeature(entry, feature) {
  return feature.keywords.some((keyword) => entry.lower.includes(keyword.toLowerCase()));
}

function isFrenchEvidence(entry) {
  return /\bfr\b|french|studytarget|target[-_ ]?lang|gustav/.test(entry.lower);
}

function isEnglishEvidence(entry) {
  return /\ben\b|english|lesson_data|flashcard|course_pack/.test(entry.lower);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function classify(feature, state, englishFiles, frenchFiles, adminAtlas) {
  const missing = state.languages?.fr?.missingFamilies ?? [];
  const blockers = [];
  if (feature.missingFamily && missing.includes(feature.missingFamily)) {
    blockers.push(`missingFamily:${feature.missingFamily}`);
  }
  if (feature.id === 'core_lessons_32' && state.languages?.fr?.lessonSequenceWarning) {
    blockers.push('target_specific_scope_sequence_not_proven');
  }
  if (feature.id === 'admin_website' && adminAtlas?.status !== 'PASS') {
    blockers.push('admin_website_parity_atlas_hold');
  }
  if (feature.id === 'research_best_practices') {
    blockers.push('research_first_packets_required_before_generation_pass');
  }
  if (feature.id === 'flashcards' || feature.id === 'personal_practice') {
    blockers.push('current_french_seed_rows_may_be_lesson_fanout_only');
  }
  if (feature.id === 'audio_tts') {
    blockers.push('openai_tts_audio_manifest_not_complete');
  }
  if (!englishFiles.length) blockers.push('english_source_surface_not_mapped');
  if (!frenchFiles.length) blockers.push('french_target_evidence_missing');

  const status = blockers.some((b) => b.includes('not_mapped') || b.includes('missing')) ? 'BLOCK' : blockers.length ? 'HOLD' : 'NEEDS_REVIEW';
  return { status, blockers };
}

function buildReport() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  const adminAtlas = fs.existsSync(ADMIN_ATLAS_PATH)
    ? JSON.parse(fs.readFileSync(ADMIN_ATLAS_PATH, 'utf8'))
    : null;
  const files = SCAN_ROOTS.flatMap((root) => walk(path.join(ROOT, root)));
  const corpus = fileCorpus([...new Set(files)]);

  const features = FEATURE_DEFINITIONS.map((feature) => {
    const matched = corpus.filter((entry) => matchesFeature(entry, feature));
    const englishFiles = matched.filter(isEnglishEvidence).map((entry) => entry.file).slice(0, 80);
    const frenchFiles = matched.filter(isFrenchEvidence).map((entry) => entry.file).slice(0, 80);
    const tests = matched.filter((entry) => entry.file.startsWith('tests/')).map((entry) => entry.file).slice(0, 60);
    const appFiles = matched.filter((entry) => entry.file.startsWith('app/')).map((entry) => entry.file).slice(0, 60);
    const functionFiles = matched.filter((entry) => entry.file.startsWith('functions/src/')).map((entry) => entry.file).slice(0, 60);
    const adminFiles = matched.filter((entry) => entry.file.startsWith('admin/') || entry.file.includes('admin')).map((entry) => entry.file).slice(0, 40);
    const scriptFiles = matched.filter((entry) => entry.file.startsWith('scripts/')).map((entry) => entry.file).slice(0, 60);
    const classification = classify(feature, state, englishFiles, frenchFiles, adminAtlas);
    return {
      featureId: feature.id,
      label: feature.label,
      priority: feature.priority,
      status: classification.status,
      activationApproved: false,
      missingFamily: feature.missingFamily,
      blockers: classification.blockers,
      evidenceCounts: {
        matchedFiles: matched.length,
        englishFiles: englishFiles.length,
        frenchFiles: frenchFiles.length,
        tests: tests.length,
        appFiles: appFiles.length,
        functionFiles: functionFiles.length,
        adminFiles: adminFiles.length,
        scriptFiles: scriptFiles.length,
      },
      englishSourceFiles: englishFiles,
      frenchEvidenceFiles: frenchFiles,
      appFiles,
      functionFiles,
      adminFiles,
      scriptFiles,
      tests,
      nextAction: nextActionFor(feature.id),
    };
  });

  const summary = {
    featureCount: features.length,
    passCount: features.filter((f) => f.status === 'PASS').length,
    needsReviewCount: features.filter((f) => f.status === 'NEEDS_REVIEW').length,
    holdCount: features.filter((f) => f.status === 'HOLD').length,
    blockCount: features.filter((f) => f.status === 'BLOCK').length,
    activationApproved: false,
  };

  return {
    schemaVersion: 'gustav-english-feature-atlas-french-gap-matrix-v1',
    generatedAt: new Date().toISOString(),
    status: summary.passCount === features.length ? 'PASS' : 'HOLD',
    activationApproved: false,
    sourceRoots: SCAN_ROOTS,
    stateHash: sha256(fs.readFileSync(STATE_PATH, 'utf8')),
    adminAtlasHash: adminAtlas ? sha256(JSON.stringify(adminAtlas)) : null,
    summary,
    features,
    nextRequiredWork: [
      'Convert high-priority HOLD/BLOCK rows into builder work orders.',
      'Build target research packets before generating or promoting French content.',
      'Build French 32-lesson scope-and-sequence packet before accepting the current lesson order.',
      'Convert admin website atlas into English surface matrix and French equivalence matrix.',
      'Replace seed row fan-out for flashcard/personal_practice with feature-specific French banks.',
    ],
  };
}

function nextActionFor(featureId) {
  const map = {
    onboarding_study_target: 'Verify onboarding target selection, French icon/label, server prefetch and fallback behavior.',
    core_lessons_32: 'Build French scope-and-sequence packet, then accept/reorder/rebuild the 32 lesson graph.',
    lesson_theory: 'Create French theory builder and evidence-backed theory rows per lesson.',
    vocabulary_bank: 'Create French vocabulary bank with gender/articles/elision/register metadata.',
    grammar_hubs: 'Create French grammar hubs in the order required by French acquisition.',
    mistake_explanations: 'Port mistake explanation prompt pack and reject-before-return/cache gates.',
    compass_ai: 'Port Compass/dialog/situation prompts with French output contracts.',
    personal_practice: 'Build French practice queues from French mistake taxonomy and learning goals.',
    mistake_practice: 'Prove Mistake Practice reads/writes French target content and no English fallback.',
    flashcards: 'Build French flashcard starter packs and French-realities packs.',
    community_card_packs: 'Map collectible/community card product shape to French-specific packs.',
    daily_phrase: 'Build the French Daily Phrase bank and preserve its target gate.',
    diagnostics_exams: 'Build French diagnostic, level-check and exam pools.',
    audio_tts: 'Generate OpenAI TTS manifest and missing-audio gate for all voice-required French items.',
    server_course_packs: 'Verify pack manifests, hashes, loader paths, rollback and remote delivery for French.',
    storage_cloud_isolation: 'Run target storage/cloud/cache isolation gates across all French surfaces.',
    admin_website: 'Map every English learning admin path to French equivalent/global-only/block.',
    research_best_practices: 'Create trusted-source research packets for each feature before generation PASS.',
  };
  return map[featureId] ?? 'Create feature-specific builder, tests and target evidence.';
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav English Feature Atlas + French Gap Matrix',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Features: ${report.summary.featureCount}`,
    `- PASS: ${report.summary.passCount}`,
    `- NEEDS_REVIEW: ${report.summary.needsReviewCount}`,
    `- HOLD: ${report.summary.holdCount}`,
    `- BLOCK: ${report.summary.blockCount}`,
    `- activationApproved: ${report.activationApproved}`,
    '',
    '## Matrix',
    '',
    '| Priority | Feature | Status | Evidence | Main blockers |',
    '|---:|---|---|---:|---|',
  ];
  for (const feature of report.features.sort((a, b) => a.priority - b.priority)) {
    lines.push(`| ${feature.priority} | \`${feature.featureId}\` ${feature.label} | \`${feature.status}\` | ${feature.evidenceCounts.matchedFiles} | ${feature.blockers.join('<br>') || '-'} |`);
  }
  lines.push('', '## Next Required Work', '');
  for (const item of report.nextRequiredWork) lines.push(`- ${item}`);
  lines.push('', '## Priority Actions', '');
  for (const feature of report.features.slice().sort((a, b) => a.priority - b.priority).slice(0, 12)) {
    lines.push(`- \`${feature.featureId}\`: ${feature.nextAction}`);
  }
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_MD, renderMarkdown(report));
console.log(`Gustav feature parity matrix: ${report.status}`);
console.log(`Features: ${report.summary.featureCount}`);
console.log(`HOLD: ${report.summary.holdCount}`);
console.log(`BLOCK: ${report.summary.blockCount}`);
console.log(path.relative(ROOT, OUT_JSON).replace(/\\/g, '/'));
