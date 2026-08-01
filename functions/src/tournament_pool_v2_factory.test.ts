import {
  NEW_TOURNAMENT_POOL_VERSION,
  buildUnambiguousFillGapTask,
  buildNewTournamentPool,
} from './tournament_pool_v2_factory';
import {
  TOURNAMENT_ROUND_MODE_PLAN,
  selectRoundTasks,
  tournamentRoomId,
  validateTournamentTaskForNewRoom,
  verifyTournamentAnswer,
} from './tournament_core';
import { ROUND_DIFFICULTIES } from './tournament_pool_plan';
import {
  TOURNAMENT_SOURCE_PLANS,
  loadTournamentSourceDays,
} from './tournament_content_source';
import { phraseTokens, type SourcePhrase } from './tournament_task_factory';

const APPROVED_MODES = [
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
] as const;

let productionSizedPool: ReturnType<typeof buildNewTournamentPool> | undefined;

function buildProductionSizedPool() {
  productionSizedPool ??= buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
  return productionSizedPool;
}

function sourcePhraseMap(): Map<string, SourcePhrase> {
  return new Map(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS).flatMap((day) => day.phrases
    .map((phrase) => [`${day.planId}:${day.dayIndex}:${phrase.id}`, phrase] as const)));
}

function primaryPhraseKey(task: ReturnType<typeof buildProductionSizedPool>['tasks'][number]): string {
  return `${task.contentProvenance.planId}:${task.contentProvenance.dayIndex}:${task.contentProvenance.phraseIds[0]}`;
}

function selectCompleteTournamentTaskIds(
  roomId: string,
  tasks: ReturnType<typeof buildProductionSizedPool>['tasks'],
): string[] {
  const used = new Set<string>();
  for (let roundIndex = 0; roundIndex < TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
    for (const mode of TOURNAMENT_ROUND_MODE_PLAN[roundIndex]) {
      const selected = selectRoundTasks({
        pool: tasks.filter((task) => task.mode === mode),
        roomId,
        roundNo: roundIndex + 1,
        count: 4,
        modeKind: 'mix',
        excludedTaskIds: used,
      })[0];
      if (!selected) return [];
      used.add(selected.taskId);
    }
  }
  return [...used];
}

describe('new deterministic tournament pool v2', () => {
  test('builds a fresh reachable 180-task pool balanced across five modes', () => {
    const result = buildProductionSizedPool();

    expect(NEW_TOURNAMENT_POOL_VERSION).toBe('tpool_20260801_v5');
    expect(result.manifest.poolVersion).toBe(NEW_TOURNAMENT_POOL_VERSION);
    expect(result.tasks).toHaveLength(180);
    expect(new Set(result.tasks.map((task) => task.taskId)).size).toBe(180);

    for (const mode of APPROVED_MODES) {
      expect(result.tasks.filter((task) => task.mode === mode)).toHaveLength(36);
    }
    expect(result.manifest.counts['find_oddity:1']).toBe(18);
    expect(result.manifest.counts['find_oddity:2']).toBe(18);
    expect(result.manifest.counts['find_oddity:3']).toBeUndefined();
    for (const mode of APPROVED_MODES.filter((value) => value !== 'find_oddity')) {
      for (const difficulty of [1, 2, 3]) expect(result.manifest.counts[`${mode}:${difficulty}`]).toBe(12);
    }
    expect(result.manifest.diversity.uniquePrimaryPhrases).toBe(144);
    expect(result.manifest.diversity.uniqueSpeedPairs).toBe(216);
    expect(result.manifest.diversity.uniqueSpeedEnglishPrompts).toBe(216);
    expect(Object.values(result.manifest.diversity.fillGapPositions).reduce((a, b) => a + b, 0)).toBe(36);
    expect(Object.keys(result.manifest.diversity.fillGapCorrectTokens).length).toBeGreaterThanOrEqual(12);

    for (const task of result.tasks) {
      const reachable = TOURNAMENT_ROUND_MODE_PLAN.some((modes, roundIndex) => (
        modes.includes(task.mode as never) && ROUND_DIFFICULTIES[roundIndex].includes(task.difficulty)
      ));
      expect(reachable).toBe(true);
    }
  });

  test('every task is versioned, published from the local authored corpus, and accepted by the strict room validator', () => {
    const { tasks } = buildProductionSizedPool();

    for (const task of tasks) {
      expect(task.taskId).toMatch(/^tp2_20260801_v5_/);
      expect(APPROVED_MODES).toContain(task.mode as typeof APPROVED_MODES[number]);
      expect(task.isVoice).toBe(false);
      expect(task.verified).toBe(true);
      expect(task.source).toBe('ai');
      expect(task.poolVersion).toBe(NEW_TOURNAMENT_POOL_VERSION);
      expect(task.generationSource).toBe('author_content_deterministic_v1');
      expect(task.contentProvenance.planId).toBeTruthy();
      expect(validateTournamentTaskForNewRoom(task).ok).toBe(true);
      expect(JSON.stringify(task)).not.toMatch(/audioUri|listen_choose|listen_build|sound_contrast|dictat/i);
    }
  });

  test('all explanations are complete and every distractor has its own option-specific trap reason', () => {
    const { tasks } = buildProductionSizedPool();

    for (const task of tasks) {
      expect(task.explanation?.ruleNote.trim()).toBeTruthy();
      expect(task.explanation?.example.trim()).toBeTruthy();
      expect(Buffer.byteLength(task.explanation?.ruleNote ?? '', 'utf8')).toBeLessThanOrEqual(600);
      expect(Buffer.byteLength(task.explanation?.example ?? '', 'utf8')).toBeLessThanOrEqual(600);

      if (['guess_phrase', 'fill_gap', 'find_oddity'].includes(task.mode)) {
        const options = task.payload.options as string[];
        const correctIndex = Number(task.payload.correctIndex);
        const reasons = task.explanation?.wrongOptionReasons ?? [];
        expect(reasons).toHaveLength(options.length);
        reasons.forEach((reason, index) => {
          if (index === correctIndex) expect(reason).toBe('');
          else {
            expect(reason).toContain(`«${options[index]}»`);
            expect(Buffer.byteLength(reason, 'utf8')).toBeLessThanOrEqual(600);
          }
        });
      } else if (task.mode === 'translate_build') {
        expect(task.explanation?.wrongOptionReasons).toEqual([]);
      }
    }
  });

  test('phrase-building banks contain exactly one authored trap', () => {
    const buildTasks = buildProductionSizedPool().tasks.filter((task) => task.mode === 'translate_build');
    expect(buildTasks).toHaveLength(36);
    for (const task of buildTasks) {
      const wordBank = task.payload.wordBank as string[];
      const correctTokens = task.payload.correctTokens as string[];
      expect(task.payload.correctTokenCount).toBe(correctTokens.length);
      expect(wordBank.length - correctTokens.length).toBe(1);
    }
  });

  test('fill_gap carries authored meaning and covers different answers, grammar roles, and blank positions', () => {
    const sourceDays = loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS);
    const sourcePhrases = new Map<string, SourcePhrase>(sourceDays.flatMap((day) => day.phrases
      .map((phrase) => [`${day.planId}:${day.dayIndex}:${phrase.id}`, phrase] as const)));
    const gapTasks = buildNewTournamentPool(sourceDays).tasks.filter((task) => task.mode === 'fill_gap');
    expect(gapTasks).toHaveLength(36);

    const correctTokens = new Map<string, number>();
    const grammarRoles = new Set<string>();
    const blankPositions = new Map<string, number>();
    const pronounAnswers = new Set<string>();
    const sourcePhraseIds = new Set<string>();

    for (const task of gapTasks) {
      const [englishGap, russianMeaning, ...extraLines] = String(task.payload.phrase).split('\n');
      const correctAnswer = String(task.payload.correctAnswer);
      const normalizedAnswer = correctAnswer.toLocaleLowerCase('en');
      const phraseId = task.contentProvenance.phraseIds[0];
      const sourceKey = `${task.contentProvenance.planId}:${task.contentProvenance.dayIndex}:${phraseId}`;
      const sourcePhrase = sourcePhrases.get(sourceKey);
      const sourceWord = sourcePhrase?.words?.find((word) => (
        word.text.toLocaleLowerCase('en') === normalizedAnswer
      ));
      const tokens = englishGap.trim().split(/\s+/);
      const blankIndex = tokens.findIndex((token) => token.includes('___'));
      const position = blankIndex === 0
        ? 'first'
        : (blankIndex === tokens.length - 1 ? 'last' : 'middle');

      expect((englishGap.match(/___/g) ?? [])).toHaveLength(1);
      expect(russianMeaning.trim()).toBeTruthy();
      expect(extraLines).toEqual([]);
      expect(task.explanation?.example).toContain(russianMeaning.trim());
      expect(sourcePhrase).toBeTruthy();
      expect(sourceWord).toBeTruthy();
      expect(blankIndex).toBeGreaterThanOrEqual(0);
      expect((task.payload.options as string[]).filter((option) => option === correctAnswer))
        .toHaveLength(1);

      correctTokens.set(normalizedAnswer, (correctTokens.get(normalizedAnswer) ?? 0) + 1);
      const normalizedOptions = (task.payload.options as string[])
        .filter((option) => option !== correctAnswer)
        .map((option) => option.toLocaleLowerCase('en'));
      if (sourceWord?.partOfSpeech === 'to-be') grammarRoles.add('be_agreement');
      else if (normalizedOptions.filter((option) => (
        ['you', 'me', 'him', 'her', 'us', 'them'].includes(option)
      )).length >= 3) grammarRoles.add('object_pronoun_reference');
      else if (['me', 'him', 'her', 'us', 'them'].includes(normalizedAnswer)) {
        grammarRoles.add('object_pronoun_case');
      } else grammarRoles.add('subject_pronoun_agreement');
      blankPositions.set(position, (blankPositions.get(position) ?? 0) + 1);
      sourcePhraseIds.add(sourceKey);
      if (sourceWord?.partOfSpeech === 'pronoun') pronounAnswers.add(normalizedAnswer);
    }

    expect(correctTokens.size).toBeGreaterThanOrEqual(12);
    expect(Math.max(...correctTokens.values())).toBeLessThanOrEqual(6);
    expect(grammarRoles).toEqual(new Set([
      'be_agreement', 'object_pronoun_case', 'object_pronoun_reference',
      'subject_pronoun_agreement',
    ]));
    expect(pronounAnswers.size).toBeGreaterThanOrEqual(4);
    expect(blankPositions.get('first') ?? 0).toBeGreaterThanOrEqual(6);
    expect(blankPositions.get('middle') ?? 0).toBeGreaterThanOrEqual(6);
    expect(blankPositions.get('last') ?? 0).toBeGreaterThanOrEqual(6);
    expect(sourcePhraseIds.size).toBe(36);
  });

  test('all 144 non-speed tasks test a distinct primary authored phrase', () => {
    const phrases = sourcePhraseMap();
    const tasks = buildProductionSizedPool().tasks.filter((task) => task.mode !== 'speed_match');
    expect(tasks).toHaveLength(144);

    for (const task of tasks) {
      const source = phrases.get(primaryPhraseKey(task));
      expect(source).toBeTruthy();
      if (task.mode === 'guess_phrase' || task.mode === 'translate_build') {
        expect(task.payload.correctAnswer).toBe(source?.english);
      }
    }
    expect(new Set(tasks.map(primaryPhraseKey)).size).toBe(144);
  });

  test('oddity and phrase-building traps cover broad grammatical roles without one dominant template', () => {
    const phrases = sourcePhraseMap();
    const { tasks } = buildProductionSizedPool();
    const oddityParts = new Map<string, number>();
    const translateParts = new Map<string, number>();
    const translateTraps = new Map<string, number>();
    const increment = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

    for (const task of tasks) {
      if (task.mode !== 'find_oddity' && task.mode !== 'translate_build') continue;
      const source = phrases.get(primaryPhraseKey(task));
      expect(source).toBeTruthy();
      if (!source) continue;

      if (task.mode === 'find_oddity') {
        const sourceTokens = phraseTokens(source.english);
        const mutatedTokens = phraseTokens(String(task.payload.correctAnswer));
        const changed = sourceTokens
          .map((token, index) => (token.toLocaleLowerCase('en') === mutatedTokens[index]?.toLocaleLowerCase('en') ? -1 : index))
          .filter((index) => index >= 0);
        expect(changed).toHaveLength(1);
        const original = sourceTokens[changed[0]].toLocaleLowerCase('en');
        const replacement = mutatedTokens[changed[0]].toLocaleLowerCase('en');
        const authoredWord = source.words?.find((word) => word.text.toLocaleLowerCase('en') === original);
        expect(authoredWord).toBeTruthy();
        const subjectToBe: Readonly<Record<string, string>> = {
          i: 'am', you: 'are', he: 'is', she: 'is', it: 'is', we: 'are', they: 'are',
        };
        const subjects = new Set(Object.keys(subjectToBe));
        const objectOnly = new Set(['me', 'him', 'her', 'us', 'them']);
        const adjacent = [sourceTokens[changed[0] - 1], sourceTokens[changed[0] + 1]]
          .filter(Boolean).map((token) => token.toLocaleLowerCase('en'));
        const isStrictCaseError = objectOnly.has(original) && subjects.has(replacement) && changed[0] > 0;
        const adjacentBe = adjacent.find((token) => ['am', 'is', 'are'].includes(token));
        const isStrictSubjectAgreementError = subjects.has(original) && adjacentBe === subjectToBe[original]
          && subjectToBe[replacement] !== adjacentBe;
        const adjacentSubject = adjacent.find((token) => subjects.has(token));
        const isStrictBeAgreementError = ['am', 'is', 'are'].includes(original)
          && subjectToBe[adjacentSubject ?? ''] === original
          && replacement !== subjectToBe[adjacentSubject ?? ''];
        const nextStartsWithVowel = /^[aeiou]/u.test(sourceTokens[changed[0] + 1]?.toLocaleLowerCase('en') ?? '');
        const isStrictArticleError = ['a', 'an'].includes(original)
          && ['a', 'an'].includes(replacement) && original !== replacement
          && ((original === 'an' && nextStartsWithVowel) || (original === 'a' && !nextStartsWithVowel));
        const previous = sourceTokens[changed[0] - 1]?.toLocaleLowerCase('en') ?? '';
        const isStrictVerbAgreementError = String(authoredWord?.partOfSpeech) === 'verb'
          && subjects.has(previous)
          && (original === `${replacement}s` || replacement === `${original}s`
            || original === `${replacement}es` || replacement === `${original}es`);
        const isStrictNounNumberError = String(authoredWord?.partOfSpeech) === 'noun'
          && ['a', 'an', 'one'].includes(previous)
          && (replacement === `${original}s` || replacement === `${original}es`);
        expect(isStrictCaseError || isStrictSubjectAgreementError || isStrictBeAgreementError
          || isStrictArticleError || isStrictVerbAgreementError || isStrictNounNumberError).toBe(true);
        increment(oddityParts, String(authoredWord?.partOfSpeech));
      } else {
        const remaining = [...task.payload.wordBank as string[]];
        for (const correct of task.payload.correctTokens as string[]) {
          const index = remaining.findIndex((token) => token.toLocaleLowerCase('en') === correct.toLocaleLowerCase('en'));
          expect(index).toBeGreaterThanOrEqual(0);
          remaining.splice(index, 1);
        }
        expect(remaining).toHaveLength(1);
        const trap = remaining[0].toLocaleLowerCase('en');
        const authoredWord = source.words?.find((word) => word.distractors?.some((distractor) => (
          distractor.toLocaleLowerCase('en') === trap
        )));
        expect(authoredWord).toBeTruthy();
        increment(translateParts, String(authoredWord?.partOfSpeech));
        increment(translateTraps, trap);
      }
    }

    expect(oddityParts.size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...oddityParts.values())).toBeLessThanOrEqual(12);
    expect(translateParts.size).toBeGreaterThanOrEqual(5);
    expect(Math.max(...translateParts.values())).toBeLessThanOrEqual(12);
    expect(translateTraps.size).toBeGreaterThanOrEqual(20);
    expect(Math.max(...translateTraps.values())).toBeLessThanOrEqual(4);
  });

  test('every task exposes its authored day and topic for measurable pool balancing', () => {
    for (const task of buildProductionSizedPool().tasks) {
      expect(task.tags).toContain(`day:${task.contentProvenance.dayIndex}`);
      expect(task.tags.some((tag) => tag.startsWith('topic:'))).toBe(true);
    }
  });

  test('semantic ambiguity gate rejects articles but accepts authored grammar slots beyond I-am', () => {
    const ambiguousDay = {
      planId: 'test', dayIndex: 1, level: 'A1', phrases: [],
    };
    const articlePhrase = {
      id: 'article',
      english: "Let's meet at the cafe.",
      meaning: { ru: 'Давай встретимся в кафе.' },
      words: [{ text: 'the', partOfSpeech: 'article', distractors: ['a', 'an', 'some'] }],
    };
    const authoredSlots = [
      {
        phrase: {
          id: 'subject-pronoun',
          english: 'She is ready.',
          meaning: { ru: 'Она готова.' },
          words: [{ text: 'She', partOfSpeech: 'pronoun', distractors: ['I', 'you', 'we', 'they'] }],
        },
        correctAnswer: 'She',
        gap: '___ is ready.',
      },
      {
        phrase: {
          id: 'copula-form',
          english: 'They are ready.',
          meaning: { ru: 'Они готовы.' },
          words: [{ text: 'are', partOfSpeech: 'to-be', distractors: ['am', 'is', 'was', 'be'] }],
        },
        correctAnswer: 'are',
        gap: 'They ___ ready.',
      },
      {
        phrase: {
          id: 'object-pronoun',
          english: 'Call me tomorrow.',
          meaning: { ru: 'Позвони мне завтра.' },
          words: [{ text: 'me', partOfSpeech: 'pronoun', distractors: ['I', 'we', 'they', 'she'] }],
        },
        correctAnswer: 'me',
        gap: 'Call ___ tomorrow.',
      },
      {
        phrase: {
          id: 'final-object-pronoun',
          english: 'Please call him.',
          meaning: { ru: 'Пожалуйста, позвони ему.' },
          words: [{ text: 'him', partOfSpeech: 'pronoun', distractors: ['I', 'we', 'they', 'she'] }],
        },
        correctAnswer: 'him',
        gap: 'Please call ___.',
      },
      {
        phrase: {
          id: 'explicit-object-reference',
          english: 'I can hear you.',
          meaning: { ru: 'Я слышу тебя.' },
          words: [{ text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] }],
        },
        correctAnswer: 'you',
        gap: 'I can hear ___.',
      },
    ];

    const semanticallyAmbiguousSlots = [
      {
        id: 'can-may',
        english: 'Can I have gift wrapping, please?',
        meaning: { ru: 'Можно подарочную упаковку, пожалуйста?' },
        words: [{ text: 'Can', partOfSpeech: 'modal', distractors: ['May', 'Could', 'Would', 'Should'] }],
      },
      {
        id: 'could-would',
        english: 'Could you pass the salt, please?',
        meaning: { ru: 'Не могли бы вы передать соль, пожалуйста?' },
        words: [{ text: 'Could', partOfSpeech: 'modal', distractors: ['Would', 'Can', 'Will', 'Should'] }],
      },
      {
        id: 'can-could-doctor',
        english: 'Can I see the doctor tomorrow?',
        meaning: { ru: 'Можно мне попасть к врачу завтра?' },
        words: [{ text: 'Can', partOfSpeech: 'modal', distractors: ['Will', 'Could', 'Should', 'Must', 'May'] }],
      },
      {
        id: 'preposition-meaning',
        english: 'Meet me at noon.',
        meaning: { ru: 'Встреть меня в полдень.' },
        words: [{ text: 'at', partOfSpeech: 'preposition', distractors: ['before', 'around', 'after', 'by'] }],
      },
      {
        id: 'phrasal-particle-meaning',
        english: 'Please check in here.',
        meaning: { ru: 'Пожалуйста, зарегистрируйтесь здесь.' },
        words: [{ text: 'in', partOfSpeech: 'phrasal_particle', distractors: ['out', 'up', 'on', 'off'] }],
      },
      {
        id: 'implicit-object-reference',
        english: 'I can hear you.',
        meaning: { ru: 'Я хорошо слышу.' },
        words: [{ text: 'you', partOfSpeech: 'pronoun', distractors: ['him', 'her', 'them', 'us', 'me'] }],
      },
    ];

    expect(buildUnambiguousFillGapTask(ambiguousDay, articlePhrase)).toBeNull();
    for (const phrase of semanticallyAmbiguousSlots) {
      expect(buildUnambiguousFillGapTask(ambiguousDay, phrase)).toBeNull();
    }
    for (const example of authoredSlots) {
      const accepted = buildUnambiguousFillGapTask(ambiguousDay, example.phrase);
      expect(accepted?.payload).toMatchObject({ correctAnswer: example.correctAnswer });
      expect(String(accepted?.payload.phrase)).toContain(example.gap);
      expect(validateTournamentTaskForNewRoom(accepted!).ok).toBe(true);
    }
  });

  test('generated review copy has no doubled punctuation around closing quotes', () => {
    const { tasks } = buildProductionSizedPool();
    for (const task of tasks) expect(JSON.stringify(task)).not.toMatch(/[.!?…]»[.!?…]/u);
  });

  test('every speed_match is a strict shared 6x6 field with a full explanation for every pair', () => {
    const speedTasks = buildProductionSizedPool().tasks.filter((task) => task.mode === 'speed_match');
    expect(speedTasks).toHaveLength(36);

    for (const task of speedTasks) {
      const rightOptions = task.payload.rightOptions as string[];
      const items = task.payload.items as Array<Record<string, unknown>>;
      expect(rightOptions).toHaveLength(6);
      expect(rightOptions.every((value) => /^\p{L}[\p{L}\p{M}'’\-]*$/u.test(value))).toBe(true);
      expect(new Set(rightOptions.map((value) => value.toLocaleLowerCase('ru'))).size).toBe(6);
      expect(items).toHaveLength(6);
      expect(items.map((item) => item.correctIndex).sort()).toEqual([0, 1, 2, 3, 4, 5]);
      for (const item of items) {
        expect(item.prompt).toEqual(expect.stringMatching(/^\p{L}[\p{L}\p{M}'’\-]*$/u));
        expect(item.options).toEqual(rightOptions);
        const reasons = (item.explanation as { wrongOptionReasons: string[] }).wrongOptionReasons;
        expect(reasons).toHaveLength(6);
        reasons.forEach((reason, index) => {
          if (index === item.correctIndex) expect(reason).toBe('');
          else expect(reason).toContain(`«${rightOptions[index]}»`);
        });
      }
    }
  });

  test('speed_match uses 216 distinct pairs with one stable translation per English prompt', () => {
    const speedTasks = buildProductionSizedPool().tasks.filter((task) => task.mode === 'speed_match');
    const pairs: Array<[string, string]> = [];
    for (const task of speedTasks) {
      for (const item of task.payload.items as Array<Record<string, unknown>>) {
        const options = item.options as string[];
        pairs.push([
          String(item.prompt).toLocaleLowerCase('en'),
          String(options[Number(item.correctIndex)]).toLocaleLowerCase('ru'),
        ]);
      }
    }

    expect(pairs).toHaveLength(216);
    expect(new Set(pairs.map(([en, ru]) => `${en}\u0000${ru}`)).size).toBe(216);
    const translationsByEnglish = new Map<string, Set<string>>();
    for (const [en, ru] of pairs) {
      const translations = translationsByEnglish.get(en) ?? new Set<string>();
      translations.add(ru);
      translationsByEnglish.set(en, translations);
    }
    expect([...translationsByEnglish.values()].every((translations) => translations.size === 1)).toBe(true);
  });

  test('the server accepts every authored correct answer and rejects every explicit wrong option', () => {
    const { tasks } = buildProductionSizedPool();

    for (const task of tasks) {
      if (['guess_phrase', 'fill_gap', 'find_oddity'].includes(task.mode)) {
        const correctIndex = Number(task.payload.correctIndex);
        expect(verifyTournamentAnswer(task, { selectedIndex: correctIndex })).toBe(true);
        for (let index = 0; index < (task.payload.options as string[]).length; index += 1) {
          if (index !== correctIndex) {
            expect(verifyTournamentAnswer(task, { selectedIndex: index })).toBe(false);
          }
        }
      } else if (task.mode === 'translate_build') {
        const correctTokens = task.payload.correctTokens as string[];
        expect(verifyTournamentAnswer(task, { tokens: correctTokens })).toBe(true);
        expect(verifyTournamentAnswer(task, { tokens: [...correctTokens].reverse() })).toBe(false);
      } else {
        const items = task.payload.items as Array<Record<string, unknown>>;
        const correctIndexes = items.map((item) => Number(item.correctIndex));
        expect(verifyTournamentAnswer(task, { selectedIndexes: correctIndexes })).toBe(true);
        const wrong = [...correctIndexes];
        wrong[0] = (wrong[0] + 1) % 6;
        expect(verifyTournamentAnswer(task, { selectedIndexes: wrong })).toBe(false);
      }
    }
  });

  test('the complete four-round owner mode plan can be assembled for 150 deterministic room seeds', () => {
    const { tasks } = buildProductionSizedPool();

    for (let roomIndex = 0; roomIndex < 150; roomIndex += 1) {
      const used = new Set<string>();
      for (let roundIndex = 0; roundIndex < TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
        const roundNo = roundIndex + 1;
        const plannedModes = TOURNAMENT_ROUND_MODE_PLAN[roundIndex];
        const selected = plannedModes.map((mode) => selectRoundTasks({
          pool: tasks.filter((task) => task.mode === mode && !used.has(task.taskId)),
          roomId: `new-pool-preflight-${roomIndex}`,
          roundNo,
          count: 4,
          modeKind: 'mix',
        })[0]);
        expect(selected.every(Boolean)).toBe(true);
        selected.forEach((task) => used.add(task!.taskId));
      }
      expect(used.size).toBe(16);
    }
  });

  test('v5 exposure deck makes complete adjacent scheduled tournaments disjoint and exposes every task', () => {
    const { tasks } = buildProductionSizedPool();
    const exposure = new Map<string, number>();
    let previousTaskIds = new Set<string>();

    for (let dayOffset = 0; dayOffset < 120; dayOffset += 1) {
      const date = new Date(Date.UTC(2026, 7, 1 + dayOffset)).toISOString().slice(0, 10);
      const roomId = tournamentRoomId('daily_1200', 'Europe/Moscow', date);
      const taskIds = new Set(selectCompleteTournamentTaskIds(roomId, tasks));
      expect(taskIds.size).toBe(16);
      expect([...taskIds].filter((taskId) => previousTaskIds.has(taskId))).toEqual([]);
      previousTaskIds = taskIds;
      taskIds.forEach((taskId) => exposure.set(taskId, (exposure.get(taskId) ?? 0) + 1));
    }

    expect(exposure.size).toBe(tasks.length);
    for (const mode of APPROVED_MODES) {
      for (const difficulty of [1, 2, 3]) {
        const cell = tasks.filter((task) => task.mode === mode && task.difficulty === difficulty);
        if (cell.length === 0) continue;
        const counts = cell.map((task) => exposure.get(task.taskId) ?? 0);
        expect(Math.min(...counts)).toBeGreaterThan(0);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      }
    }
  });

  test('runtime passes consumed v5 ids separately instead of shrinking the calendar deck', () => {
    const source = require('node:fs').readFileSync(`${__dirname}/tournaments.ts`, 'utf8');
    const start = source.indexOf('export function buildTournamentRounds');
    const end = source.indexOf('\nexport ', start + 1);
    const implementation = source.slice(start, end < 0 ? undefined : end);
    expect(implementation).toContain("task.tags?.includes('pool:tpool_20260801_v5')");
    expect(implementation).toContain('pool: usesV5ExposureDeck');
    expect(implementation).toContain('excludedTaskIds: usesV5ExposureDeck ? usedTaskIds : undefined');
  });

  test('repeated generation is byte-for-byte deterministic', () => {
    const days = loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS);
    expect(JSON.stringify(buildNewTournamentPool(days)))
      .toBe(JSON.stringify(buildNewTournamentPool(days)));
  });
});
