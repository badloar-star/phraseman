import { TOURNAMENT_SEMANTIC_PROMPTS, type SemanticVerdict } from './tournament_semantic_review';
import { createTournamentSemanticCandidate } from './tournament_semantic_contract';
import {
  createTournamentSemanticReceiptStore,
  semanticReceiptId,
  validateTournamentSemanticReceipt,
  type TournamentSemanticReceipt,
  type TournamentSemanticReceiptPersistence,
} from './tournament_semantic_receipt_store';

class MemoryPersistence implements TournamentSemanticReceiptPersistence {
  rows = new Map<string, unknown>();
  async get(path: string) { return this.rows.get(path) ?? null; }
  async create(path: string, value: unknown) {
    if (this.rows.has(path)) throw new Error('already_exists');
    this.rows.set(path, JSON.parse(JSON.stringify(value)));
  }
}

const candidate = createTournamentSemanticCandidate({
  candidateId: 'candidate-a', mode: 'guess_phrase', difficulty: 2,
  prompt: 'Выберите правильную форму.', context: { authoredSentence: 'She is ready.' },
  reviewSubjects: [
    { subjectId: 'correct', kind: 'choice_option', declaredRole: 'correct', text: 'She is ready.', completedText: 'She is ready.', metadata: { partOfSpeech: 'verb', grammaticality: 'valid', minimalTwin: 'true' } },
    ...['She am ready.', 'She are ready.', 'She be ready.'].map((text, index) => ({
      subjectId: `distractor_${index + 1}`, kind: 'choice_option' as const,
      declaredRole: 'distractor' as const, text, completedText: text,
      trapType: 'agreement' as const, reason: 'Нарушено согласование.',
      metadata: { partOfSpeech: 'verb', grammaticality: 'invalid', minimalTwin: 'true' },
    })),
  ],
  provenanceKeys: ['plan:1:phrase'],
});

const verdict = (pass: 'primary' | 'adversarial', model: string): SemanticVerdict => ({
  contentSha256: candidate.contentSha256, reviewContractVersion: 'tournament-semantic-review-v2',
  promptVersion: `tournament-semantic-${pass}-v3`, pass, model, verdict: 'PASS',
  promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
  acceptableAnswerCount: 1, errorOptionCount: 3,
  subjects: candidate.reviewSubjects.map((subject) => ({
    subjectId: subject.subjectId, verdict: 'PASS', findingCode: null, explanation: 'ok',
    partOfSpeech: 'verb',
    grammaticality: subject.declaredRole === 'correct' ? 'valid' as const : 'invalid' as const,
    minimalTwin: true,
    violationType: subject.declaredRole === 'correct' ? null : 'agreement',
  })),
  blockingFindings: [],
});

const receipt: Extract<TournamentSemanticReceipt, { decision: 'PASS' }> = {
  decision: 'PASS', contentSha256: candidate.contentSha256, canonicalTaskSnapshotHash: candidate.contentSha256,
  semanticSignature: candidate.semanticSignature,
  candidateId: candidate.candidateId, mode: candidate.mode, difficulty: candidate.difficulty,
  provenanceKeys: candidate.provenanceKeys, reviewContractVersion: 'tournament-semantic-review-v2',
  primaryPromptVersion: 'tournament-semantic-primary-v3',
  adversarialPromptVersion: 'tournament-semantic-adversarial-v3',
  promptSetSha256: TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256,
  primaryModel: 'gpt-4.1-mini', adversarialModel: 'gpt-4.1',
  requestAccounting: { attempts: 2, inputTokens: 10, outputTokens: 5 },
  createdAtMs: 1, completedAtMs: 2, generationJobId: 'job-a',
  primaryVerdict: verdict('primary', 'gpt-4.1-mini'),
  adversarialVerdict: verdict('adversarial', 'gpt-4.1'),
};

describe('tournament semantic receipt store', () => {
  it('uses deterministic create-only parent receipts and reuses only byte-equal evidence', async () => {
    const persistence = new MemoryPersistence();
    const store = createTournamentSemanticReceiptStore(persistence);
    const id = semanticReceiptId(receipt.contentSha256, receipt.reviewContractVersion, receipt.promptSetSha256, {
      primaryModel: receipt.primaryModel, adversarialModel: receipt.adversarialModel,
    });
    expect(() => validateTournamentSemanticReceipt(JSON.parse(JSON.stringify(receipt)), candidate)).not.toThrow();
    await expect(store.createImmutable(receipt, candidate)).resolves.toEqual({ reused: false, id });
    await expect(store.createImmutable(receipt, candidate)).resolves.toEqual({ reused: true, id });
    await expect(store.createImmutable({ ...receipt, generationJobId: 'changed' }, candidate))
      .rejects.toThrow('receipt_conflict');
    await expect(store.getReusableApproval({
      candidate, reviewContractVersion: receipt.reviewContractVersion,
      promptSetSha256: receipt.promptSetSha256,
      primaryModel: receipt.primaryModel, adversarialModel: receipt.adversarialModel,
    })).resolves.toEqual(receipt);
  });

  it('stores incomplete evidence only under an immutable attempt-scoped child', async () => {
    const persistence = new MemoryPersistence();
    const store = createTournamentSemanticReceiptStore(persistence);
    const evidence: TournamentSemanticReceipt = {
      ...receipt, decision: 'ERROR', internalAttemptId: 'attempt-a',
      completedPasses: ['primary'], failureCode: 'provider_timeout',
    };
    delete (evidence as any).primaryVerdict;
    delete (evidence as any).adversarialVerdict;
    await expect(store.createEvidence(evidence)).resolves.toEqual(expect.objectContaining({ reused: false }));
    await expect(store.getReusableApproval({
      candidate, reviewContractVersion: receipt.reviewContractVersion,
      promptSetSha256: receipt.promptSetSha256,
      primaryModel: receipt.primaryModel, adversarialModel: receipt.adversarialModel,
    })).resolves.toBeNull();
  });

  it('rejects a receipt missing any required immutable identity field', async () => {
    const store = createTournamentSemanticReceiptStore(new MemoryPersistence());
    const malformed = { ...receipt } as any;
    delete malformed.canonicalTaskSnapshotHash;
    await expect(store.createImmutable(malformed, candidate)).rejects.toThrow('receipt_invalid');
  });

  it('binds immutable approvals directly to the semantic signature', () => {
    expect(() => validateTournamentSemanticReceipt({
      ...receipt,
      semanticSignature: 'f'.repeat(64),
    }, candidate)).toThrow('receipt_candidate_mismatch');
    const missing = { ...receipt } as any;
    delete missing.semanticSignature;
    expect(() => validateTournamentSemanticReceipt(missing, candidate)).toThrow('receipt_invalid');
  });

  it('never reuses a cached PASS with an incomplete option matrix', async () => {
    const persistence = new MemoryPersistence();
    const store = createTournamentSemanticReceiptStore(persistence);
    const id = semanticReceiptId(receipt.contentSha256, receipt.reviewContractVersion, receipt.promptSetSha256, receipt);
    persistence.rows.set(`tournament_semantic_review_receipts/${id}`, {
      ...receipt,
      adversarialVerdict: { ...receipt.adversarialVerdict, subjects: [receipt.adversarialVerdict.subjects[0]] },
    });
    await expect(store.getReusableApproval({
      candidate,
      reviewContractVersion: receipt.reviewContractVersion,
      promptSetSha256: receipt.promptSetSha256,
      primaryModel: receipt.primaryModel,
      adversarialModel: receipt.adversarialModel,
    })).rejects.toThrow('receipt_invalid');
  });
});
