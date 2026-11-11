import {
  decidePremiumRestoreAuthority,
  decidePremiumRestoreTails,
  normalizeRawOriginalOwnerUid,
  type PremiumRestoreAuthorityInput,
} from './revenuecat_restore_owner_policy';

const base = (overrides: Partial<PremiumRestoreAuthorityInput> = {}): PremiumRestoreAuthorityInput => ({
  eventType: 'RENEWAL',
  provenanceKind: 'authenticated_webhook',
  requesterCanonicalUid: null,
  rawOriginalOwnerUid: null,
  evidenceCanonicalOwnerUid: null,
  verifiedOwner: null,
  historyOwnerUids: [],
  receipt: null,
  ...overrides,
});

const owner = (canonicalOwnerUidAtCreation: string, originalOwnerUid = canonicalOwnerUidAtCreation) => ({
  originalOwnerUid,
  canonicalOwnerUidAtCreation,
  currentCanonicalOwnerUid: canonicalOwnerUidAtCreation,
});

const legacyReceipt = (targetOwnerUid: string) => ({
  kind: 'legacy' as const,
  fingerprintMatches: true,
  targetOwnerUid,
});

const normalizedS1Receipt = (
  targetOwnerUid: string | null,
  overrides: Partial<NonNullable<PremiumRestoreAuthorityInput['receipt']>> = {},
) => ({
  kind: 's1' as const,
  fingerprintMatches: true,
  targetOwnerUid,
  provenanceKind: 'authenticated_webhook' as const,
  requesterCanonicalUid: null,
  evidenceKind: 'none' as const,
  rawOriginalOwnerUid: null,
  evidenceCanonicalOwnerUid: null,
  ...overrides,
});

describe('original-account-only restore authority', () => {
  it.each([
    ['', null],
    ['$RCAnonymousID:abc', null],
    ['$RCAabc', null],
    ['contains/slash', null],
    ['x'.repeat(161), null],
    [' raw-owner ', 'raw-owner'],
  ])('normalizes raw original identity without guessing: %p', (raw, expected) => {
    expect(normalizeRawOriginalOwnerUid(raw)).toBe(expected);
  });

  it.each([
    [['B'], 'A', 'lineage_owner_conflict'],
    [['A', 'B'], 'A', 'lineage_owner_conflict'],
  ] as const)('rejects global exact-lineage history before duplicate: H=%p V=%s', (historyOwnerUids, verified, decision) => {
    expect(decidePremiumRestoreAuthority(base({
      verifiedOwner: owner(verified),
      historyOwnerUids: [...historyOwnerUids],
      receipt: legacyReceipt(verified),
    }))).toMatchObject({ decision, paymentDuplicate: false, targetOwnerUid: null });
  });

  it('rejects authenticated evidence B against verified/history A before duplicate', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE',
      rawOriginalOwnerUid: 'raw-b',
      evidenceCanonicalOwnerUid: 'B',
      verifiedOwner: owner('A'),
      historyOwnerUids: ['A'],
      receipt: legacyReceipt('A'),
    }))).toMatchObject({ decision: 'lineage_owner_conflict', paymentDuplicate: false });
  });

  it('treats a verified owner without matching exact-lineage history as inconsistent', () => {
    expect(decidePremiumRestoreAuthority(base({ verifiedOwner: owner('A') })))
      .toMatchObject({ decision: 'owner_lineage_inconsistent', targetOwnerUid: null });
  });

  it('creates the immutable owner only from authenticated original-purchase evidence', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE',
      rawOriginalOwnerUid: 'raw-L',
      evidenceCanonicalOwnerUid: 'A',
    }))).toMatchObject({ decision: 'create_verified_owner', targetOwnerUid: 'A', createOwner: true, applyLifecycle: true });
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE',
      provenanceKind: 'synthetic_reconcile',
      requesterCanonicalUid: 'A',
      rawOriginalOwnerUid: 'A',
      evidenceCanonicalOwnerUid: 'A',
    }))).toMatchObject({ decision: 'lineage_owner_unproven', createOwner: false });
  });

  it('verifies a matching legacy owner and preserves raw L separately from canonical E', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'NON_RENEWING_PURCHASE', rawOriginalOwnerUid: 'raw-L', evidenceCanonicalOwnerUid: 'A', historyOwnerUids: ['A'],
    }))).toMatchObject({ decision: 'verify_matching_legacy_owner', targetOwnerUid: 'A', createOwner: true, applyLifecycle: true });
  });

  it('permits only the immutable owner metadata write for a compatible pre-S1 duplicate', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE', rawOriginalOwnerUid: 'raw-L', evidenceCanonicalOwnerUid: 'A', historyOwnerUids: ['A'], receipt: legacyReceipt('A'),
    }))).toMatchObject({ decision: 'verify_matching_legacy_owner_duplicate', targetOwnerUid: 'A', createOwner: true, applyLifecycle: false, paymentDuplicate: true });
  });

  it('holds an owner upgrade when the receipt has no exact-lineage history', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE', rawOriginalOwnerUid: 'A', evidenceCanonicalOwnerUid: 'A', receipt: legacyReceipt('A'),
    }))).toMatchObject({ decision: 'verified_owner_upgrade_unsafe', targetOwnerUid: null, createOwner: false, paymentDuplicate: false });
  });

  it('never calls changed replay identity an ordinary duplicate', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE', rawOriginalOwnerUid: 'raw-B', evidenceCanonicalOwnerUid: 'B', verifiedOwner: owner('A', 'raw-A'), historyOwnerUids: ['A'], receipt: legacyReceipt('A'),
    }))).toMatchObject({ decision: 'lineage_owner_conflict', paymentDuplicate: false });
  });

  it.each([
    ['evidence B', { evidenceCanonicalOwnerUid: 'B', rawOriginalOwnerUid: 'raw-B' }],
    ['synthetic requester B', { provenanceKind: 'synthetic_reconcile', requesterCanonicalUid: 'B' }],
    ['unresolvable receipt owner', { receipt: { kind: 'legacy', fingerprintMatches: true, targetOwnerUid: null } }],
  ] as const)('rejects incompatible pre-S1 receipt authority: %s', (_label, override) => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE', verifiedOwner: owner('A'), historyOwnerUids: ['A'], receipt: legacyReceipt('A'), ...override,
    }))).toMatchObject({ paymentDuplicate: false, targetOwnerUid: null });
  });

  it('lets requester B trigger A lifecycle but never authorizes or discloses A to B', () => {
    expect(decidePremiumRestoreAuthority(base({
      provenanceKind: 'synthetic_reconcile', requesterCanonicalUid: 'B', verifiedOwner: owner('A'), historyOwnerUids: ['A'],
    }))).toMatchObject({ decision: 'verified_lifecycle', targetOwnerUid: 'A', requesterDecision: 'not_requester', applyLifecycle: true });
  });

  it.each(['RENEWAL', 'REFUND', 'EXPIRATION'])(
    'continues one authenticated legacy owner for non-original %s lifecycle only',
    (eventType) => {
      expect(decidePremiumRestoreAuthority(base({ eventType, historyOwnerUids: ['A'] }))).toMatchObject({
        decision: 'single_legacy_continuation', targetOwnerUid: 'A', createOwner: false, applyLifecycle: true,
      });
    },
  );

  it('preserves the separately authorized synthetic legacy lifecycle row', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'NON_RENEWING_PURCHASE',
      provenanceKind: 'synthetic_reconcile',
      requesterCanonicalUid: 'B',
      historyOwnerUids: ['A'],
    }))).toMatchObject({
      decision: 'single_legacy_continuation', targetOwnerUid: 'A', requesterDecision: 'not_requester', applyLifecycle: true,
    });
  });

  it.each([
    ['INITIAL_PURCHASE', 'raw-L', null, null],
    ['NON_RENEWING_PURCHASE', 'raw-L', null, null],
    ['INITIAL_PURCHASE', null, null, null],
    ['INITIAL_PURCHASE', 'raw-L', null, owner('A')],
  ] as const)(
    'keeps unresolved authenticated original purchase unproven: %s raw=%p verified=%p',
    (eventType, rawOriginalOwnerUid, evidenceCanonicalOwnerUid, verifiedOwner) => {
      expect(decidePremiumRestoreAuthority(base({
        eventType,
        rawOriginalOwnerUid,
        evidenceCanonicalOwnerUid,
        verifiedOwner,
        historyOwnerUids: ['A'],
      }))).toMatchObject({
        decision: 'lineage_owner_unproven', targetOwnerUid: null, createOwner: false,
        applyLifecycle: false, paymentDuplicate: false,
      });
    },
  );

  it('rejects an old inconsistent S1 receipt instead of normalizing it into a duplicate', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE',
      rawOriginalOwnerUid: null,
      evidenceCanonicalOwnerUid: null,
      historyOwnerUids: ['A'],
      receipt: {
        kind: 's1',
        fingerprintMatches: true,
        targetOwnerUid: 'A',
        provenanceKind: 'authenticated_webhook',
        requesterCanonicalUid: null,
        evidenceKind: 'authenticated_original_purchase_webhook_v1',
        rawOriginalOwnerUid: 'raw-L',
        evidenceCanonicalOwnerUid: null,
      },
    }))).toMatchObject({ decision: 'receipt_evidence_conflict', targetOwnerUid: null, paymentDuplicate: false });
  });

  it.each([
    ['S1 target differs from V/H', {
      verifiedOwner: owner('A'), historyOwnerUids: ['A'], receipt: normalizedS1Receipt('B'),
    }],
    ['S1 provenance differs', {
      historyOwnerUids: ['A'], receipt: normalizedS1Receipt('A', { provenanceKind: 'synthetic_reconcile' }),
    }],
    ['S1 requester differs', {
      historyOwnerUids: ['A'], receipt: normalizedS1Receipt('A', { requesterCanonicalUid: 'B' }),
    }],
    ['pre-S1 target differs', {
      historyOwnerUids: ['A'], receipt: legacyReceipt('B'),
    }],
    ['receipt target is unresolvable', {
      historyOwnerUids: ['A'], receipt: normalizedS1Receipt(null),
    }],
  ] as const)(
    'classifies incompatible receipt before unresolved original evidence: %s',
    (_label, overrides) => {
      expect(decidePremiumRestoreAuthority(base({
        eventType: 'INITIAL_PURCHASE',
        rawOriginalOwnerUid: 'raw-L',
        evidenceCanonicalOwnerUid: null,
        ...overrides,
      }))).toMatchObject({
        decision: 'receipt_evidence_conflict', targetOwnerUid: null,
        createOwner: false, applyLifecycle: false, paymentDuplicate: false,
      });
    },
  );

  it.each([
    ['no receipt', null],
    ['compatible pre-S1 receipt', legacyReceipt('A')],
    ['compatible normalized S1 receipt', normalizedS1Receipt('A')],
  ] as const)(
    'never turns unresolved original evidence into duplicate authority: %s',
    (_label, receipt) => {
      expect(decidePremiumRestoreAuthority(base({
        eventType: 'NON_RENEWING_PURCHASE',
        rawOriginalOwnerUid: 'raw-L',
        evidenceCanonicalOwnerUid: null,
        historyOwnerUids: ['A'],
        receipt,
      }))).toMatchObject({
        decision: 'lineage_owner_unproven', targetOwnerUid: null,
        createOwner: false, applyLifecycle: false, paymentDuplicate: false,
      });
    },
  );

  it('rejects a different immutable raw original even when canonical owner still matches', () => {
    expect(decidePremiumRestoreAuthority(base({
      eventType: 'INITIAL_PURCHASE', rawOriginalOwnerUid: 'raw-B', evidenceCanonicalOwnerUid: 'A', verifiedOwner: owner('A', 'raw-A'), historyOwnerUids: ['A'],
    }))).toMatchObject({ decision: 'evidence_identity_conflict', targetOwnerUid: null });
  });
});

describe('post-transaction tails are explicit capabilities', () => {
  it.each([
    ['conflict', { decision: 'lineage_owner_conflict', committed: false, projectionChanged: false, referralEligible: true, requesterDecision: 'owner' }],
    ['requester mismatch', { decision: 'verified_lifecycle', committed: true, projectionChanged: true, referralEligible: true, requesterDecision: 'not_requester' }],
    ['metadata upgrade', { decision: 'verify_matching_legacy_owner_duplicate', committed: true, projectionChanged: false, referralEligible: true, requesterDecision: 'owner' }],
  ] as const)('returns zero tails for %s even if an internal target exists', (_label, input) => {
    expect(decidePremiumRestoreTails({ ...input, targetOwnerUid: 'A' })).toEqual({ referralOwnerUid: null, profileOwnerUid: null });
  });

  it('allows only explicit committed owner tails', () => {
    expect(decidePremiumRestoreTails({
      decision: 'create_verified_owner', targetOwnerUid: 'A', committed: true, projectionChanged: true, referralEligible: true, requesterDecision: 'owner',
    })).toEqual({ referralOwnerUid: 'A', profileOwnerUid: 'A' });
  });
});
