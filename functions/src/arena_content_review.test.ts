import {
  ARENA_TASK_REQUIRED_RECEIPT_COUNTS,
  assessArenaPoolPublication,
  assessArenaTaskRelease,
  buildArenaDeterministicFacts,
  validateArenaQualityReceipt,
  type ArenaQualityReceipt,
} from './arena_content_review';
import {
  ARENA_GENERATOR_PROFILES,
  arenaCanonicalSha256,
} from './arena_content_generation';

const hash = (seed: string) => arenaCanonicalSha256({ seed });
const target = 'es' as const;
const draft = {
  taskId: 'es_guess_0001',
  studyTarget: target,
  mode: 'guess_phrase' as const,
  difficulty: 1 as const,
  poolVersion: 'arena-es-v1',
  prompt: 'Выберите грамматически правильную фразу.',
  options: ['Hoy estoy en casa.', 'Hoy está en casa.', 'Hoy soy en casa.', 'Hoy estoy casa.'],
  correctIndex: 0,
  explanation: {
    ruleNote: 'Для местонахождения используется estar.',
    wrongOptionReasons: ['', 'Неверное согласование.', 'Неверная связка.', 'Пропущен предлог.'],
  },
  provenance: { sourceIds: ['es-a1-location-1'] },
};
const evidencePack = {
  facts: [
    { id: 'es-estar-location', statement: 'Estar expresses temporary location.' },
    { id: 'es-subject-agreement', statement: 'Estoy agrees with first person singular.' },
  ],
};
const facts = buildArenaDeterministicFacts(draft);
const identity = {
  taskId: draft.taskId,
  studyTarget: target,
  mode: draft.mode,
  difficulty: draft.difficulty,
  poolVersion: draft.poolVersion,
  draftSha256: arenaCanonicalSha256(draft),
  profileSha256: ARENA_GENERATOR_PROFILES[target].profileSha256,
  generatorPromptSha256: hash('prompt'),
  evidencePackSha256: arenaCanonicalSha256(evidencePack),
  approvedExemplarSha256: hash('exemplar'),
  semanticLedgerSha256: hash('ledger'),
  deterministicFactsSha256: facts.factsSha256,
};

function receipt(
  role: ArenaQualityReceipt['role'],
  runId: string,
  overrides: Partial<ArenaQualityReceipt> = {},
): ArenaQualityReceipt {
  return {
    schemaVersion: 'arena-quality-receipt-v1',
    role,
    verdict: 'PASS',
    ...identity,
    issuedAt: '2026-09-19T10:00:00.000Z',
    runId,
    checks: [{ code: 'checked', verdict: 'PASS' }],
    evidence: [{
      jsonPointer: '/options/0', exactQuote: draft.options[0], factIds: ['es-estar-location'],
    }],
    findings: [],
    mustFix: [],
    independence: { authorRunIdDifferent: true, freshContext: true, selfIssued: false },
    ...overrides,
  };
}

function allTaskReceipts(): ArenaQualityReceipt[] {
  return Object.entries(ARENA_TASK_REQUIRED_RECEIPT_COUNTS).flatMap(([role, count]) => (
    Array.from({ length: count }, (_, index) => receipt(
      role as ArenaQualityReceipt['role'], `${role}-${index + 1}`,
    ))
  ));
}

describe('Arena quality receipts and decisions', () => {
  it('builds PASS deterministic facts only when target, options and distractor proofs are exact', () => {
    expect(facts.ok).toBe(true);
    expect(facts.findings).toEqual([]);
    expect(facts.factsSha256).toMatch(/^[a-f0-9]{64}$/);

    const duplicate = buildArenaDeterministicFacts({
      ...draft, options: ['Sí.', ' sí ', 'No.', 'Quizá.'],
    });
    expect(duplicate).toMatchObject({ ok: false });
    expect(duplicate.findings).toContain('options_not_unique');

    const leaked = buildArenaDeterministicFacts({ ...draft, studyTarget: 'de' });
    expect(leaked).toMatchObject({ ok: false });
    expect(leaked.findings).toContain('target_script_or_lexicon_mismatch');
  });

  it('validates exact hashes, quotes, fact IDs and independence', () => {
    expect(validateArenaQualityReceipt(receipt('mode_guardian', 'mode-1'), {
      identity, draft, evidencePack,
    })).toEqual({ ok: true });
    expect(validateArenaQualityReceipt(receipt('mode_guardian', 'mode-1', {
      draftSha256: hash('stale'),
    }), { identity, draft, evidencePack })).toEqual({ ok: false, reason: 'receipt_hash_mismatch' });
    expect(validateArenaQualityReceipt(receipt('mode_guardian', 'mode-1', {
      evidence: [{ jsonPointer: '/options/0', exactQuote: 'changed', factIds: ['es-estar-location'] }],
    }), { identity, draft, evidencePack })).toEqual({ ok: false, reason: 'receipt_quote_mismatch' });
    expect(validateArenaQualityReceipt(receipt('mode_guardian', 'mode-1', {
      evidence: [{ jsonPointer: '/options/0', exactQuote: draft.options[0], factIds: ['missing-fact'] }],
    }), { identity, draft, evidencePack })).toEqual({ ok: false, reason: 'receipt_fact_missing' });
  });

  it('returns HOLD for missing or stale agents and BLOCK for deterministic or agent rejection', () => {
    expect(assessArenaTaskRelease({ identity, draft, evidencePack, deterministicFacts: facts, receipts: [] }))
      .toMatchObject({ decision: 'HOLD', reason: 'required_receipts_missing' });
    expect(assessArenaTaskRelease({
      identity, draft, evidencePack, deterministicFacts: facts,
      receipts: allTaskReceipts().slice(0, -1),
    })).toMatchObject({ decision: 'HOLD', reason: 'required_receipts_missing' });
    expect(assessArenaTaskRelease({
      identity, draft, evidencePack, deterministicFacts: facts,
      receipts: allTaskReceipts().map((item, index) => index === 0
        ? { ...item, verdict: 'BLOCK', findings: ['ambiguous'], mustFix: ['replace'] }
        : item),
    })).toMatchObject({ decision: 'BLOCK', reason: 'review_blocked' });
    expect(assessArenaTaskRelease({
      identity, draft, evidencePack,
      deterministicFacts: { ...facts, ok: false, findings: ['mode_contract_invalid'] },
      receipts: allTaskReceipts(),
    })).toMatchObject({ decision: 'BLOCK', reason: 'deterministic_failure' });
  });

  it('passes a task only with every isolated agent slot present', () => {
    expect(assessArenaTaskRelease({
      identity, draft, evidencePack, deterministicFacts: facts, receipts: allTaskReceipts(),
    })).toEqual({ decision: 'PASS' });
  });

  it('fails pool publication unless the target manifest proves 4,000 reviewed tasks and every role', () => {
    const roleCounts = Object.fromEntries(Object.entries(ARENA_TASK_REQUIRED_RECEIPT_COUNTS)
      .map(([role, count]) => [role, count * 4_000]));
    const manifestBody = {
      schemaVersion: 'arena-target-pool-manifest-v1',
      studyTarget: target,
      poolVersion: 'arena-es-v1',
      taskCount: 4_000,
      reviewedTaskCount: 4_000,
      profileSha256: ARENA_GENERATOR_PROFILES[target].profileSha256,
      taskReceiptLedgerSha256: hash('receipt-ledger'),
      taskBundleSha256: hash('bundle'),
      modeDifficultyCounts: ARENA_GENERATOR_PROFILES[target].modeDifficultyQuotas,
      taskReceiptRoleCounts: roleCounts,
    };
    const manifest = { ...manifestBody, manifestSha256: arenaCanonicalSha256(manifestBody) };
    const poolIdentity = {
      ...identity,
      taskId: `pool:${manifest.poolVersion}`,
      mode: 'pool' as const,
      difficulty: 0 as const,
      draftSha256: manifest.manifestSha256,
      deterministicFactsSha256: manifest.taskBundleSha256,
    };
    const poolEvidence = [{
      jsonPointer: '/poolVersion', exactQuote: manifest.poolVersion, factIds: ['es-estar-location'],
    }];
    const poolReceipts = [
      receipt('pool_diversity_auditor', 'pool-audit', { ...poolIdentity, evidence: poolEvidence }),
      receipt('release_guardian', 'release', { ...poolIdentity, evidence: poolEvidence }),
    ];
    expect(assessArenaPoolPublication({ manifest, evidencePack, receipts: poolReceipts }))
      .toEqual({ decision: 'PASS' });
    expect(assessArenaPoolPublication({
      manifest: { ...manifest, reviewedTaskCount: 3_999 }, evidencePack, receipts: poolReceipts,
    })).toMatchObject({ decision: 'BLOCK', reason: 'pool_manifest_invalid' });
    expect(assessArenaPoolPublication({ manifest, evidencePack, receipts: poolReceipts.slice(0, 1) }))
      .toMatchObject({ decision: 'HOLD', reason: 'pool_receipts_missing' });
  });
});
