import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

declare const require: any;

const ROOT = path.resolve(__dirname, '..');
const core = require('../scripts/lib/lesson33_pipeline_core.cjs');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function wordsEnFromEnglish(english: string) {
  const distractorsByToken: Record<string, string[]> = {
    i: ['you', 'he', 'she', 'we', 'they'],
    she: ['I', 'you', 'he', 'we', 'they'],
    did: ['do', 'does', 'done', 'had', 'got'],
    you: ['I', 'he', 'she', 'we', 'they'],
    had: ['have', 'has', 'get', 'got', 'did'],
    got: ['get', 'gets', 'had', 'have', 'did'],
    get: ['got', 'gets', 'had', 'have', 'did'],
    need: ['needs', 'needed', 'want', 'wants', 'had'],
    want: ['wants', 'wanted', 'need', 'needs', 'had'],
    not: ['now', 'no', 'never', 'also', 'still'],
    item: ['items', 'thing', 'phone', 'room', 'file'],
    checked: ['check', 'checks', 'checking', 'fixed', 'cleaned'],
    renewed: ['renew', 'renews', 'renewing', 'checked', 'fixed'],
  };

  return english
    .replace(/[?.,!;:]+$/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => ({
      text: token,
      correct: token,
      distractors: distractorsByToken[token.toLowerCase()] || ['one', 'two', 'three', 'four', 'five'],
    }));
}

function makePhrase(index: number, english: string) {
  return {
    id: `lesson33_phrase_${index}`,
    english,
    russian: `RU phrase ${index}`,
    ukrainian: `UK phrase ${index}`,
    spanish: `Frase ${index}`,
    wordsEn: wordsEnFromEnglish(english),
  };
}

function monotoneLesson33Phrases() {
  return Array.from({ length: 50 }, (_, index) => makePhrase(index + 1, `I had item ${index + 1} checked.`));
}

function balancedLesson33Phrases() {
  return Array.from({ length: 50 }, (_, index) => {
    const phraseNumber = index + 1;
    if (phraseNumber <= 20) return makePhrase(phraseNumber, `I had item ${phraseNumber} checked.`);
    if (phraseNumber <= 30) return makePhrase(phraseNumber, `I need item ${phraseNumber} checked.`);
    if (phraseNumber <= 35) return makePhrase(phraseNumber, `Did you get item ${phraseNumber} checked?`);
    if (phraseNumber <= 40) return makePhrase(phraseNumber, `I did not get item ${phraseNumber} checked.`);
    return makePhrase(phraseNumber, `She got item ${phraseNumber} renewed.`);
  });
}

function validLesson33Package(overrides: Record<string, unknown> = {}) {
  return {
    lessonId: 33,
    status: 'ready_for_review',
    cefrTarget: 'B2',
    title: {
      ru: 'RU causative title',
      uk: 'UK causative title',
      es: 'Titulo causativo ES',
    },
    topic: {
      primary: 'have/get something done',
      prerequisites: ['Lesson 23 Passive Voice', 'Lesson 31 Complex Object', 'Lesson 32 final mixed review'],
    },
    phraseTargets: { count: 50 },
    phrases: balancedLesson33Phrases(),
    introScreens: [
      { titleRU: 'Why', bodyRU: 'Arrange the result: you do not repair it yourself.' },
      { titleRU: 'Formula', bodyRU: 'have/get + object + V3' },
      { titleRU: 'Practice', bodyRU: 'Build service-result phrases with questions and negatives.' },
    ],
    theoryBlocks: [
      { type: 'Formula', title: 'Formula', body: 'have/get + object + V3' },
      { type: 'Contrast', title: 'Do it yourself vs have it done', body: 'Contrast direct action with arranged result.' },
      { type: 'QuestionsNegatives', title: 'Questions, negatives, traps', body: 'Did you get it checked? I did not get it checked. Avoid traps.' },
    ],
    personalTraining: {
      id: 'causative_have_get_done',
      steps: Array.from({ length: 15 }, (_, index) => ({
        id: `s${index + 1}`,
        type: index < 5 ? 'recognition' : index < 10 ? 'production' : 'mixed_review',
        prompt: `Train have/get something done step ${index + 1}`,
        target: index < 5 ? 'have/get + object + V3' : index < 10 ? 'need/want + object + V3' : 'have/get questions and negatives',
      })),
    },
    ...overrides,
  };
}

describe('lesson 33 pipeline protocol', () => {
  const requiredFiles = [
    'tools/lesson_33_agent_room/README.md',
    'tools/lesson_33_agent_room/ROOM.md',
    'tools/lesson_33_agent_room/prompts/00_ORCHESTRATOR.md',
    'tools/lesson_33_agent_room/prompts/10_CURRICULUM_ARCHITECT.md',
    'tools/lesson_33_agent_room/prompts/20_PHRASE_WRITER.md',
    'tools/lesson_33_agent_room/prompts/30_INTRO_THEORY_WRITER.md',
    'tools/lesson_33_agent_room/prompts/40_PERSONAL_TRAINING_WRITER.md',
    'tools/lesson_33_agent_room/prompts/90_QA_GATEKEEPER.md',
    'tools/lesson_33_agent_room/templates/lesson_package.schema.md',
    'docs/lesson33/PIPELINE.md',
  ];

  it('keeps the room files available for lesson generation sessions', () => {
    for (const file of requiredFiles) {
      expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    }
  });

  it('documents the continuation from lesson 32 into lesson 33', () => {
    const room = readRepoFile('tools/lesson_33_agent_room/ROOM.md');
    const docs = readRepoFile('docs/lesson33/PIPELINE.md');

    for (const content of [room, docs]) {
      expect(content).toContain('Lesson 32');
      expect(content).toContain('Lesson 33');
      expect(content).toContain('have/get something done');
      expect(content).toContain('50 phrases');
      expect(content).toContain('CEFR');
      expect(content).toContain('npm run lesson:qa');
    }
  });

  it('builds a lesson 33 manifest without writing app source files', () => {
    const manifest = core.buildLesson33Manifest({
      lessonId: 33,
      runId: 'test-run',
      outRoot: 'docs/lesson33/runs',
    });

    expect(manifest.pipeline).toBe('lesson-33');
    expect(manifest.lessonId).toBe(33);
    expect(manifest.cefrTarget).toBe('B2');
    expect(manifest.primaryTopic).toContain('have/get something done');
    expect(manifest.prohibitedWriteTargets).toContain('app/lesson_data_25_32.ts');
    expect(manifest.requiredOutputs).toContain('lesson_package.json');
    expect(manifest.requiredOutputs).toContain('curriculum_roadmap_33_60.md');
    expect(manifest.requiredChecks).toContain('npm run lesson:qa');
    expect(manifest.curriculumRoadmap).toHaveLength(28);
  });

  it('rejects unsupported lesson ids for the lesson 33 pipeline', () => {
    expect(() => core.buildLesson33Manifest({
      lessonId: 34,
      runId: 'bad',
      outRoot: 'docs/lesson33/runs',
    })).toThrow('Lesson 33 pipeline only accepts lessonId=33');
  });

  it('rejects unsafe run ids that could escape the review artifact folder', () => {
    expect(() => core.buildLesson33Manifest({
      lessonId: 33,
      runId: '../app/lesson_data_33',
      outRoot: 'docs/lesson33/runs',
    })).toThrow('runId must contain only letters, numbers, dots, underscores, and hyphens');

    expect(() => core.buildLesson33Manifest({
      lessonId: 33,
      runId: 'draft\\..\\app',
      outRoot: 'docs/lesson33/runs',
    })).toThrow('runId must contain only letters, numbers, dots, underscores, and hyphens');

    expect(() => core.buildLesson33Manifest({
      lessonId: 33,
      runId: '..',
      outRoot: 'docs/lesson33/runs',
    })).toThrow('runId must not be a dot directory segment');
  });

  it('rejects scaffold output roots outside lesson 33 review runs', () => {
    expect(() => core.buildLesson33Manifest({
      lessonId: 33,
      runId: 'bad-out-root',
      outRoot: 'app',
    })).toThrow('outRoot must be under docs/lesson33/runs');

    expect(() => core.buildLesson33Manifest({
      lessonId: 33,
      runId: 'bad-out-root',
      outRoot: '../outside',
    })).toThrow('outRoot must be under docs/lesson33/runs');
  });

  it('rejects gate package paths outside lesson 33 review runs', () => {
    expect(() => core.runLesson33Gate({
      packagePath: 'app/lesson_data_1_8.ts',
    })).toThrow('gate package must be under docs/lesson33/runs');
  });

  it('validates a complete lesson 33 package shape', () => {
    const validPhrase = (index: number) => ({
      id: `lesson33_phrase_${index}`,
      english: `I had file${index} checked.`,
      russian: `Фраза ${index}`,
      ukrainian: `Фраза ${index}`,
      spanish: `Frase ${index}`,
      wordsEn: [
        { text: 'I', correct: 'I', distractors: ['you', 'he', 'she', 'we', 'they'] },
        { text: 'had', correct: 'had', distractors: ['have', 'has', 'get', 'got', 'did'] },
        { text: `file${index}`, correct: `file${index}`, distractors: ['item', 'thing', 'phone', 'room', 'file'] },
        { text: 'checked', correct: 'checked', distractors: ['check', 'checks', 'checking', 'fixed', 'cleaned'] },
      ],
    });
    const report = core.validateLesson33Package({
      lessonId: 33,
      status: 'ready_for_review',
      cefrTarget: 'B2',
      title: {
        ru: 'RU causative title',
        uk: 'UK causative title',
        es: 'Titulo causativo ES',
      },
      topic: {
        primary: 'have/get something done',
        prerequisites: ['Lesson 23 Passive Voice', 'Lesson 31 Complex Object', 'Lesson 32 final mixed review'],
      },
      phraseTargets: { count: 50 },
      phrases: balancedLesson33Phrases(),
      introScreens: [
        { titleRU: 'Зачем это нужно', bodyRU: 'Arrange the result: you do not repair it yourself.' },
        { titleRU: 'Формула', bodyRU: 'have/get + object + V3' },
        { titleRU: 'Практика', bodyRU: 'Build service-result phrases with questions and negatives.' },
      ],
      theoryBlocks: [
        { type: 'Formula', title: 'Formula', body: 'have/get + object + V3' },
        { type: 'Contrast', title: 'Do it yourself vs have it done', body: 'Contrast direct action with arranged result.' },
        { type: 'QuestionsNegatives', title: 'Questions, negatives, traps', body: 'Did you get it checked? I did not get it checked. Avoid traps.' },
      ],
      personalTraining: validLesson33Package().personalTraining,
    });

    expect(report.ok).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.summary.phraseCount).toBe(50);
  });

  it('blocks draft package status before integration', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      status: 'draft_package_shell',
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('status must be ready_for_review or final_candidate');
  });

  it('reports malformed phrase entries instead of throwing', () => {
    const phrases = balancedLesson33Phrases();
    phrases[0] = null as any;

    let report: any;
    expect(() => {
      report = core.validateLesson33Package(validLesson33Package({ phrases }));
    }).not.toThrow();

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('phrases[0] must be an object');
  });

  it('reports package blockers before integration', () => {
    const report = core.validateLesson33Package({
      lessonId: 33,
      cefrTarget: 'C1',
      topic: { primary: 'unrelated idioms' },
      phrases: [
        {
          id: 'lesson33_phrase_1',
          english: 'I repaired my phone.',
          russian: '',
          ukrainian: 'Я відремонтував телефон.',
          spanish: 'Reparé mi teléfono.',
          wordsEn: [{ text: 'I', correct: 'I', distractors: ['you'] }],
        },
      ],
      introScreens: [],
      theoryBlocks: [],
      personalTraining: null,
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('cefrTarget must be B2'),
      expect.stringContaining('topic.primary must mention have/get something done'),
      expect.stringContaining('phrases must contain exactly 50 items'),
      expect.stringContaining('introScreens must contain at least 3 items'),
      expect.stringContaining('theoryBlocks must contain at least 3 items'),
      expect.stringContaining('personalTraining is required'),
      expect.stringContaining('phrases[0].russian is required'),
      expect.stringContaining('phrases[0].wordsEn[0].distractors must contain at least 5 items'),
    ]));
  });

  it('blocks invalid phrase ids and wordsEn token drift', () => {
    const packageWithDrift = {
      lessonId: 33,
      cefrTarget: 'B2',
      topic: { primary: 'have/get something done' },
      phrases: Array.from({ length: 50 }, (_, index) => ({
        id: index === 0 ? 'lesson33_phrase_99' : `lesson33_phrase_${index + 1}`,
        english: index === 1 ? 'She got her passport renewed.' : `I had item ${index + 1} checked.`,
        russian: `Фраза ${index + 1}`,
        ukrainian: `Фраза ${index + 1}`,
        spanish: `Frase ${index + 1}`,
        wordsEn: [
          { text: 'I', correct: 'I', distractors: ['you', 'he', 'she', 'we', 'they'] },
          { text: 'had', correct: 'had', distractors: ['have', 'has', 'get', 'got', 'did'] },
          { text: 'wrong-token', correct: 'wrong-token', distractors: ['item', 'thing', 'phone', 'room', 'file'] },
          { text: 'checked', correct: 'checked', distractors: ['check', 'checks', 'checking', 'fixed', 'cleaned'] },
        ],
      })),
      introScreens: [{ titleRU: 'Зачем' }, { titleRU: 'Формула' }, { titleRU: 'Практика' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
      personalTraining: { id: 'causative_have_get_done', steps: Array.from({ length: 15 }, (_, index) => ({ id: `s${index + 1}` })) },
    };

    const report = core.validateLesson33Package(packageWithDrift);

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'phrases[0].id must be lesson33_phrase_1',
      expect.stringContaining('phrases[0].wordsEn token sequence must match english'),
      expect.stringContaining('phrases[1].wordsEn token sequence must match english'),
    ]));
  });

  it('requires enough causative/result-object coverage', () => {
    const weakPackage = {
      lessonId: 33,
      cefrTarget: 'B2',
      topic: { primary: 'have/get something done' },
      phrases: Array.from({ length: 50 }, (_, index) => ({
        id: `lesson33_phrase_${index + 1}`,
        english: `I checked item ${index + 1}.`,
        russian: `Фраза ${index + 1}`,
        ukrainian: `Фраза ${index + 1}`,
        spanish: `Frase ${index + 1}`,
        wordsEn: [
          { text: 'I', correct: 'I', distractors: ['you', 'he', 'she', 'we', 'they'] },
          { text: 'checked', correct: 'checked', distractors: ['check', 'checks', 'checking', 'fixed', 'cleaned'] },
          { text: 'item', correct: 'item', distractors: ['items', 'thing', 'phone', 'room', 'file'] },
          { text: `${index + 1}`, correct: `${index + 1}`, distractors: ['one', 'two', 'three', 'four', 'five'] },
        ],
      })),
      introScreens: [{ titleRU: 'Зачем' }, { titleRU: 'Формула' }, { titleRU: 'Практика' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
      personalTraining: { id: 'causative_have_get_done', steps: Array.from({ length: 15 }, (_, index) => ({ id: `s${index + 1}` })) },
    };

    const report = core.validateLesson33Package(weakPackage);

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('at least 35 phrases must use a Lesson 33 causative/result-object pattern');
  });

  it('blocks wordsEn answer drift and duplicate distractors', () => {
    const packageWithAnswerDrift = {
      lessonId: 33,
      cefrTarget: 'B2',
      topic: { primary: 'have/get something done' },
      phraseTargets: { count: 50 },
      phrases: Array.from({ length: 50 }, (_, index) => ({
        id: `lesson33_phrase_${index + 1}`,
        english: `I had item ${index + 1} checked.`,
        russian: `Phrase ${index + 1}`,
        ukrainian: `Phrase ${index + 1}`,
        spanish: `Frase ${index + 1}`,
        wordsEn: [
          { text: 'I', correct: 'I', distractors: ['you', 'he', 'she', 'we', 'they'] },
          { text: 'had', correct: index === 0 ? 'has' : 'had', distractors: ['have', 'has', 'get', 'got', 'did'] },
          { text: 'item', correct: 'item', distractors: index === 1 ? ['thing', 'thing', 'phone', 'room', 'file'] : ['items', 'thing', 'phone', 'room', 'file'] },
          { text: `${index + 1}`, correct: `${index + 1}`, distractors: ['one', 'two', 'three', 'four', 'five'] },
          { text: 'checked', correct: 'checked', distractors: ['check', 'checks', 'checking', 'fixed', 'cleaned'] },
        ],
      })),
      introScreens: [{ titleRU: 'Why' }, { titleRU: 'Formula' }, { titleRU: 'Practice' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
      personalTraining: { id: 'causative_have_get_done', steps: Array.from({ length: 15 }, (_, index) => ({ id: `s${index + 1}` })) },
    };

    const report = core.validateLesson33Package(packageWithAnswerDrift);

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'phrases[0].wordsEn[1].correct must match text',
      'phrases[1].wordsEn[2].distractors contains duplicates',
    ]));
  });

  it('blocks blank word distractors', () => {
    const phrases = balancedLesson33Phrases();
    phrases[0] = {
      ...phrases[0],
      wordsEn: phrases[0].wordsEn.map((word, index) => (
        index === 0
          ? { ...word, distractors: ['you', 'he', 'she', 'we', '   '] }
          : word
      )),
    };

    const report = core.validateLesson33Package(validLesson33Package({ phrases }));

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('phrases[0].wordsEn[0].distractors must not contain blank items');
  });

  it('does not count attributive participles as lesson 33 causative coverage', () => {
    const attributivePackage = {
      lessonId: 33,
      cefrTarget: 'B2',
      topic: { primary: 'have/get something done' },
      phrases: Array.from({ length: 50 }, (_, index) => ({
        id: `lesson33_phrase_${index + 1}`,
        english: `I have a repaired phone ${index + 1}.`,
        russian: `Phrase ${index + 1}`,
        ukrainian: `Phrase ${index + 1}`,
        spanish: `Frase ${index + 1}`,
        wordsEn: [
          { text: 'I', correct: 'I', distractors: ['you', 'he', 'she', 'we', 'they'] },
          { text: 'have', correct: 'have', distractors: ['had', 'has', 'get', 'got', 'did'] },
          { text: 'a', correct: 'a', distractors: ['the', 'my', 'your', 'that', 'this'] },
          { text: 'repaired', correct: 'repaired', distractors: ['repair', 'repairs', 'repairing', 'checked', 'fixed'] },
          { text: 'phone', correct: 'phone', distractors: ['phones', 'file', 'room', 'car', 'door'] },
          { text: `${index + 1}`, correct: `${index + 1}`, distractors: ['one', 'two', 'three', 'four', 'five'] },
        ],
      })),
      introScreens: [{ titleRU: 'Why' }, { titleRU: 'Formula' }, { titleRU: 'Practice' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
      personalTraining: { id: 'causative_have_get_done', steps: Array.from({ length: 15 }, (_, index) => ({ id: `s${index + 1}` })) },
    };

    const report = core.validateLesson33Package(attributivePackage);

    expect(report.ok).toBe(false);
    expect(report.summary.causativePatternCount).toBe(0);
    expect(report.errors).toContain('at least 35 phrases must use a Lesson 33 causative/result-object pattern');
  });

  it('blocks phrase target count drift in draft packages', () => {
    const report = core.validateLesson33Package({
      lessonId: 33,
      cefrTarget: 'B2',
      topic: { primary: 'have/get something done' },
      phraseTargets: { count: 48 },
      phrases: [],
      introScreens: [{ titleRU: 'Why' }, { titleRU: 'Formula' }, { titleRU: 'Practice' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
      personalTraining: { id: 'causative_have_get_done', steps: Array.from({ length: 15 }, (_, index) => ({ id: `s${index + 1}` })) },
    });

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('phraseTargets.count must be 50');
  });

  it('requires localized title and lesson 32 continuation anchor', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      title: { ru: 'Only Russian title' },
      topic: { primary: 'have/get something done', prerequisites: ['Lesson 23 Passive Voice'] },
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'title.uk is required',
      'title.es is required',
      'topic.prerequisites must mention Lesson 32',
    ]));
  });

  it('blocks copied or identical localized titles', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      title: {
        ru: 'Causative: arrange a result',
        uk: 'Causative: arrange a result',
        es: 'Causative: arrange a result',
      },
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toContain('title translations must differ across RU, UK, and ES');
  });

  it('checks protocol file contents, not only file existence', () => {
    const tempRoot = fs.mkdtempSync(path.join(ROOT, '.codex-tmp', 'lesson33-protocol-'));
    for (const file of core.REQUIRED_ROOM_FILES) {
      const abs = path.join(tempRoot, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, 'placeholder\n', 'utf8');
    }

    const report = core.checkProtocol(tempRoot);

    expect(report.ok).toBe(false);
    expect(report.missing).toEqual([]);
    expect(report.contentErrors).toEqual(expect.arrayContaining([
      expect.stringContaining('tools/lesson_33_agent_room/ROOM.md must mention Lesson 32'),
      expect.stringContaining('docs/lesson33/PIPELINE.md must mention ready_for_review'),
    ]));
  });

  it('prints protocol content errors in check mode', () => {
    const tempRoot = fs.mkdtempSync(path.join(ROOT, '.codex-tmp', 'lesson33-cli-protocol-'));
    for (const file of core.REQUIRED_ROOM_FILES) {
      const abs = path.join(tempRoot, file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, 'placeholder\n', 'utf8');
    }

    let stderr = '';
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'scripts/lesson33_pipeline.cjs'), '--check-protocol'], {
        cwd: tempRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      stderr = String(error.stderr || '');
    }

    expect(stderr).toContain('protocol content errors');
    expect(stderr).toContain('tools/lesson_33_agent_room/ROOM.md must mention Lesson 32');
  });

  it('requires a balanced lesson 33 phrase mix', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      phrases: monotoneLesson33Phrases(),
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'at least 10 phrases must use need/want + object + V3',
      'at least 5 phrases must be questions',
      'at least 5 phrases must be negatives',
    ]));
  });

  it('blocks shallow personal training shells', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      personalTraining: {
        id: 'generic_review',
        steps: Array.from({ length: 12 }, (_, index) => ({ id: `s${index + 1}` })),
      },
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'personalTraining.id must be causative_have_get_done',
      'personalTraining.steps must cover recognition, production, and mixed_review',
      'personalTraining.steps[0].prompt is required',
      'personalTraining.steps[0].target must mention the Lesson 33 causative skill',
    ]));
  });

  it('blocks shallow intro and theory shells', () => {
    const report = core.validateLesson33Package(validLesson33Package({
      introScreens: [{ titleRU: 'One' }, { titleRU: 'Two' }, { titleRU: 'Three' }],
      theoryBlocks: [{ type: 'Section' }, { type: 'Body' }, { type: 'Table' }],
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'introScreens must explain result, formula, and practice',
      'theoryBlocks must cover formula, contrast, questions/negatives, and traps',
    ]));
  });

  it('blocks copied or identical phrase translations', () => {
    const copiedTranslationPhrases = balancedLesson33Phrases();
    copiedTranslationPhrases[0] = {
      ...copiedTranslationPhrases[0],
      russian: copiedTranslationPhrases[0].english,
      ukrainian: copiedTranslationPhrases[0].english,
      spanish: copiedTranslationPhrases[0].english,
    };
    copiedTranslationPhrases[1] = {
      ...copiedTranslationPhrases[1],
      russian: 'same translation',
      ukrainian: 'same translation',
      spanish: 'same translation',
    };

    const report = core.validateLesson33Package(validLesson33Package({
      phrases: copiedTranslationPhrases,
    }));

    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(expect.arrayContaining([
      'phrases[0].russian must not duplicate english',
      'phrases[0].ukrainian must not duplicate english',
      'phrases[0].spanish must not duplicate english',
      'phrases[1] translations must differ across RU, UK, and ES',
    ]));
  });

  it('exposes a stable 33-60 curriculum roadmap', () => {
    expect(core.LESSON_33_TO_60_ROADMAP).toHaveLength(28);
    expect(core.LESSON_33_TO_60_ROADMAP[0]).toEqual(expect.objectContaining({
      lessonId: 33,
      topic: expect.stringContaining('have/get something done'),
      cefr: 'B2',
    }));
    expect(core.LESSON_33_TO_60_ROADMAP.at(-1)).toEqual(expect.objectContaining({
      lessonId: 60,
      cefr: 'C1',
    }));
  });

  it('documents the pedagogical reason for every lesson in the 33-60 roadmap', () => {
    core.LESSON_33_TO_60_ROADMAP.forEach((item: any, index: number) => {
      expect(item.lessonId).toBe(33 + index);
      expect(item.prerequisites.length).toBeGreaterThanOrEqual(1);
      expect(item.recycledFrom.length).toBeGreaterThanOrEqual(1);
      expect(item.newSkill).toEqual(expect.any(String));
      expect(item.newSkill.trim().length).toBeGreaterThan(0);
      expect(item.risk).toEqual(expect.any(String));
      expect(item.risk.trim().length).toBeGreaterThan(0);
      expect(item.whyHere).toEqual(expect.any(String));
      expect(item.whyHere.trim().length).toBeGreaterThan(0);
    });
  });

  it('keeps the researched lesson order anchored to lesson 32 and later C1 prerequisites', () => {
    const lesson33 = core.LESSON_33_TO_60_ROADMAP[0];
    const lesson51 = core.LESSON_33_TO_60_ROADMAP.find((item: any) => item.lessonId === 51);
    const lesson60 = core.LESSON_33_TO_60_ROADMAP.at(-1);

    expect(lesson33.prerequisites.join(' ')).toMatch(/Lesson 32/);
    expect(lesson33.recycledFrom.join(' ')).toMatch(/need\/want \+ object \+ V3/);
    expect(lesson33.whyHere).toMatch(/Lesson 32/);
    expect(lesson51.prerequisites.join(' ')).toMatch(/conditionals|modal|clauses/i);
    expect(lesson51.whyHere).toMatch(/C1/);
    expect(lesson60.recycledFrom.join(' ')).toMatch(/33-59/);
  });
});
