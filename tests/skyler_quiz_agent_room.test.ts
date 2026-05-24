import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const ROOM = path.join(ROOT, 'tools', 'skyler_quiz_agent_room');
const SCRIPT = path.join(ROOT, 'scripts', 'skyler_quiz_pipeline.cjs');

function parseStringArray(text: string): string[] {
  return [...text.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
}

function parseExportedConstArray(source: string, name: string): string[] {
  const match = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`).exec(source);
  return match ? parseStringArray(match[1]) : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getActiveLocales(): string[] {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'source_locales.ts'), 'utf8');
  return unique([
    ...parseExportedConstArray(source, 'BASE_SOURCE_LOCALES'),
    ...parseExportedConstArray(source, 'HEISENBERG_BATCH_SOURCE_LOCALES'),
  ]);
}

function getFrenchSourceUiLocales(): string[] {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'french_content_source_gate.ts'), 'utf8');
  const match = /sourceLocaleUi:\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(source);
  return match ? unique(parseStringArray(match[1])) : ['ru', 'uk'];
}

const ACTIVE_LOCALES = getActiveLocales();
const FRENCH_SOURCE_UI_LOCALES = getFrenchSourceUiLocales();
const TODAY = new Date().toISOString().slice(0, 10);

function runSkyler(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

function explanationsFor(locales: string[]): Record<string, string[]> {
  return Object.fromEntries(locales.map(locale => [
    locale,
    [
      `${locale}: Bingo. “Could you say that again?” is a polite repair phrase; it asks for a repeat without sounding like a command.`,
      `${locale}: “Say me again” is a learner trap. In English, ask someone to say that again, not to “say me”.`,
      `${locale}: “Repeat me” sounds like the listener should copy you. For a missed phrase, use “Could you say that again?”.`,
      `${locale}: “Speak it back” feels like a machine instruction. In conversation, choose “Could you say that again?”.`,
    ],
  ]));
}

function localizedPromptsFor(locales: string[]): Record<string, string> {
  return Object.fromEntries(locales.map(locale => [
    locale,
    `${locale}: choose the natural source-backed option.`,
  ]));
}

function localeReviewsFor(locales: string[]) {
  return locales.map(locale => ({
    locale,
    method: 'research_adapted',
    reviewer: 'Locale Editor',
    notes: `${locale} adapted from the source notes, not directly translated.`,
    directTranslationUsed: false,
    adaptationBasis: 'source_notes',
    sourceIds: ['S1', 'S2'],
  }));
}

const ACTIVE_VISUAL_FAMILIES = ['forest', 'dark', 'neon', 'neonGreen', 'gold', 'coral', 'minimalLight', 'minimalDark'] as const;

function visualAssetsFor(categoryId: string) {
  return {
    status: 'queued',
    styleBasis: 'Queued text-free DALL-E topic plaque and compact icon prompts before quiz drafting, matching existing Phraseman thematic quiz art.',
    assets: ACTIVE_VISUAL_FAMILIES.map(family => ({
      family,
      plaquePrompt: `Generate a text-free ${family} topic plaque for ${categoryId}, with source-backed learning objects, left-safe copy space, and existing Phraseman thematic quiz polish.`,
      iconPrompt: `Generate a text-free ${family} compact topic icon for ${categoryId}, centered, readable at small size, and matching existing Phraseman thematic quiz logos.`,
    })),
  };
}

function validPack(target: 'en' | 'fr' | 'smartest', locales: string[] = target === 'fr' ? FRENCH_SOURCE_UI_LOCALES : ACTIVE_LOCALES) {
  return {
    schemaVersion: 'skyler-quiz-pack-v1',
    target,
    categoryId: 'source-backed-seed',
    categoryTitle: 'Source-backed seed',
    researchPolicy: {
      directTranslationUsed: false,
      notes: 'All copy was adapted from source notes.',
    },
    releasePolicy: {
      environment: 'dev-only',
      productionActivation: 'blocked_until_explicit_user_approval',
      notes: 'Seed pack remains dev-only until the user explicitly approves production exposure.',
    },
    visualAssets: visualAssetsFor('source-backed-seed'),
    styleProfile: {
      basedOnExistingPools: true,
      sampledFiles: ['app/quiz_data.ts', 'app/quiz_source_locale_payloads.ts'],
      promptPattern: 'Use human learner questions or short source-language phrases, not taxonomy labels or generic meta shells.',
      explanationPattern: 'Follow the current quiz explanation style: RU/UK warm per-choice feedback, other locales concise and specific.',
      readerRewardPattern: 'Each explanation gives a small lifehack, mnemonic, mini-scene, useful contrast, or source-backed fact instead of a dry glossary note.',
      distractorPattern: 'Use plausible learner-error distractors, false friends, wrong context, or same-domain confusions.',
    },
    socialListening: {
      status: 'validated',
      signals: [
        { source: 'provided_public_signal', text: 'Learners struggle with this pattern.' },
        { source: 'moderated_feedback_export', text: 'Students repeatedly ask for clearer practice on this pattern.' },
      ],
    },
    officialSources: [
      {
        id: 'S1',
        title: 'Official source one',
        url: 'https://example.org/one',
        tier: 'A',
        publisherType: 'official_institution',
        usedFor: 'Primary rule/fact verification.',
        limitations: 'None known for this seed check.',
        checkedAt: TODAY,
      },
      {
        id: 'S2',
        title: 'Official source two',
        url: 'https://reference.example.net/two',
        tier: 'B',
        publisherType: 'expert_edited_reference',
        usedFor: 'Cross-checking rule/fact wording.',
        limitations: 'Secondary reference only.',
        checkedAt: TODAY,
      },
    ],
    claims: [
      {
        id: 'C1',
        type: target === 'smartest' ? 'fact' : 'usage_rule',
        text: 'The correct option is natural for the tested context.',
        sourceIds: ['S1', 'S2'],
        verificationStatus: 'verified',
        sourceComparison: 'S1 and S2 agree on the usage/fact needed for this item.',
      },
      {
        id: 'C2',
        type: 'answer_key',
        text: 'Choice 0 is the only correct answer for this MCQ item.',
        itemId: 'source-backed-seed-001',
        answerIndex: 0,
        sourceIds: ['S1', 'S2'],
        verificationStatus: 'verified',
        sourceComparison: 'S1 and S2 support choice 0 as correct and do not support the distractors.',
      },
    ],
    localeReviews: localeReviewsFor(locales),
    ...(target === 'fr' ? {
      frenchGate: {
        productionActivation: 'blocked_until_source_gate_approval',
        sourceUiLocales: FRENCH_SOURCE_UI_LOCALES,
      },
    } : {}),
    ...(target === 'smartest' ? {
      trackPolicy: {
        smartestIsContentVertical: true,
        doesNotUseStudyTarget: true,
      },
    } : {}),
    items: [
      {
        id: 'source-backed-seed-001',
        type: 'mcq',
        prompt: 'Which option is the natural answer?',
        localizedPrompts: localizedPromptsFor(locales),
        choices: ['Could you say that again?', 'Say me again.', 'Repeat me.', 'Speak it back.'],
        correctIndex: 0,
        learningGoal: 'Choose a natural source-backed answer.',
        ...(target === 'smartest' ? { factTag: 'source_backed_seed_fact' } : { skillTag: 'conversation_repair' }),
        sourceIds: ['S1', 'S2'],
        claimIds: ['C1', 'C2'],
        choiceRationales: [
          'The correct choice is natural in the tested context and supported by both sources.',
          'This distractor is plausible for learners but uses the wrong verb pattern.',
          'This distractor changes the meaning and is not supported by the sources.',
          'This distractor is not idiomatic for the tested context.',
        ],
        qualityChecks: {
          singleCorrect: true,
          distractorsPlausible: true,
          noAmbiguity: true,
          sourceBacked: true,
        },
        explanations: explanationsFor(locales),
      },
    ],
  };
}

describe('Skyler quiz agent room', () => {
  it('declares the source-gated room protocol and all active interface locales', () => {
    const readme = fs.readFileSync(path.join(ROOM, 'README.md'), 'utf8');
    const room = fs.readFileSync(path.join(ROOM, 'ROOM.md'), 'utf8');
    const styleContract = fs.readFileSync(path.join(ROOM, 'QUIZ_STYLE_CONTRACT.md'), 'utf8');

    expect(readme).toContain('Direct translation without research is forbidden');
    expect(readme).toContain('styleProfile');
    expect(readme).toContain('readerRewardPattern');
    expect(readme).toContain('at least two distinct social signals');
    expect(room).toContain('"Smartest" should be modeled as a content vertical');
    expect(room).toContain('French quiz packs cannot reuse the English quiz bank');
    expect(room).toContain('Social posts are pain signals');
    expect(room).toContain('QUIZ_STYLE_CONTRACT.md');
    expect(room).toContain('styleProfile');
    expect(room).toContain('readerRewardPattern');
    expect(styleContract).toContain('app/quiz_data.ts');
    expect(styleContract).toContain('app/quiz_source_locale_payloads.ts');
    expect(styleContract).toContain('Which word fits');
    expect(styleContract).toContain('Kitchen — object');
    expect(styleContract).toContain('Correct/Wrong label prefixes');
    expect(styleContract).toContain('reader-worthy');
    expect(styleContract).toContain('readerRewardPattern');
    expect(styleContract).toContain('source-backed fact');
    expect(styleContract).toContain('formulaic pseudo-lifehack');
    expect(styleContract).toContain('простое базовое слово');
    expect(styleContract).toContain('подсказка говорит');
    for (const locale of ACTIVE_LOCALES) {
      expect(room).toContain(locale);
    }
  });

  it('ships a prompt for every Skyler office role', () => {
    const promptDir = path.join(ROOM, 'prompts');
    const promptFiles = fs.readdirSync(promptDir).filter(file => file.endsWith('.md'));
    const writerPrompt = fs.readFileSync(path.join(promptDir, '60_ENGLISH_QUIZ_WRITER.md'), 'utf8');
    const localePrompt = fs.readFileSync(path.join(promptDir, '90_LOCALE_EDITOR.md'), 'utf8');
    const adversaryPrompt = fs.readFileSync(path.join(promptDir, '95_DISTRACTOR_ADVERSARY.md'), 'utf8');
    const smartestPrompt = fs.readFileSync(path.join(promptDir, '80_SMARTEST_WRITER.md'), 'utf8');

    expect(promptFiles).toEqual(expect.arrayContaining([
      '00_SKYLER_ORCHESTRATOR.md',
      '10_SOCIAL_LISTENING_ANALYST.md',
      '20_TOPIC_TAXONOMIST.md',
      '30_SOURCE_LIBRARIAN.md',
      '40_FACT_CHECKER.md',
      '50_QUIZ_ARCHITECT.md',
      '60_ENGLISH_QUIZ_WRITER.md',
      '70_FRENCH_QUIZ_WRITER.md',
      '80_SMARTEST_WRITER.md',
      '90_LOCALE_EDITOR.md',
      '95_DISTRACTOR_ADVERSARY.md',
      '99_QA_GATEKEEPER.md',
    ]));
    expect(writerPrompt).toContain('QUIZ_STYLE_CONTRACT.md');
    expect(writerPrompt).toContain('styleProfile');
    expect(writerPrompt).toContain('readerRewardPattern');
    expect(localePrompt).toContain('Какое слово');
    expect(adversaryPrompt).toContain('Kitchen — object');
    expect(smartestPrompt).toContain('at least two distinct source IDs');
    expect(smartestPrompt).not.toContain('unless the source is a');
    expect(smartestPrompt).not.toContain('one-source exception');
  });

  it('passes the protocol check command exposed in package scripts', () => {
    const result = runSkyler(['--check-protocol']);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(parsed.activeInterfaceLocales).toEqual(ACTIVE_LOCALES);
    expect(parsed.activeInterfaceLocaleSource).toBe('app/source_locales.ts');
    expect(parsed.frenchSourceUiLocales).toEqual(FRENCH_SOURCE_UI_LOCALES);
    expect(parsed.frenchSourceUiLocaleSource).toBe('app/french_content_source_gate.ts');

    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['skyler:quiz']).toBe('node ./scripts/skyler_quiz_pipeline.cjs');
    expect(pkg.scripts['skyler:quiz:check']).toBe('node ./scripts/skyler_quiz_pipeline.cjs --check-protocol');
  });

  it('keeps the schema template from teaching placeholder explanations', () => {
    const schema = fs.readFileSync(path.join(ROOM, 'templates', 'quiz_pack.schema.md'), 'utf8');
    const categoryBrief = fs.readFileSync(path.join(ROOM, 'templates', 'category_brief.md'), 'utf8');

    expect(schema).not.toContain('["...", "...", "...", "..."]');
    expect(schema).toContain('real adapted explanations');
    expect(schema).toContain('styleProfile');
    expect(schema).toContain('readerRewardPattern');
    expect(schema).toContain('QUIZ_STYLE_CONTRACT.md');
    expect(schema).toContain('Which word fits');
    expect(schema).toContain('Kitchen — object');
    expect(schema).toContain('Correct/Wrong label prefixes');
    expect(schema).toContain('reader-worthy');
    expect(schema).toContain('Target-Specific Blocks');
    expect(schema).toContain('Never include both on the same item');
    expect(schema).toContain('Evidence Date And Coverage Rules');
    expect(schema).toContain('kebab-case categoryId');
    expect(schema).toContain('researchPolicy.notes');
    expect(schema).toContain('Prompt, choices, and learningGoal');
    expect(schema).toContain('target-appropriate content claim');
    expect(schema).toContain('locale review needs at least two distinct source IDs');
    expect(schema).toContain('stable source, claim, and item IDs');
    expect(schema).toContain('stable skillTag/factTag');
    expect(schema).toContain('reviewer owner');
    expect(schema).toContain('distinct claimIds');
    expect(schema).toContain('does not count as cross-checking');
    expect(schema).toContain('unique source URLs');
    expect(schema).toContain('distinct source hosts');
    expect(schema).toContain('unused official sources');
    expect(schema).toContain('at least two distinct social signals');
    expect(schema).toContain('distinct social signals');
    expect(schema).toContain('unique per choice');
    expect(schema).toContain('stable answer_key itemId');
    expect(schema).toContain('itemId');
    expect(schema).toContain('answerIndex');
    expect(categoryBrief).toContain('at least two distinct social signals');
    expect(categoryBrief).toContain('Single-signal');
  });

  it('keeps discover candidates seed-only until demand has two distinct social signals', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-discover-'));
    const singleSignalPath = path.join(tmpDir, 'single-signal.json');
    fs.writeFileSync(singleSignalPath, JSON.stringify([
      { source: 'provided_public_signal', text: 'Learners ask for help with this pattern.' },
    ]), 'utf8');

    const singleResult = runSkyler([
      '--mode', 'discover',
      '--target', 'en',
      '--social-input', singleSignalPath,
      '--out-root', tmpDir,
      '--run-id', 'single-social',
    ]);
    expect(singleResult.status).toBe(0);
    const singleParsed = JSON.parse(singleResult.stdout);
    expect(singleParsed.candidates.every((candidate: { status: string }) => candidate.status === 'needs_sources')).toBe(true);
    const singleMarkdown = fs.readFileSync(path.join(tmpDir, 'single-social', 'topic_candidates.md'), 'utf8');
    expect(singleMarkdown).toContain('Distinct social signals: 1');
    expect(singleMarkdown).toContain('seed-only discovery');

    const repeatedTextPath = path.join(tmpDir, 'repeated-text-signals.json');
    fs.writeFileSync(repeatedTextPath, JSON.stringify([
      {
        source: 'provided_public_signal',
        text: 'Learners ask for help with this pattern.',
        url: 'https://example.org/public-thread',
      },
      {
        source: 'provided_public_signal',
        text: 'Learners ask for help with this pattern.',
        url: 'https://reference.example.net/copied-thread',
      },
    ]), 'utf8');

    const repeatedTextResult = runSkyler([
      '--mode', 'discover',
      '--target', 'en',
      '--social-input', repeatedTextPath,
      '--out-root', tmpDir,
      '--run-id', 'repeated-text-social',
    ]);
    expect(repeatedTextResult.status).toBe(0);
    const repeatedTextParsed = JSON.parse(repeatedTextResult.stdout);
    expect(repeatedTextParsed.candidates.every((candidate: { status: string }) => candidate.status === 'needs_sources')).toBe(true);
    const repeatedTextMarkdown = fs.readFileSync(path.join(tmpDir, 'repeated-text-social', 'topic_candidates.md'), 'utf8');
    expect(repeatedTextMarkdown).toContain('Distinct social signals: 1');

    const placeholderSignalPath = path.join(tmpDir, 'placeholder-signals.json');
    fs.writeFileSync(placeholderSignalPath, JSON.stringify([
      { source: 'TODO', text: 'Learners ask for help with this pattern.' },
      { source: 'moderated_feedback_export', text: 'Students repeatedly struggle with this same pattern.' },
    ]), 'utf8');

    const placeholderResult = runSkyler([
      '--mode', 'discover',
      '--target', 'en',
      '--social-input', placeholderSignalPath,
      '--out-root', tmpDir,
      '--run-id', 'placeholder-social',
    ]);
    expect(placeholderResult.status).toBe(0);
    const placeholderParsed = JSON.parse(placeholderResult.stdout);
    expect(placeholderParsed.candidates.every((candidate: { status: string }) => candidate.status === 'needs_sources')).toBe(true);
    const placeholderMarkdown = fs.readFileSync(path.join(tmpDir, 'placeholder-social', 'topic_candidates.md'), 'utf8');
    expect(placeholderMarkdown).toContain('Distinct social signals: 1');

    const twoSignalsPath = path.join(tmpDir, 'two-signals.json');
    fs.writeFileSync(twoSignalsPath, JSON.stringify([
      { source: 'provided_public_signal', text: 'Learners ask for help with this pattern.' },
      { source: 'moderated_feedback_export', text: 'Students repeatedly struggle with this same pattern.' },
    ]), 'utf8');

    const twoResult = runSkyler([
      '--mode', 'discover',
      '--target', 'en',
      '--social-input', twoSignalsPath,
      '--out-root', tmpDir,
      '--run-id', 'two-social',
    ]);
    expect(twoResult.status).toBe(0);
    const twoParsed = JSON.parse(twoResult.stdout);
    expect(twoParsed.candidates.every((candidate: { status: string }) => candidate.status === 'ready')).toBe(true);
  });

  it('uses the full category brief template during brief generation', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-brief-'));
    const result = runSkyler([
      '--mode', 'brief',
      '--target', 'en',
      '--category', 'conversation-repair',
      '--out-root', tmpDir,
      '--run-id', 'brief-template',
    ]);
    expect(result.status).toBe(0);

    const categoryBrief = fs.readFileSync(path.join(tmpDir, 'brief-template', 'category_brief.md'), 'utf8');
    const qualityGates = fs.readFileSync(path.join(tmpDir, 'brief-template', 'quality_gates.md'), 'utf8');
    expect(categoryBrief).toContain('Category id: `conversation-repair`');
    expect(categoryBrief).toContain('Target: `en`');
    expect(categoryBrief).toContain('at least two distinct social signals');
    expect(categoryBrief).toContain('## Source Matrix');
    expect(categoryBrief).toContain('## Blockers');
    expect(qualityGates).toContain('at least two distinct social signals');
  });

  it('blocks draft packs that use direct translation or omit source evidence', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-pack.json');
    fs.writeFileSync(draftPath, JSON.stringify({
      schemaVersion: 'skyler-quiz-pack-v1',
      target: 'smartest',
      categoryId: 'seed',
      researchPolicy: { directTranslationUsed: true },
      officialSources: [],
      localeReviews: [],
      items: [],
    }), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('BLOCK');
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'policy.directTranslation',
      'sources.count',
      'items.count',
    ]));
  });

  it('blocks placeholder category metadata and missing research notes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-category-metadata-pack.json');
    const pack = validPack('en') as any;
    pack.categoryId = 'Bad Category Id';
    pack.categoryTitle = '...';
    pack.researchPolicy.notes = 'TODO';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'schema.categoryId.format',
      'schema.categoryTitle',
      'policy.notes',
    ]));
  });

  it('blocks duplicate social signals pretending to validate demand', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'duplicate-social-signal-pack.json');
    const pack = validPack('en') as any;
    pack.socialListening.signals[0].url = 'https://example.org/public-thread';
    pack.socialListening.signals.push({
      ...pack.socialListening.signals[0],
      url: 'https://reference.example.net/copied-thread',
    });
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'socialListening.signals.2.duplicate',
    );
  });

  it('blocks validated demand with fewer than two social signals', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'single-social-signal-pack.json');
    const pack = validPack('en') as any;
    pack.socialListening.signals = [pack.socialListening.signals[0]];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'socialListening.signals.count',
    );
  });

  it('blocks unstable source, claim, and item IDs', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'unstable-ids-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources[0].id = '<source>';
    pack.claims[0].id = 'Bad Claim Id';
    pack.items[0].id = 'Bad Item Id';
    pack.claims[1].itemId = 'Bad Item Id';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'sources.0.id',
      'claims.0.id',
      'claims.1.itemId',
      'items.0.id',
    ]));
  });

  it('accepts a fully sourced English pack for all active Heisenberg locales', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'good-pack.json');
    fs.writeFileSync(draftPath, JSON.stringify(validPack('en')), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('GO');
    expect(parsed.failures).toEqual([]);
  });

  it('blocks language packs without existing-pool style evidence', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-style-profile-pack.json');
    const pack = validPack('en') as any;
    delete pack.styleProfile;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('styleProfile');
  });

  it('blocks language packs without a reader reward style pattern', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-reader-reward-pattern-pack.json');
    const pack = validPack('en') as any;
    delete pack.styleProfile.readerRewardPattern;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'styleProfile.readerRewardPattern',
    );
  });

  it('blocks generic thematic prompt shells and flat explanation labels', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-style-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].prompt = 'Kitchen — object. It cuts vegetables.';
    pack.items[0].localizedPrompts.ru = 'Какое слово подходит: этим режут овощи?';
    pack.items[0].localizedPrompts.uk = 'Яке слово підходить: цим ріжуть овочі?';
    pack.items[0].explanations.ru[0] = 'Верно: knife — это нож для овощей.';
    pack.items[0].explanations.uk[1] = 'Ні: cup не ріже овочі.';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.prompt.style',
      'source-backed-seed-001.localizedPrompts.ru.style',
      'source-backed-seed-001.localizedPrompts.uk.style',
      'source-backed-seed-001.explanations.ru.0.style',
      'source-backed-seed-001.explanations.uk.1.style',
    ]));
  });

  it('blocks dry dictionary-gloss explanations in language packs', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'dictionary-gloss-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Бинго! Knife — это нож. Простое базовое слово: a knife.';
    pack.items[0].explanations.uk[1] = 'Пастка! Підказка говорить про ніж, тому треба knife.';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.explanations.ru.0.style',
      'source-backed-seed-001.explanations.uk.1.style',
    ]));
  });

  it('blocks French packs that try to add non-source-gate interface locales', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-french-pack.json');
    fs.writeFileSync(draftPath, JSON.stringify(validPack('fr', [...FRENCH_SOURCE_UI_LOCALES, 'es'])), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('BLOCK');
    expect(parsed.failures.some((failure: { id: string }) => failure.id.includes('unsupported'))).toBe(true);
  });

  it('blocks cross-track metadata between language packs, French gate, and Smartest', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const englishDraftPath = path.join(tmpDir, 'mixed-english-pack.json');
    const englishPack = validPack('en') as any;
    englishPack.trackPolicy = {
      smartestIsContentVertical: true,
      doesNotUseStudyTarget: true,
    };
    englishPack.frenchGate = {
      productionActivation: 'blocked_until_source_gate_approval',
      sourceUiLocales: FRENCH_SOURCE_UI_LOCALES,
    };
    englishPack.items[0].factTag = 'smartest_fact_leak';
    fs.writeFileSync(englishDraftPath, JSON.stringify(englishPack), 'utf8');

    const englishResult = runSkyler(['--mode', 'gate', '--draft', englishDraftPath]);
    expect(englishResult.status).toBe(1);
    const englishParsed = JSON.parse(englishResult.stdout);
    expect(englishParsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'trackIsolation.trackPolicy',
      'trackIsolation.frenchGate',
      'source-backed-seed-001.factTag.forbidden',
    ]));

    const smartestDraftPath = path.join(tmpDir, 'mixed-smartest-pack.json');
    const smartestPack = validPack('smartest') as any;
    smartestPack.frenchGate = {
      productionActivation: 'blocked_until_source_gate_approval',
      sourceUiLocales: FRENCH_SOURCE_UI_LOCALES,
    };
    smartestPack.items[0].skillTag = 'conversation_repair';
    fs.writeFileSync(smartestDraftPath, JSON.stringify(smartestPack), 'utf8');

    const smartestResult = runSkyler(['--mode', 'gate', '--draft', smartestDraftPath]);
    expect(smartestResult.status).toBe(1);
    const smartestParsed = JSON.parse(smartestResult.stdout);
    expect(smartestParsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'trackIsolation.frenchGate',
      'source-backed-seed-001.skillTag.forbidden',
    ]));
  });

  it('blocks unstable target metadata tags', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));

    const englishDraftPath = path.join(tmpDir, 'unstable-skill-tag-pack.json');
    const englishPack = validPack('en') as any;
    englishPack.items[0].skillTag = 'Bad Skill Tag';
    fs.writeFileSync(englishDraftPath, JSON.stringify(englishPack), 'utf8');

    const englishResult = runSkyler(['--mode', 'gate', '--draft', englishDraftPath]);
    expect(englishResult.status).toBe(1);
    const englishParsed = JSON.parse(englishResult.stdout);
    expect(englishParsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.skillTag',
    );

    const smartestDraftPath = path.join(tmpDir, 'unstable-fact-tag-pack.json');
    const smartestPack = validPack('smartest') as any;
    smartestPack.items[0].factTag = '<fact tag>';
    fs.writeFileSync(smartestDraftPath, JSON.stringify(smartestPack), 'utf8');

    const smartestResult = runSkyler(['--mode', 'gate', '--draft', smartestDraftPath]);
    expect(smartestResult.status).toBe(1);
    const smartestParsed = JSON.parse(smartestResult.stdout);
    expect(smartestParsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.factTag',
    );
  });

  it('blocks packs without item-level ambiguity and distractor checks', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'weak-item-pack.json');
    const pack = validPack('en') as any;
    delete pack.items[0].qualityChecks;
    pack.items[0].sourceIds = ['S1'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.qualityChecks',
      'source-backed-seed-001.sourceIds',
    ]));
  });

  it('blocks placeholder item prompt, choices, and learning goal', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'placeholder-item-copy-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].prompt = 'TODO';
    pack.items[0].learningGoal = '...';
    pack.items[0].choices[1] = '<choice>';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.prompt',
      'source-backed-seed-001.learningGoal',
      'source-backed-seed-001.choices.1',
    ]));
  });

  it('blocks missing or copy-pasted localized item prompts', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));

    const missingDraftPath = path.join(tmpDir, 'missing-localized-prompts-pack.json');
    const missingPack = validPack('en') as any;
    delete missingPack.items[0].localizedPrompts;
    fs.writeFileSync(missingDraftPath, JSON.stringify(missingPack), 'utf8');

    const missingResult = runSkyler(['--mode', 'gate', '--draft', missingDraftPath]);
    expect(missingResult.status).toBe(1);
    const missingParsed = JSON.parse(missingResult.stdout);
    expect(missingParsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.localizedPrompts',
    );

    const fallbackDraftPath = path.join(tmpDir, 'fallback-localized-prompts-pack.json');
    const fallbackPack = validPack('en') as any;
    fallbackPack.items[0].localizedPrompts.ru = fallbackPack.items[0].prompt;
    fallbackPack.items[0].localizedPrompts.uk = fallbackPack.items[0].localizedPrompts.es;
    fs.writeFileSync(fallbackDraftPath, JSON.stringify(fallbackPack), 'utf8');

    const fallbackResult = runSkyler(['--mode', 'gate', '--draft', fallbackDraftPath]);
    expect(fallbackResult.status).toBe(1);
    const fallbackParsed = JSON.parse(fallbackResult.stdout);
    expect(fallbackParsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.localizedPrompts.ru.fallback',
      'source-backed-seed-001.localizedPrompts.es.duplicateLocaleCopy',
    ]));
  });

  it('blocks packs without verified claim-level source coverage', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'claimless-pack.json');
    const pack = validPack('en') as any;
    pack.claims = [];
    pack.items[0].claimIds = ['MISSING'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'claims.count',
      'source-backed-seed-001.claimIds.MISSING',
    ]));
  });

  it('blocks duplicate item claimIds pretending to add evidence coverage', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'duplicate-item-claim-ids-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].claimIds = ['C1', 'C1', 'C2'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.claimIds.duplicate',
    );
  });

  it('blocks items without a verified answer_key claim', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-answer-key-claim-pack.json');
    const pack = validPack('en') as any;
    pack.claims = pack.claims.filter((claim: { type: string }) => claim.type !== 'answer_key');
    pack.items[0].claimIds = ['C1'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.claimIds.answerKey',
    );
  });

  it('blocks items that cite only an answer_key without a content claim', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'answer-key-only-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].claimIds = ['C2'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.claimIds.contentClaim',
    );
  });

  it('blocks content claim types that do not match the target', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const englishDraftPath = path.join(tmpDir, 'wrong-english-claim-type-pack.json');
    const englishPack = validPack('en') as any;
    englishPack.claims.find((claim: { id: string }) => claim.id === 'C1').type = 'fact';
    fs.writeFileSync(englishDraftPath, JSON.stringify(englishPack), 'utf8');

    const englishResult = runSkyler(['--mode', 'gate', '--draft', englishDraftPath]);
    expect(englishResult.status).toBe(1);
    const englishParsed = JSON.parse(englishResult.stdout);
    expect(englishParsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.claimIds.contentClaim',
    );

    const smartestDraftPath = path.join(tmpDir, 'wrong-smartest-claim-type-pack.json');
    const smartestPack = validPack('smartest') as any;
    smartestPack.claims.find((claim: { id: string }) => claim.id === 'C1').type = 'usage_rule';
    fs.writeFileSync(smartestDraftPath, JSON.stringify(smartestPack), 'utf8');

    const smartestResult = runSkyler(['--mode', 'gate', '--draft', smartestDraftPath]);
    expect(smartestResult.status).toBe(1);
    const smartestParsed = JSON.parse(smartestResult.stdout);
    expect(smartestParsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.claimIds.C1.contentClaimType',
      'source-backed-seed-001.claimIds.contentClaim',
    ]));
  });

  it('allows supplemental source-backed fact hooks in language packs without replacing usage claims', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'source-backed-reader-reward-fact-pack.json');
    const pack = validPack('en') as any;
    pack.claims.push({
      id: 'C3',
      text: 'This verified reader-reward fact can support an optional historical or etymology hook.',
      type: 'fact',
      sourceIds: ['S1', 'S2'],
      verificationStatus: 'verified',
      sourceComparison: 'Both sources support the same optional reader-reward fact, and the item still keeps its usage-rule claim.',
    });
    pack.items[0].claimIds = ['C1', 'C2', 'C3'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.decision).toBe('GO');
  });

  it('blocks answer_key claims that do not match item correctIndex', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'misaligned-answer-key-pack.json');
    const pack = validPack('en') as any;
    pack.claims.find((claim: { id: string }) => claim.id === 'C2').answerIndex = 1;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.claimIds.C2.answerIndex',
      'source-backed-seed-001.claimIds.answerKeyAlignment',
    ]));
  });

  it('blocks answer_key claims without a valid answerIndex', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-answer-index-pack.json');
    const pack = validPack('en') as any;
    delete pack.claims.find((claim: { id: string }) => claim.id === 'C2').answerIndex;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('claims.1.answerIndex');
  });

  it('blocks answer_key claims that are not bound to the item id', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'wrong-answer-key-item-pack.json');
    const pack = validPack('en') as any;
    pack.claims.find((claim: { id: string }) => claim.id === 'C2').itemId = 'another-item-id';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.claimIds.C2.itemId',
      'source-backed-seed-001.claimIds.answerKeyAlignment',
    ]));
  });

  it('blocks answer_key claims without an itemId', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-answer-key-item-id-pack.json');
    const pack = validPack('en') as any;
    delete pack.claims.find((claim: { id: string }) => claim.id === 'C2').itemId;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('claims.1.itemId');
  });

  it('blocks source checkedAt dates that are invalid or in the future', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-source-dates-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources[0].checkedAt = '2026-13-01';
    pack.officialSources[1].checkedAt = '2999-01-01';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'sources.0.checkedAt',
      'sources.1.checkedAt',
    ]));
  });

  it('blocks items whose sourceIds do not cover the cited claim sources', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'claim-source-mismatch-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources.push({
      id: 'S3',
      title: 'Official source three',
      url: 'https://example.org/three',
      tier: 'B',
      publisherType: 'educational_publisher',
      usedFor: 'Additional distractor comparison only.',
      limitations: 'Does not support the core claim.',
      checkedAt: TODAY,
    });
    pack.items[0].sourceIds = ['S1', 'S3'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.claimIds.C1.sourceCoverage',
    );
  });

  it('blocks duplicate sourceIds pretending to be cross-checking', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'duplicate-source-ids-pack.json');
    const pack = validPack('en') as any;
    pack.claims[0].sourceIds = ['S1', 'S1'];
    pack.items[0].sourceIds = ['S1', 'S1'];
    pack.localeReviews[0].sourceIds = ['S1', 'S1'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'claims.0.sourceIds.duplicate',
      'claims.0.sourceIds.distinctCount',
      'source-backed-seed-001.sourceIds.duplicate',
      'source-backed-seed-001.sourceIds.distinctCount',
      'localeReviews.0.sourceIds.duplicate',
      'localeReviews.0.sourceIds.distinctCount',
    ]));
  });

  it('blocks locale reviews with fewer than two source IDs', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'single-source-locale-review-pack.json');
    const pack = validPack('en') as any;
    pack.localeReviews[0].sourceIds = ['S1'];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('localeReviews.0.sourceIds');
  });

  it('blocks duplicate official source URLs pretending to be cross-checking', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'duplicate-source-url-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources[1].url = 'https://example.org/one/#same-source';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('sources.1.url.duplicate');
  });

  it('blocks same-host official sources pretending to be independent cross-checking', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'same-host-source-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources[1].url = 'https://www.example.org/another-official-page';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('sources.1.host.duplicate');
  });

  it('blocks unused official sources pretending to strengthen cross-checking', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'unused-official-source-pack.json');
    const pack = validPack('en') as any;
    pack.officialSources.push({
      id: 'S3',
      title: 'Official source three',
      url: 'https://unused-reference.example.com/three',
      tier: 'B',
      publisherType: 'educational_publisher',
      usedFor: 'Listed as backup but not attached to any claim.',
      limitations: 'Unused source should not count as evidence.',
      checkedAt: TODAY,
    });
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('sources.2.unusedClaim');
  });

  it('blocks locale reviews that look like unchecked direct translation', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'bad-locale-review-pack.json');
    const pack = validPack('en') as any;
    pack.localeReviews[0].directTranslationUsed = true;
    delete pack.localeReviews[1].adaptationBasis;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'localeReviews.0.directTranslationUsed',
      'localeReviews.1.adaptationBasis',
    ]));
  });

  it('blocks locale reviews without reviewer accountability', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'missing-locale-reviewer-pack.json');
    const pack = validPack('en') as any;
    delete pack.localeReviews[0].reviewer;
    pack.localeReviews[1].reviewer = 'TODO';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'localeReviews.0.reviewer',
      'localeReviews.1.reviewer',
    ]));
  });

  it('blocks placeholder evidence metadata in signals, sources, claims, and locale reviews', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'placeholder-evidence-pack.json');
    const pack = validPack('en') as any;
    pack.socialListening.signals[0].source = 'TODO';
    pack.socialListening.signals[0].text = 'TODO';
    pack.socialListening.signals[0].url = 'not-a-url';
    pack.officialSources[0].title = '<source title>';
    pack.officialSources[0].usedFor = 'TODO';
    pack.officialSources[1].url = 'example dot org';
    pack.officialSources[1].limitations = '...';
    pack.claims[0].text = 'TBD';
    pack.claims[0].sourceComparison = '<compare sources>';
    pack.localeReviews[0].notes = '...';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'socialListening.signals.0.source',
      'socialListening.signals.0.text',
      'socialListening.signals.0.url',
      'sources.0.title',
      'sources.0.usedFor',
      'sources.1.url',
      'sources.1.limitations',
      'claims.0.text',
      'claims.0.sourceComparison',
      'localeReviews.0.notes',
    ]));
  });

  it('blocks copied locale reviews and identical explanation bundles across locales', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'copied-locale-pack.json');
    const pack = validPack('en') as any;
    const duplicateReviewIndex = pack.localeReviews.length;
    pack.localeReviews[1].notes = pack.localeReviews[0].notes;
    pack.localeReviews.push({ ...pack.localeReviews[0] });
    pack.items[0].explanations.uk = [...pack.items[0].explanations.ru];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'localeReviews.1.notes.duplicate',
      `localeReviews.${duplicateReviewIndex}.duplicate`,
      'source-backed-seed-001.explanations.uk.duplicateLocaleCopy',
    ]));
  });

  it('blocks placeholder explanations and missing choice rationales', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'placeholder-copy-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].choiceRationales = ['...', 'TODO', 'short', ''];
    pack.items[0].explanations.ru[0] = '...';
    pack.items[0].explanations.uk[1] = 'TODO';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.choiceRationales.0',
      'source-backed-seed-001.choiceRationales.1',
      'source-backed-seed-001.explanations.ru.0',
      'source-backed-seed-001.explanations.uk.1',
    ]));
  });

  it('blocks thin explanations without a real per-choice reader reward', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'thin-reader-reward-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Correct and source-backed.';
    pack.items[0].explanations.uk[1] = 'Це поганий варіант, бо речення звучить неприродно.';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.explanations.ru.0.style',
      'source-backed-seed-001.explanations.ru.0.readerReward',
      'source-backed-seed-001.explanations.uk.1.readerReward',
    ]));
  });

  it('blocks formulaic pseudo-lifehacks in learner-facing explanations', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'formulaic-reader-reward-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Бинго! Could you say that again? — вежливая просьба. polite + repeat + question = Could you say that again?';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.explanations.ru.0.style',
    );
  });

  it('blocks forced lifehack labels in explanations', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'forced-lifehack-label-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Бинго! Could you say that again? — вежливая просьба. Лайфхак: repeat и polite почти ходят парой.';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.explanations.ru.0.readerReward',
    );
  });

  it('blocks vague mini-scenes that do not explain the language choice', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'vague-scene-reward-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Бинго! Could you say that again? Представь разговор, глоток воды, и слово уже на месте.';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.explanations.ru.0.readerReward',
    );
  });

  it('blocks invented phrase context in explanations', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'invented-phrase-context-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].explanations.ru[0] = 'Бинго! Could you say that again? В этой фразе овощи становятся маленькими кусочками, поэтому ответ Could you say that again?';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.explanations.ru.0.readerReward',
    );
  });

  it('blocks correct-answer explanations that list multiple distractors', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'distractor-list-correct-feedback-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].choices = ['Could you say that again?', 'Say it later', 'Repeat kitchen', 'Chair'];
    pack.items[0].correctIndex = 0;
    pack.items[0].explanations.ru[0] = 'Бинго! Could you say that again? Не Say it later, не Repeat kitchen и точно не Chair — правильный ответ Could you say that again?';
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain(
      'source-backed-seed-001.explanations.ru.0.readerReward',
    );
  });

  it('blocks full-phrase prompts when choices are only single words', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'phrase-prompt-single-word-choices-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].prompt = 'How do you say “he is a great cook”?';
    pack.items[0].localizedPrompts.ru = 'Как сказать «он отличный повар»?';
    pack.items[0].choices = ['cook', 'cooker', 'cooking', 'kitchen'];
    pack.items[0].correctIndex = 0;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.prompt.choiceGranularity',
      'source-backed-seed-001.localizedPrompts.ru.choiceGranularity',
    ]));
  });

  it('does not treat source-locale classifier terms as full-phrase prompts', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'classifier-term-single-word-choice-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].localizedPrompts.vi = '“Con dao” nói bằng tiếng Anh là gì?';
    pack.items[0].choices = ['knife', 'cup', 'bowl', 'chair'];
    pack.items[0].correctIndex = 0;
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).not.toContain(
      'source-backed-seed-001.localizedPrompts.vi.choiceGranularity',
    );
  });

  it('blocks copied per-choice rationales and explanations inside one item', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'copied-per-choice-copy-pack.json');
    const pack = validPack('en') as any;
    pack.items[0].choiceRationales[2] = pack.items[0].choiceRationales[1];
    pack.items[0].explanations.ru[2] = pack.items[0].explanations.ru[1];
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toEqual(expect.arrayContaining([
      'source-backed-seed-001.choiceRationales.unique',
      'source-backed-seed-001.explanations.ru.unique',
    ]));
  });

  it('blocks duplicate prompts across a pack', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skyler-gate-'));
    const draftPath = path.join(tmpDir, 'duplicate-prompt-pack.json');
    const pack = validPack('en') as any;
    pack.items.push({
      ...pack.items[0],
      id: 'source-backed-seed-002',
      choices: ['Could you repeat that?', 'Say me again.', 'Repeat me.', 'Speak it back.'],
    });
    fs.writeFileSync(draftPath, JSON.stringify(pack), 'utf8');

    const result = runSkyler(['--mode', 'gate', '--draft', draftPath]);
    expect(result.status).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.failures.map((failure: { id: string }) => failure.id)).toContain('source-backed-seed-002.prompt.duplicate');
  });
});
