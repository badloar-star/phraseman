export type PremiumReducerProvenanceKind = 'authenticated_webhook' | 'synthetic_reconcile';

export type PremiumRestoreAuthorityDecision =
  | 'lineage_owner_conflict'
  | 'owner_lineage_inconsistent'
  | 'evidence_identity_conflict'
  | 'receipt_evidence_conflict'
  | 'lineage_owner_unproven'
  | 'create_verified_owner'
  | 'verify_matching_legacy_owner'
  | 'verify_matching_legacy_owner_duplicate'
  | 'verified_owner_upgrade_unsafe'
  | 'verified_lifecycle'
  | 'single_legacy_continuation'
  | 'duplicate';

export type PremiumRestoreReceiptAuthority = Readonly<{
  kind: 'legacy' | 's1';
  fingerprintMatches: boolean;
  targetOwnerUid: string | null;
  provenanceKind?: PremiumReducerProvenanceKind;
  requesterCanonicalUid?: string | null;
  evidenceKind?: 'authenticated_original_purchase_webhook_v1' | 'none';
  rawOriginalOwnerUid?: string | null;
  evidenceCanonicalOwnerUid?: string | null;
}>;

export type PremiumRestoreAuthorityInput = Readonly<{
  eventType: string;
  provenanceKind: PremiumReducerProvenanceKind;
  requesterCanonicalUid: string | null;
  rawOriginalOwnerUid: string | null;
  evidenceCanonicalOwnerUid: string | null;
  verifiedOwner: Readonly<{
    originalOwnerUid: string;
    canonicalOwnerUidAtCreation: string;
    currentCanonicalOwnerUid: string;
  }> | null;
  historyOwnerUids: readonly string[];
  receipt: PremiumRestoreReceiptAuthority | null;
}>;

export type PremiumRestoreAuthorityResult = Readonly<{
  decision: PremiumRestoreAuthorityDecision;
  targetOwnerUid: string | null;
  createOwner: boolean;
  applyLifecycle: boolean;
  paymentDuplicate: boolean;
  requesterDecision: 'owner' | 'not_requester' | 'webhook';
}>;

export function normalizeRawOriginalOwnerUid(raw: unknown): string | null {
  const uid = typeof raw === 'string' ? raw.trim() : '';
  if (!uid || uid.length > 160 || uid.includes('/') || uid.startsWith('$RCAnonymousID:') || uid.startsWith('$RCA')) {
    return null;
  }
  return uid;
}

export function decidePremiumRestoreAuthority(
  input: PremiumRestoreAuthorityInput,
): PremiumRestoreAuthorityResult {
  const originalPurchase = input.eventType === 'INITIAL_PURCHASE'
    || input.eventType === 'NON_RENEWING_PURCHASE';
  const authenticatedOriginalPurchase = input.provenanceKind === 'authenticated_webhook'
    && originalPurchase;
  const evidenceBearing = authenticatedOriginalPurchase
    && input.rawOriginalOwnerUid !== null
    && input.evidenceCanonicalOwnerUid !== null;
  const rawOriginalOwnerUid = evidenceBearing ? input.rawOriginalOwnerUid : null;
  const evidenceCanonicalOwnerUid = evidenceBearing ? input.evidenceCanonicalOwnerUid : null;
  const verifiedOwnerUid = input.verifiedOwner?.currentCanonicalOwnerUid ?? null;
  const historyOwnerUids = [...new Set(input.historyOwnerUids.filter(Boolean))].sort();
  const requesterDecisionFor = (targetOwnerUid: string): 'owner' | 'not_requester' | 'webhook' => {
    if (input.provenanceKind === 'authenticated_webhook') return 'webhook';
    return input.requesterCanonicalUid === targetOwnerUid ? 'owner' : 'not_requester';
  };
  const denied = (decision: PremiumRestoreAuthorityDecision): PremiumRestoreAuthorityResult => ({
    decision,
    targetOwnerUid: null,
    createOwner: false,
    applyLifecycle: false,
    paymentDuplicate: false,
    requesterDecision: input.provenanceKind === 'authenticated_webhook' ? 'webhook' : 'not_requester',
  });
  const allowed = (
    decision: PremiumRestoreAuthorityDecision,
    targetOwnerUid: string,
    options: Readonly<{ createOwner?: boolean; applyLifecycle?: boolean; paymentDuplicate?: boolean }> = {},
  ): PremiumRestoreAuthorityResult => ({
    decision,
    targetOwnerUid,
    createOwner: options.createOwner === true,
    applyLifecycle: options.applyLifecycle === true,
    paymentDuplicate: options.paymentDuplicate === true,
    requesterDecision: requesterDecisionFor(targetOwnerUid),
  });

  if (historyOwnerUids.length >= 2) return denied('lineage_owner_conflict');
  if (verifiedOwnerUid && historyOwnerUids.some((uid) => uid !== verifiedOwnerUid)) {
    return denied('lineage_owner_conflict');
  }
  if (evidenceCanonicalOwnerUid && verifiedOwnerUid && evidenceCanonicalOwnerUid !== verifiedOwnerUid) {
    return denied('lineage_owner_conflict');
  }
  if (evidenceCanonicalOwnerUid && historyOwnerUids.some((uid) => uid !== evidenceCanonicalOwnerUid)) {
    return denied('lineage_owner_conflict');
  }
  if (
    evidenceBearing
    && input.verifiedOwner
    && rawOriginalOwnerUid !== input.verifiedOwner.originalOwnerUid
  ) {
    return denied('evidence_identity_conflict');
  }
  if (verifiedOwnerUid && historyOwnerUids.length === 0) {
    return denied('owner_lineage_inconsistent');
  }

  let validatedReceiptOwnerUid: string | null = null;
  if (input.receipt) {
    const receiptOwnerUid = input.receipt.targetOwnerUid;
    if (!input.receipt.fingerprintMatches || !receiptOwnerUid) {
      return denied('receipt_evidence_conflict');
    }
    if (
      (verifiedOwnerUid && verifiedOwnerUid !== receiptOwnerUid)
      || historyOwnerUids.some((uid) => uid !== receiptOwnerUid)
      || (evidenceCanonicalOwnerUid && evidenceCanonicalOwnerUid !== receiptOwnerUid)
      || (input.provenanceKind === 'synthetic_reconcile' && input.requesterCanonicalUid !== receiptOwnerUid)
    ) {
      return denied('receipt_evidence_conflict');
    }
    if (input.receipt.kind === 's1') {
      const expectedEvidenceKind = evidenceBearing
        ? 'authenticated_original_purchase_webhook_v1'
        : 'none';
      if (
        input.receipt.provenanceKind !== input.provenanceKind
        || (input.receipt.requesterCanonicalUid ?? null) !== input.requesterCanonicalUid
        || input.receipt.evidenceKind !== expectedEvidenceKind
        || (input.receipt.rawOriginalOwnerUid ?? null) !== rawOriginalOwnerUid
        || (input.receipt.evidenceCanonicalOwnerUid ?? null) !== evidenceCanonicalOwnerUid
      ) {
        return denied('receipt_evidence_conflict');
      }
    }
    validatedReceiptOwnerUid = receiptOwnerUid;
  }

  if (authenticatedOriginalPurchase && !evidenceBearing) {
    return denied('lineage_owner_unproven');
  }

  if (validatedReceiptOwnerUid) {
    const receiptOwnerUid = validatedReceiptOwnerUid;
    if (!verifiedOwnerUid && historyOwnerUids.length === 0 && evidenceCanonicalOwnerUid === receiptOwnerUid) {
      return denied('verified_owner_upgrade_unsafe');
    }
    if (!verifiedOwnerUid && historyOwnerUids[0] === receiptOwnerUid && evidenceCanonicalOwnerUid === receiptOwnerUid) {
      return allowed('verify_matching_legacy_owner_duplicate', receiptOwnerUid, {
        createOwner: true,
        paymentDuplicate: true,
      });
    }
    if (verifiedOwnerUid === receiptOwnerUid || historyOwnerUids[0] === receiptOwnerUid) {
      return allowed('duplicate', receiptOwnerUid, { paymentDuplicate: true });
    }
    return denied('receipt_evidence_conflict');
  }

  if (verifiedOwnerUid) {
    return allowed('verified_lifecycle', verifiedOwnerUid, { applyLifecycle: true });
  }
  const legacyOwnerUid = historyOwnerUids[0] ?? null;
  if (legacyOwnerUid && evidenceCanonicalOwnerUid === legacyOwnerUid) {
    return allowed('verify_matching_legacy_owner', legacyOwnerUid, {
      createOwner: true,
      applyLifecycle: true,
    });
  }
  if (legacyOwnerUid) {
    return allowed('single_legacy_continuation', legacyOwnerUid, { applyLifecycle: true });
  }
  if (evidenceCanonicalOwnerUid) {
    return allowed('create_verified_owner', evidenceCanonicalOwnerUid, {
      createOwner: true,
      applyLifecycle: true,
    });
  }
  return denied('lineage_owner_unproven');
}

export function decidePremiumRestoreTails(input: Readonly<{
  decision: PremiumRestoreAuthorityDecision;
  targetOwnerUid: string | null;
  committed: boolean;
  projectionChanged: boolean;
  referralEligible: boolean;
  requesterDecision: 'owner' | 'not_requester' | 'webhook';
}>): Readonly<{ referralOwnerUid: string | null; profileOwnerUid: string | null }> {
  const authorizingDecisions = new Set<PremiumRestoreAuthorityDecision>([
    'create_verified_owner',
    'verify_matching_legacy_owner',
    'verified_lifecycle',
    'single_legacy_continuation',
    'duplicate',
  ]);
  const requesterAuthorized = input.requesterDecision === 'owner'
    || input.requesterDecision === 'webhook';
  if (
    !input.targetOwnerUid
    || !input.committed
    || !requesterAuthorized
    || !authorizingDecisions.has(input.decision)
  ) {
    return { referralOwnerUid: null, profileOwnerUid: null };
  }
  return {
    referralOwnerUid: input.referralEligible ? input.targetOwnerUid : null,
    profileOwnerUid: input.projectionChanged && input.decision !== 'duplicate'
      ? input.targetOwnerUid
      : null,
  };
}
