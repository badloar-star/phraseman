import fs from 'node:fs';
import path from 'node:path';
import { buildFlashcardItemsWorkerGrounding, buildFlashcardPartialRetryGrounding, buildFlashcardReplacementWorkerGrounding, contentStageGroundingReceipt, contentStageLeaseTokenHash, contentStageObjectPath, flashcardKeysFromLessonPhrases, flashcardKeysFromPublishedPacks, flashcardLedgerDocumentId, flashcardPartialFailureState, generateContentStageArtifact, parseRunContentStageRequest, resolveContentStageCount } from './content_stage_worker';
import { approveFlashcardBatch, parseFlashcardPackLedger } from './content_factory/flashcard_pack_ledger';
import { createFlashcardPartialCheckpoint, mergeFlashcardPartialCheckpoint, parseFlashcardPartialCheckpoint } from './content_factory/flashcard_partial_checkpoint';
import { acquireStageLease, canCommitStageLease } from './content_factory/stage_lease';
import type { StageGenerationProvider } from './content_factory/stage_runner';

describe('independent content stage worker', () => {
  it('parses only a safe stage identity', () => {
    expect(parseRunContentStageRequest({ stageId: 'request-1:quiz_questions:topic-1:r1' })).toEqual({ stageId: 'request-1:quiz_questions:topic-1:r1' });
    expect(() => parseRunContentStageRequest({ stageId: '../bad' })).toThrow('content_stage_run_invalid');
  });

  it('uses a deterministic safe immutable object path', () => {
    expect(contentStageObjectPath('request-1:quiz_questions:topic-1:r1', 1, 1, 'lease-1')).toMatch(/^content-factory-stages\/[a-f0-9]{64}\/r1\/a1-[a-f0-9]{64}\.json$/);
  });

  it.each([1, 10, 49, 50, 51, 1000])('forces lesson phrases to 50 in the worker even for stored requested count %i', (requestedCount) => {
    expect(resolveContentStageCount('lesson_phrases', requestedCount)).toBe(50);
  });

  it.each([['quiz_questions', 10], ['challenge_questions', 10]] as const)('forces %s to exact ten-item batches', (kind, expected) => {
    expect(resolveContentStageCount(kind, 1)).toBe(expected);
    expect(resolveContentStageCount(kind, 100)).toBe(expected);
  });

  it('forces Arena to exact ten and records its verified topic grounding', () => {
    expect(resolveContentStageCount('arena_questions', 1)).toBe(10);
    const receipt = contentStageGroundingReceipt({ artifactId: 'arena-topic-1', contentHash: 'a'.repeat(64), topic: { topicId: 'city', runtimePolicy: { questionTimeoutMs: 40000 } }, previousQuestionKeys: ['old'] });
    expect(receipt).toMatchObject({ topicArtifactId: 'arena-topic-1', topic: { topicId: 'city' }, previousQuestionKeys: ['old'] });
  });

  it.each(['quiz_question_replacement', 'challenge_question_replacement', 'arena_question_replacement'] as const)('forces %s to one result', (kind) => {
    expect(resolveContentStageCount(kind, 99)).toBe(1);
  });

  it('preserves bounded flashcard batch counts and forces one-card replacements', () => {
    for (const count of [1, 10, 20]) expect(resolveContentStageCount('flashcard_items', count)).toBe(count);
    expect(() => resolveContentStageCount('flashcard_items', 21)).toThrow('flashcard_batch_count_must_be_1_to_20');
    expect(resolveContentStageCount('flashcard_item_replacement', 10)).toBe(1);
  });

  it('runs the exact prompt packet through an injected provider', async () => {
    const provider: StageGenerationProvider = { generate: async () => JSON.stringify({ stage: 'quiz_questions', items: Array.from({ length: 10 }, (_, index) => ({ id: `q${index + 1}` })) }) };
    const result = await generateContentStageArtifact({ provider, model: 'fake', stage: { stageId: 'request-1:quiz_questions:topic-1:r1', kind: 'quiz_questions', promptVersion: 'v1', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Practice introductions', count: 10, approvedArtifactIds: ['topic-artifact'], exemplarIds: [], previousContentFingerprints: [], revision: 1, attempt: 1, leaseToken: 'lease-1' } });
    expect(result.artifact).toMatchObject({ stage: 'quiz_questions' });
    expect(result.receipt).toMatchObject({ model: 'fake', promptVersion: 'v1' });
    expect(result.objectPath).toMatch(/^content-factory-stages\//);
  });

  it('sends approved derived-stage grounding and records its hash', async () => {
    let prompt = '';
    const provider: StageGenerationProvider = { generate: async (input) => { prompt = input.prompt; return JSON.stringify({ stage: 'lesson_vocabulary', items: [{ lemma: 'book' }] }); } };
    const grounding = { phraseArtifactId: 'phrases-1', acceptedCandidates: [{ lemma: 'book', sourcePhraseIds: ['p1'] }] };
    const result = await generateContentStageArtifact({ provider, model: 'fake', stage: { stageId: 'request-1:lesson_vocabulary:lesson-1:r1', kind: 'lesson_vocabulary', promptVersion: 'v1', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A1', objective: 'Books', count: 1, approvedArtifactIds: ['phrases-1'], exemplarIds: [], previousContentFingerprints: [], revision: 1, attempt: 1, leaseToken: 'lease-1', grounding } });
    expect(prompt).toContain('acceptedCandidates');
    expect(prompt).toContain('sourcePhraseIds');
    expect(result.receipt.groundingHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('exposes candidate exclusions in a bounded preview receipt without duplicating all phrases', () => {
    const receipt = contentStageGroundingReceipt({ phraseArtifactId: 'phrases-2', phraseContentHash: 'a'.repeat(64), phrases: Array.from({ length: 50 }, (_, id) => ({ id })), extractedCandidates: [{ lemma: 'book' }], acceptedCandidates: [], excludedPrevious: [{ lemma: 'book', previousLessonId: 1 }], rejectedCandidates: [] });
    expect(receipt).toMatchObject({ excludedPrevious: [{ lemma: 'book', previousLessonId: 1 }] });
    expect(receipt).not.toHaveProperty('phrases');
  });

  it('keeps flashcard dedupe sources in the grounding receipt', () => {
    expect(contentStageGroundingReceipt({ artifactId: 'idea-1', contentHash: 'a'.repeat(64), packIdea: { packId: 'city' }, previousCardKeys: ['pack'], lessonCardKeys: ['lesson'], publishedCardKeys: ['published'] })).toEqual({ packIdeaArtifactId: 'idea-1', packIdeaContentHash: 'a'.repeat(64), packIdea: { packId: 'city' }, previousCardKeys: ['pack'], lessonCardKeys: ['lesson'], publishedCardKeys: ['published'] });
  });

  it('derives semantic keys from a selected approved lesson and published English catalog cards', () => {
    expect(flashcardKeysFromLessonPhrases([{ targetText: 'Where is the station?', sourceText: 'Где вокзал?' }])).toEqual(['where is the station\0где вокзал']);
    expect(flashcardKeysFromPublishedPacks([{ listingStatus: 'published', studyTarget: 'en', cards: [{ en: 'A ticket, please.', ru: 'Билет, пожалуйста.', uk: 'Квиток, будь ласка.' }] }], 'en', 'ru')).toEqual(['a ticket please\0билет пожалуйста']);
    expect(flashcardKeysFromPublishedPacks([{ listingStatus: 'draft', studyTarget: 'en', cards: [{ en: 'Hidden', ru: 'Скрыто' }] }], 'en', 'ru')).toEqual([]);
    expect(flashcardKeysFromPublishedPacks([{ listingStatus: 'published', studyTarget: 'fr', cards: [{ en: 'Wrong target', ru: 'Не тот язык' }] }], 'en', 'ru')).toEqual([]);
  });

  it('keeps a 7/10 checkpoint retryable across malformed refill attempts', () => {
    const make = (index: number) => ({ id: `c${index}`, front: `Front ${index}`, back: `Back ${index}`, exampleTarget: `Example ${index}`, exampleSource: `Пример ${index}`, note: 'Note', sourceReferences: ['pack:test'] });
    const grounding = { packIdea: {}, previousCardKeys: [], lessonCardKeys: [], publishedCardKeys: [] };
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: Array.from({ length: 7 }, (_, index) => make(index)) }, 10, grounding)!;
    expect(flashcardPartialFailureState(checkpoint, null)).toEqual({ errorCode: 'provider_schema_partial_refill', errorMessage: 'flashcard_partial_refill_failed', retryable: true, checkpoint, acceptedCount: 7, missingCount: 3 });
    const restored = parseFlashcardPartialCheckpoint(checkpoint, 10);
    expect(mergeFlashcardPartialCheckpoint(restored, { stage: 'flashcard_items', items: [make(7), make(8), make(9)] }, grounding).items).toHaveLength(10);
  });

  it('builds bounded flashcard item grounding from one idea, its ledger and stored optional key arrays', () => {
    const ledger = approveFlashcardBatch(parseFlashcardPackLedger(null, 'idea-1'), { batchArtifactId: 'batch-1', items: [{ id: 'c1', front: 'Train', back: 'Поезд' }] }).ledger;
    const grounding = buildFlashcardItemsWorkerGrounding(
      { artifactId: 'idea-1', contentHash: 'a'.repeat(64), packIdea: { packId: 'city' } },
      ledger,
      { lessonCardKeys: ['lesson-key', '', 3], publishedCardKeys: ['published-key'] },
    );
    expect(grounding).toMatchObject({ previousCardKeys: ['train\0поезд'], lessonCardKeys: ['lesson-key'], publishedCardKeys: ['published-key'] });
    expect(buildFlashcardItemsWorkerGrounding({ artifactId: 'idea-1', contentHash: 'a'.repeat(64), packIdea: {} }, parseFlashcardPackLedger(null, 'idea-1'), {}).lessonCardKeys).toEqual([]);
    expect(flashcardLedgerDocumentId('request-1', 'idea-1')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('grounds one flashcard replacement and excludes only the original semantic key', () => {
    let ledger = approveFlashcardBatch(parseFlashcardPackLedger(null, 'idea-1'), { batchArtifactId: 'batch-1', items: [{ id: 'c1', front: 'Train', back: 'Поезд' }, { id: 'c2', front: 'Bus', back: 'Автобус' }] }).ledger;
    ledger = approveFlashcardBatch(ledger, { batchArtifactId: 'batch-2', items: [{ id: 'c3', front: 'Taxi', back: 'Такси' }] }).ledger;
    const grounding = buildFlashcardReplacementWorkerGrounding(
      { artifactId: 'batch-1', packIdeaArtifactId: 'idea-1', items: [{ id: 'c1', front: 'Train', back: 'Поезд' }, { id: 'c2', front: 'Bus', back: 'Автобус' }] },
      ledger,
      { replacementForCardId: 'c1', batchGroundingReceipt: { packIdea: { packId: 'city' }, lessonCardKeys: ['train\0поезд', 'lesson-other'], publishedCardKeys: ['published-old'] }, publishedCardKeys: ['published-new'] },
    );
    expect(grounding.originalCard).toMatchObject({ id: 'c1' });
    expect(grounding.previousCardKeys).toEqual(expect.arrayContaining(['bus\0автобус', 'taxi\0такси']));
    expect(grounding.previousCardKeys).not.toContain('train\0поезд');
    expect(grounding.lessonCardKeys).toEqual(['lesson-other']);
    expect(grounding.publishedCardKeys).toEqual(['published-old', 'published-new']);
    const receipt = contentStageGroundingReceipt(grounding);
    expect(receipt).toMatchObject({ batchArtifactId: 'batch-1', replacementForCardId: 'c1', originalCard: { id: 'c1' }, previousCardKeys: expect.arrayContaining(['bus\0автобус']) });
    expect(receipt).not.toHaveProperty('items');
    expect(() => buildFlashcardReplacementWorkerGrounding({ artifactId: 'batch-1', packIdeaArtifactId: 'idea-1', items: [] }, ledger, { replacementForCardId: 'missing' })).toThrow('flashcard_replacement_original_not_found');
  });

  it('wires flashcard worker branches to approved loaders and the dedicated ledger collection', () => {
    const source = fs.readFileSync(path.join(__dirname, 'content_stage_worker.ts'), 'utf8');
    expect(source).toContain("stage.kind === 'flashcard_items'");
    expect(source).toContain('loadApprovedFlashcardPackIdea');
    expect(source).toContain("collection('content_factory_flashcard_ledgers')");
    expect(source).toContain("stage.kind === 'flashcard_item_replacement'");
    expect(source).toContain('loadFlashcardBatchForReview');
    expect(source).toContain('flashcardPartialCheckpoint');
    expect(source).toContain('acceptedCount');
    expect(source).toContain('missingCount');
    expect(source).toContain('loadPublishedFlashcardKeysWithRegistry');
    expect(source).toContain("collection('content_factory_flashcard_semantic_keys')");
    expect(source).toContain('findPublishedFlashcardDuplicateKeys');
    expect(source).toContain('flashcardRegistryDocumentId');
    expect(source).toContain('db.getAll(...refs)');
    expect(source).toContain("config.mode === 'registry'");
    expect(source).toContain('catalogGeneration === verifiedGeneration');
    expect(source).toContain('findPublishedFlashcardDuplicateKeys');
    expect(source).toContain('flashcardRegistryDocumentId(partition, key)');
    expect(source).toContain('await db.getAll(...refs)');
  });

  it('adds accepted checkpoint keys to retry grounding without mutating base grounding', () => {
    const card = (id: string) => ({ id, front: `Front ${id}`, back: `Перевод ${id}`, exampleTarget: `Example ${id}`, exampleSource: `Пример ${id}`, note: 'Note', sourceReferences: ['pack:test'] });
    const base = { packIdea: { packId: 'test' }, previousCardKeys: ['existing'], lessonCardKeys: [], publishedCardKeys: [] };
    const checkpoint = createFlashcardPartialCheckpoint({ stage: 'flashcard_items', items: [card('c1'), card('c2')] }, 5, base)!;
    const retry = buildFlashcardPartialRetryGrounding(base, checkpoint);
    expect(retry).toMatchObject({ acceptedCount: 2, missingCount: 3, acceptedCardIds: ['c1', 'c2'] });
    expect(retry.previousCardKeys).toEqual(expect.arrayContaining(['existing', ...checkpoint.acceptedSemanticKeys]));
    expect(base.previousCardKeys).toEqual(['existing']);
  });

  it('keeps obsolete pause/crash objects isolated from a resumed attempt', () => {
    const first = acquireStageLease({ state: 'queued', attempts: 0 }, { nowMs: 1000, leaseMs: 60000, leaseToken: 'lease-1' });
    expect(first.action).toBe('run');
    if (first.action !== 'run') throw new Error('expected first lease');
    const obsoletePath = contentStageObjectPath('request-1:quiz_questions:topic-1:r1', 1, first.attempt, first.leaseToken);
    const second = acquireStageLease({ state: 'running', attempts: 1, leaseToken: 'lease-1', leaseExpiresAtMs: 1000 }, { nowMs: 2000, leaseMs: 60000, leaseToken: 'lease-2' });
    expect(second.action).toBe('run');
    if (second.action !== 'run') throw new Error('expected second lease');
    const currentPath = contentStageObjectPath('request-1:quiz_questions:topic-1:r1', 1, second.attempt, second.leaseToken);
    expect(currentPath).not.toBe(obsoletePath);
    expect(canCommitStageLease({ state: 'running', attempts: 2, leaseToken: 'lease-2' }, first)).toBe(false);
    expect(canCommitStageLease({ state: 'running', attempts: 2, leaseToken: 'lease-2' }, second)).toBe(true);
    expect(contentStageLeaseTokenHash(second.leaseToken)).toMatch(/^[a-f0-9]{64}$/);
  });
});
